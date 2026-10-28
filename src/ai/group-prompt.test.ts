import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Relationship, User } from '@/types';

import { layoutPrompt } from './prompt-layout';
import { buildGroupPrompt, groupParts } from './rules';

const base = { handle: '@x', bio: 'Bio.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hi.', tags: ['kind'] };
const kai = { ...base, id: 'c_kai', name: 'Kai Arden', series: 'Seaside Academy' } as Character;
const theo = { ...base, id: 'c_theo', name: 'Theo Lancaster', series: 'Seaside Academy' } as Character;
const seren = { ...base, id: 'c_seren', name: 'Seren', series: 'NEON TIDE' } as Character;
const user = { displayName: 'Mo', locale: 'en' } as User;

describe('buildGroupPrompt', () => {
  const prompt = buildGroupPrompt(kai, [theo, seren], user, undefined, 'ru');

  it('keeps the persona prompt and its reply language', () => {
    assert.match(prompt, /Name: Kai Arden/);
    assert.match(prompt, /REPLY LANGUAGE: ru/);
  });

  it('names everyone else in the chat', () => {
    assert.match(prompt, /group chat with Mo and:/);
    assert.match(prompt, /Theo Lancaster \(from Seaside Academy\): you already know each other/);
    assert.match(prompt, /Seren \(from NEON TIDE\): you met in this chat/);
  });

  it('keeps one-to-one chats private and each voice its own', () => {
    assert.match(prompt, /never bring up your one-to-one chat/);
    assert.match(prompt, /Never write lines for the others/);
  });

  it('keeps the group block with the chat’s settings, before what changes every reply', () => {
    const layout = layoutPrompt(groupParts(kai, [theo, seren], user, { level: 4, levelTitle: 'Friend' } as Relationship, 'ru'));
    const chat = layout.system.at(-1);
    assert.equal(chat?.tier, 'chat');
    assert.match(chat?.text ?? '', /MODE: GROUP CHAT/);
    assert.match(layout.turn, /^YOUR BOND:/);
  });
});
