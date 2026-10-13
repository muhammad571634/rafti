/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MemoryItem } from '@/types';

import { diaryMemoryLine, rememberableText, withMemory, withoutCrisisMemories } from './memory-guard';
import { detectCrisis } from './safety';

const CRISIS = [
  'I want to die.',
  'Sometimes I think about suicide.',
  'I just want to end it all',
  'I want to kill myself tonight',
  'There is no reason to live anymore.',
  'I don’t want to wake up tomorrow.',
  'everyone would be better off without me',
];

// Sad, angry or tired is not a crisis: these must still be remembered.
const ORDINARY = [
  'I feel so sad today.',
  'Worst day ever, I hate my job.',
  'I am tired of my roommate.',
  'Cried during the movie again.',
  'My exam killed me today, lol.',
  'Lonely tonight, but okay.',
];

const memory = (id: string, text: string, pinned = false): MemoryItem => ({
  id,
  characterId: 'c_theo',
  text,
  source: 'chat',
  createdAt: '2026-10-12T10:00:00.000Z',
  pinned,
});

const input = (text: string) => ({
  id: 'mem_new',
  characterId: 'c_theo',
  text,
  source: 'manual' as const,
  createdAt: '2026-10-13T10:00:00.000Z',
});

describe('detectCrisis', () => {
  it('catches the crisis phrases, including curly apostrophes from phone keyboards', () => {
    for (const text of CRISIS) assert.equal(detectCrisis(text), true, text);
  });

  it('does not flag ordinary sadness', () => {
    for (const text of ORDINARY) assert.equal(detectCrisis(text), false, text);
  });
});

describe('diary to memory', () => {
  it('keeps the first sentence of an ordinary page', () => {
    assert.equal(diaryMemoryLine('Walked home in the rain. It was nice.'), 'Walked home in the rain.');
    for (const text of ORDINARY) assert.equal(diaryMemoryLine(text), text);
  });

  it('leaves nothing for a crisis page, even when the crisis line is not the first', () => {
    for (const text of CRISIS) assert.equal(diaryMemoryLine(text), null, text);
    assert.equal(diaryMemoryLine('Long day at work. Honestly I want to die.'), null);
  });

  it('caps the line at 120 characters', () => {
    const line = diaryMemoryLine('a'.repeat(300));
    assert.equal(line?.length, 120);
  });
});

describe('addMemory guard (withMemory is the reducer addMemory uses)', () => {
  const existing = [memory('mem_1', 'Drinks peach tea.', true), memory('mem_2', 'Hates mornings.')];

  it('adds an ordinary memory in front, unpinned and trimmed', () => {
    const next = withMemory(existing, input('  Exam on Friday.  '));
    assert.equal(next.length, 3);
    assert.deepEqual(next[0], { ...input('Exam on Friday.'), pinned: false });
    assert.deepEqual(next.slice(1), existing);
  });

  it('refuses crisis text from any source and leaves the list untouched', () => {
    for (const text of CRISIS) {
      for (const source of ['manual', 'chat', 'diary', 'call'] as const) {
        assert.equal(withMemory(existing, { ...input(text), source }), existing, `${source}: ${text}`);
      }
    }
  });

  it('refuses empty text', () => {
    assert.equal(withMemory(existing, input('   ')), existing);
    assert.equal(rememberableText(''), null);
  });
});

describe('saved memories on load', () => {
  it('drops crisis memories and keeps the rest, pins included', () => {
    const saved = [memory('mem_1', 'Drinks peach tea.', true), memory('mem_2', 'I want to die.', true), memory('mem_3', 'Hates mornings.')];
    assert.deepEqual(withoutCrisisMemories(saved).map((m) => [m.id, m.pinned]), [
      ['mem_1', true],
      ['mem_3', false],
    ]);
  });
});
