import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ChatBranch, Message } from '@/types';

import { addBranch, BRANCHES_PER_CHAT, branchesOf, branchNotes, branchRecord, cutAfter, swapIn, worthBranching } from './branches.ts';

const line = (id: string, author: 'me' | 'them', text: string, extra: Partial<Message> = {}): Message => ({ id, conversationId: 'conv', author, kind: 'text', text, createdAt: '2026-11-19T10:00:00Z', ...extra });
const chat = [line('a', 'them', 'hey'), line('b', 'me', 'hi'), line('c', 'them', 'kiss me?'), line('d', 'me', 'yes'), line('e', 'them', '*leans in*')];
const NOW = new Date('2026-11-19T12:00:00Z');

describe('branches', () => {
  it('cuts the chat at a message', () => {
    const cut = cutAfter(chat, 'c');
    assert.deepEqual(cut?.kept.map((m) => m.id), ['a', 'b', 'c']);
    assert.deepEqual(cut?.tail.map((m) => m.id), ['d', 'e']);
    assert.equal(cutAfter(chat, 'zzz'), null);
  });

  it('keeps a branch only for real lines', () => {
    assert.equal(worthBranching([line('x', 'them', '', { kind: 'system', card: 'setup' })]), false);
    assert.equal(worthBranching([]), false);
    assert.equal(worthBranching(chat.slice(3)), true);
  });

  it('records the first line, who wrote it and how many lines', () => {
    const tail = [line('s', 'them', '', { kind: 'system', card: 'setup' }), line('d', 'me', '  yes,\n  please  '), line('e', 'them', 'ok')];
    assert.deepEqual(branchRecord('br1', 'conv', 'c', tail, NOW), { id: 'br1', conversationId: 'conv', atMessageId: 'c', createdAt: NOW.toISOString(), count: 2, preview: 'yes, please', from: 'me' });
    // A voice line shows its words; a long line is cut.
    const voice = branchRecord('br2', 'conv', 'c', [line('v', 'them', '', { kind: 'voice', transcript: 'x'.repeat(200) })], NOW);
    assert.equal(voice.preview.length, 80);
  });

  it('keeps the newest per chat and hands back the oldest to clean up', () => {
    let all: ChatBranch[] = [{ ...branchRecord('other', 'conv2', 'q', chat, NOW) }];
    const dropped: string[] = [];
    for (let i = 0; i < BRANCHES_PER_CHAT + 2; i += 1) {
      const added = addBranch(all, branchRecord(`br${i}`, 'conv', 'c', chat, new Date(NOW.getTime() + i * 1000)));
      all = added.branches;
      dropped.push(...added.dropped.map((b) => b.id));
    }
    assert.equal(all.filter((b) => b.conversationId === 'conv').length, BRANCHES_PER_CHAT);
    assert.deepEqual(dropped, ['br0', 'br1']);
    assert.ok(all.some((b) => b.id === 'other'));
  });

  it("lists a chat's branches newest first, faded when their point is gone", () => {
    const all = [branchRecord('old', 'conv', 'c', chat, NOW), branchRecord('new', 'conv', 'gone', chat, new Date(NOW.getTime() + 1000))];
    assert.deepEqual(
      branchesOf(all, 'conv', chat).map((b) => [b.id, b.open]),
      [
        ['new', false],
        ['old', true],
      ],
    );
  });

  it('swaps a branch in and gives back where the chat was', () => {
    const tail = [line('x', 'me', 'no'), line('y', 'them', 'oh. ok')];
    const swapped = swapIn(chat, 'c', tail);
    assert.deepEqual(swapped?.messages.map((m) => m.id), ['a', 'b', 'c', 'x', 'y']);
    assert.deepEqual(swapped?.current.map((m) => m.id), ['d', 'e']);
    assert.equal(swapIn(chat, 'gone', tail), null);
  });

  it('finds the voice notes a branch holds', () => {
    assert.deepEqual(branchNotes([line('v', 'me', '', { kind: 'voice', audioFile: 'c--1.m4a' }), line('t', 'them', 'hi')]), ['c--1.m4a']);
  });
});
