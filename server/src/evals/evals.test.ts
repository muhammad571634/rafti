import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { characters } from '../../../src/mock/characters.ts';
import type { LlmProvider } from '../llm/types.ts';
import { answer, messagesOf } from './answer.ts';
import { failedChecks, languageOf } from './checks.ts';
import { judgeLayout, parseVerdict } from './judge.ts';
import { SCENARIOS } from './scenarios.ts';

/** One answer every parser can read: each takes its own key. */
const ANY = JSON.stringify({
  emotion: 'happy',
  messages: ['Okay, that made me laugh out loud today.'],
  skip: false,
  text: 'A quiet page about a quiet day.',
  line: 'Fine, but I pick the snacks.',
  answer: 1,
  rounds: [{ line: 'One.' }, { line: 'Two.' }, { line: 'Three.' }],
  summary: 'They talked about Biscuit.',
  ops: [{ op: 'add', text: 'Has a beagle', about: 'you', importance: 0.9, confidence: 0.9 }],
});

describe('the eval set (backend-plan §12.11)', () => {
  it('has 40 to 90 scenarios with unique ids, real cast members and a rubric each', () => {
    // backend-plan §12.11 asked for 40-60; the crisis check (B1.6) and the memory pass (B2) added more.
    assert.ok(SCENARIOS.length >= 40 && SCENARIOS.length <= 90, String(SCENARIOS.length));
    assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, SCENARIOS.length);
    const cast = new Set(characters.map((c) => c.id));
    for (const s of SCENARIOS) {
      const ids = [s.character, ...(s.mode === 'stream' ? [s.other] : []), ...(s.mode === 'group' ? s.others : [])];
      for (const id of ids) assert.ok(cast.has(id), `${s.id}: ${id}`);
      assert.ok(s.rubric.length > 20, s.id);
    }
    for (const group of ['memory', 'persona', 'safety', 'style', 'language', 'repetition', 'mode']) assert.ok(SCENARIOS.some((s) => s.group === group), group);
    // The four worlds each have a persona scenario of their own.
    const worlds = new Set(SCENARIOS.filter((s) => s.group === 'persona').map((s) => characters.find((c) => c.id === s.character)?.series));
    assert.equal(worlds.size, 4);
  });

  it('lays out every scenario through its own builder and reads the answer back', async () => {
    const seen: string[] = [];
    const fake: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        seen.push([...layout.system.map((b) => b.text), layout.turn].join('\n'));
        return { text: ANY, model: 'fake', usage: {} };
      },
    };
    for (const s of SCENARIOS) {
      const got = await answer(fake, s, 1000);
      assert.ok(got.lines.length, s.id);
      if (s.mode !== 'memoryPass') assert.match(got.promptVersion, /\.m[0-9a-f]{8}$/, s.id);
      assert.ok(seen.at(-1)?.includes(s.mode === 'memoryPass' ? 'NEW SINCE LAST TIME:' : 'MODE: '), s.id);
    }
  });

  it('checks what a reply must and must not do', () => {
    const chat = messagesOf([
      ['me', 'long day'],
      ['them', 'Long days are the worst. Come sit with me and tell me everything.'],
    ]);
    assert.deepEqual(failedChecks(['Biscuit stole them, I bet.'], [{ kind: 'includes', any: ['biscuit'] }]), []);
    assert.deepEqual(failedChecks(['Hmm.'], [{ kind: 'includes', any: ['Biscuit'] }]), ['includes(Biscuit)']);
    assert.deepEqual(failedChecks(['As an AI I cannot.'], [{ kind: 'excludes', any: ['as an ai'] }]), ['excludes(as an ai)']);
    // Whole words only: the feminine "устала" is not the masculine "устал".
    assert.deepEqual(failedChecks(['Ты сегодня устала?'], [{ kind: 'noWord', any: ['устал'] }]), []);
    assert.deepEqual(failedChecks(['Ты Устал, да?'], [{ kind: 'noWord', any: ['устал'] }]), ['noWord(устал)']);
    assert.deepEqual(failedChecks(['*smiles* hi 😊'], [{ kind: 'noEmoji' }, { kind: 'noNarration' }, { kind: 'narration' }]), ['noEmoji', 'noNarration']);
    assert.deepEqual(failedChecks(['*I take your hand.\n\nThe forest hums around us.* Come.'], [{ kind: 'narration' }]), []);
    assert.deepEqual(failedChecks(['one two three'], [{ kind: 'words', max: 2 }, { kind: 'lines', min: 2 }]), ['words 0-2 (got 3)', 'lines 2-∞ (got 1)']);
    assert.deepEqual(failedChecks(['Sleep now.'], [{ kind: 'noQuestion' }]), []);
    assert.deepEqual(failedChecks(['Привет! Как ты?'], [{ kind: 'language', is: 'ru' }]), []);
    assert.deepEqual(failedChecks(['Hola, hoy dibujo un gato en la playa.'], [{ kind: 'language', is: 'es' }]), []);
    assert.deepEqual(failedChecks(['Hi, what is it you are doing today?'], [{ kind: 'language', is: 'es' }]), ['language es (got en)']);
    assert.equal(languageOf('Salut ! Je suis très fatiguée aujourd’hui, et toi ?'), 'fr');
    assert.equal(languageOf('Oi! Você está bem? Eu tô muito cansada hoje.'), 'pt');
    assert.equal(languageOf('こんにちは！今日は何をしているの？'), 'ja');
    assert.equal(languageOf('ok 😂'), undefined);
    assert.equal(languageOf("*sonríe* Dibujo un ranúnculo, significa 'estás deslumbrante'."), 'es');
    assert.equal(languageOf('¡Sam! ¿Cómo fue todo hoy? No pude dejar de pensar en tu entrevista.'), 'es');
    assert.deepEqual(failedChecks(['Hehe, nothing.'], [{ kind: 'opensNot', any: ['Hehe'] }]), ['opensNot(hehe)']);
    assert.match(failedChecks(['Long days are the worst. Come sit with me and tell me everything!'], [{ kind: 'noRepeat' }], { chat })[0], /^noRepeat \(1\.00/);
    assert.equal(failedChecks(['Fine, but this one is new.'], [{ kind: 'noRepeat' }], { redo: ['Fine, but this one is new!'] }).length, 1);
    assert.deepEqual(failedChecks([], []), ['answered']);
    assert.deepEqual(failedChecks(['I am here.'], [{ kind: 'crisis', is: true }], { crisis: true }), []);
    assert.deepEqual(failedChecks(['Ha.'], [{ kind: 'crisis', is: true }]), ['crisis true (got false)']);
  });

  it('gives the judge the rubric, what they knew and the answer, and reads its scores', () => {
    const s = SCENARIOS.find((x) => x.id === 'memory-pinned-pet')!;
    const layout = judgeLayout(s, messagesOf(s.chat), ['Biscuit strikes again!']);
    assert.match(layout.system[0].text, /First write down the answer’s flaws/);
    assert.match(layout.turn, /Pinned memory: Their dog is called Biscuit/);
    assert.match(layout.turn, /THE ANSWER \(one chat bubble or line per row\):\nBiscuit strikes again!/);
    assert.ok(layout.turn.endsWith(`RUBRIC: ${s.rubric}`));
    assert.deepEqual(parseVerdict('```json\n{"flaws":" A bit long. ","task":4,"voice":7}\n```'), { task: 4, voice: 5, flaws: 'A bit long.' });
    assert.equal(parseVerdict('{"task":"high"}'), null);
  });
});
