import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { groupJoinLines } from '../mock/group';
import { worldNewsLine } from '../mock/world-voice';
import { fill, setVoiceSource, voice } from './voice';

describe('voice and fill', () => {
  test('an event line follows the gender of the friend who texts it', () => {
    const news = { key: 'world:event', note: 'Bonfire', line: '{g:Заняла|Занял} тебе место.' };
    assert.equal(worldNewsLine(news, 'female'), 'Заняла тебе место.');
    assert.equal(worldNewsLine(news, 'male'), 'Занял тебе место.');
  });

  test('voice defaults to english when no source is set', () => {
    const en = { hello: 'Hello' };
    assert.deepEqual(voice('test', en), en);
  });

  test('setVoiceSource provides translated mock pools', () => {
    const en = { hello: 'Hello' };
    setVoiceSource((section, def) => (section === 'test' ? { hello: 'Hola' } : def));
    assert.deepEqual(voice('test', en), { hello: 'Hola' });
    assert.deepEqual(voice('other', en), en);
    // Reset to default
    setVoiceSource((_s, d) => d);
  });

  test('fill replaces known placeholders and leaves unknown placeholders alone', () => {
    const template = 'Hello, {name}! Today is {day}. Status: {status}.';
    const result = fill(template, { name: 'Alex', day: 'Monday' });
    assert.equal(result, 'Hello, Alex! Today is Monday. Status: {status}.');
  });

  test('fill picks female or male form for {g:female|male} based on gender', () => {
    const template = 'I am {g:happy_f|happy_m} to see you.';
    assert.equal(fill(template, {}, 'female'), 'I am happy_f to see you.');
    assert.equal(fill(template, {}, 'male'), 'I am happy_m to see you.');
    assert.equal(fill(template, {}, undefined), 'I am happy_f to see you.');
  });

  test('fill handles two {g:female|male} in one line', () => {
    const template = '{g:Dear_f|Dear_m} friend, I am {g:ready_f|ready_m}.';
    assert.equal(fill(template, {}, 'female'), 'Dear_f friend, I am ready_f.');
    assert.equal(fill(template, {}, 'male'), 'Dear_m friend, I am ready_m.');
    assert.equal(fill(template, {}, undefined), 'Dear_f friend, I am ready_f.');
  });

  test('a pool a character says follows that character', () => {
    setVoiceSource((section, def) => (section === 'group' ? ({ ...def, joinLines: ['Je suis {g:prête|prêt}.'] } as typeof def) : def));
    assert.deepEqual(groupJoinLines('male'), ['Je suis prêt.']);
    assert.deepEqual(groupJoinLines('female'), ['Je suis prête.']);
    setVoiceSource((_s, d) => d);
  });

  test('fill leaves {{char}} and {{user}} untouched when not in values', () => {
    const template = '{{char}}: Hello {{user}}, welcome to {place}!';
    const result = fill(template, { place: 'Paris' });
    assert.equal(result, '{{char}}: Hello {{user}}, welcome to Paris!');
  });
});
