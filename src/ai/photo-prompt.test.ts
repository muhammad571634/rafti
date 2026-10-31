import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Message, User } from '@/types';

import { layoutChatPrompt } from './chat-prompt';
import { layoutGroupReply } from './group-reply';
import { cleanImages, cleanPhotoNotes, PHOTO_CHARS_MAX, PHOTOS_MAX, seeingLines, unseenPhotos } from './photo-prompt';
import { parseModelReply } from './reply-style';
import { messageText } from '../lib/story-continuity';

const line = (id: string, author: Message['author'], extra: Partial<Message> = {}): Message => ({
  id,
  conversationId: 'c',
  author,
  kind: 'text',
  text: id,
  createdAt: '2026-10-31T10:00:00.000Z',
  ...extra,
});
const photo = (id: string, extra: Partial<Message> = {}) => line(id, 'me', { kind: 'image', text: undefined, imageUri: `file:///${id}.jpg`, ...extra });
const jpeg = { mimeType: 'image/jpeg' as const, data: '/9j/4AAQSkZJRg==' };

describe('unseenPhotos', () => {
  it('takes the photos since they last spoke, oldest first', () => {
    const chat = [photo('old'), line('hi', 'them'), photo('a'), line('look', 'me'), photo('b')];
    assert.deepEqual(unseenPhotos(chat).map((p) => p.id), ['a', 'b']);
  });

  it('skips one already seen, a Photo Booth picture and app-only rows', () => {
    const chat = [photo('seen', { photoNote: 'A dog.' }), line('booth', 'me', { kind: 'image', text: undefined, photoId: 'p1' }), photo('new'), line('card', 'them', { kind: 'system', text: undefined })];
    assert.deepEqual(unseenPhotos(chat).map((p) => p.id), ['new']);
  });

  it('keeps only the newest when there are too many', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const seen = unseenPhotos(ids.map((id) => photo(id))).map((p) => p.id);
    assert.equal(seen.length, PHOTOS_MAX);
    assert.deepEqual(seen, ids.slice(-PHOTOS_MAX));
  });

  it('finds nothing once they have answered', () => {
    assert.deepEqual(unseenPhotos([photo('a'), line('nice', 'them')]), []);
  });
});

describe('cleanImages', () => {
  it('takes real JPEGs and drops anything else the body carried', () => {
    assert.deepEqual(cleanImages([{ ...jpeg, extra: 1 }]), [jpeg]);
  });

  it('treats none and an empty list as no picture', () => {
    assert.equal(cleanImages(undefined), undefined);
    assert.equal(cleanImages([]), undefined);
  });

  it('refuses a list that is not pictures, too many, too big or another file', () => {
    for (const bad of [
      'x',
      [{}],
      Array(PHOTOS_MAX + 1).fill(jpeg),
      [{ ...jpeg, data: `/9j/${'A'.repeat(PHOTO_CHARS_MAX)}` }],
      [{ ...jpeg, mimeType: 'image/png' }],
      [{ ...jpeg, data: 'iVBORw0KGgo=' }],
      [{ ...jpeg, data: '/9j/<script>' }],
    ]) {
      assert.equal(cleanImages(bad), null);
    }
  });
});

describe('the line that remembers a photo', () => {
  it('is read from the answer, one line, cut to size, in order', () => {
    assert.deepEqual(parseModelReply('{"messages":["Cute!"],"photos":[" A beagle\\non a sofa. ",5]}').photos, ['A beagle on a sofa.', '']);
    assert.equal(cleanPhotoNotes(['x'.repeat(500)])?.[0].length, 200);
  });

  it('is left out when the answer has none', () => {
    assert.equal(parseModelReply('{"messages":["Cute!"]}').photos, undefined);
    assert.equal(cleanPhotoNotes(['', 3]), undefined);
    assert.equal(cleanPhotoNotes('a dog'), undefined);
  });

  it('is what later replies read', () => {
    assert.equal(messageText(photo('a', { photoNote: 'A beagle on a sofa.' })), '[Image message: A beagle on a sofa.]');
    assert.equal(messageText(photo('a')), '[Image message]');
  });

  it('an answer with no words is no reply, so a refused picture can be asked again', () => {
    assert.deepEqual(parseModelReply('').bubbles, []);
    assert.deepEqual(parseModelReply('  \n ').bubbles, []);
  });
});

describe('the prompt with a photo', () => {
  const character = { id: 'c_kai', name: 'Kai', bio: 'Swimmer.', tags: [] } as unknown as Character;
  const user = { id: 'u1', displayName: 'Sam', locale: 'en' } as User;

  it('carries the pictures and says what to do with them, after the cached prefix', () => {
    const layout = layoutChatPrompt({ character, user, messages: [photo('a')], images: [jpeg] });
    assert.deepEqual(layout.images, [jpeg]);
    assert.match(layout.turn, /you can really see it/);
    assert.match(layout.turn, /"photos"/);
    assert.doesNotMatch(layout.system.map((block) => block.text).join('\n'), /you can really see/);
  });

  it('names how many there are', () => {
    assert.match(seeingLines(2)[0], /2 photos/);
  });

  it('asks nothing about a photo when none is attached', () => {
    const layout = layoutChatPrompt({ character, user, messages: [line('hi', 'me')] });
    assert.equal(layout.images, undefined);
    assert.doesNotMatch(layout.turn, /"photos"/);
  });

  it('works the same in a group', () => {
    const other = { ...character, id: 'c_b', name: 'Bo' };
    const layout = layoutGroupReply({ character, others: [other], user, messages: [photo('a')], images: [jpeg] });
    assert.deepEqual(layout.images, [jpeg]);
    assert.match(layout.turn, /you can really see it/);
  });
});
