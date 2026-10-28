import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from '../config.ts';
import { geminiProvider } from '../llm/gemini.ts';
import { chainProviders, openAiCompatProvider } from '../llm/openai-compat.ts';
import { LlmBusyError, type LlmProvider } from '../llm/types.ts';
import { answer, type EvalAnswer } from './answer.ts';
import { failedChecks } from './checks.ts';
import { judgeLayout, parseVerdict, type Verdict } from './judge.ts';
import { SCENARIOS, type EvalScenario } from './scenarios.ts';

/**
 * Runs the eval set against the real model (backend-plan §12.11):
 *
 *   npm run eval                      every scenario, checks + judge, compared with baseline.json
 *   npm run eval -- --only a,b        some scenarios (or --group safety)
 *   npm run eval -- --no-judge        machine checks only
 *   npm run eval -- --save            make this run the new baseline (commit it with the change)
 *
 * The model is the server's own (`CHAT_MODELS`, the OpenAI-compatible one first when set); the
 * judge is `JUDGE_MODELS` (comma-separated, tried in order) at a low temperature, never the writer
 * itself: a busy judge leaves the score out rather than let the writer grade itself. Every answer and
 * verdict goes to server/eval-results/ (git-ignored); baseline.json keeps only the scores. The run
 * fails when a check that passed in the baseline fails now.
 */

const BASELINE = fileURLToPath(new URL('./baseline.json', import.meta.url));
const RESULTS = fileURLToPath(new URL('../../eval-results/', import.meta.url));
const TIMEOUT_MS = 30_000;

interface Result {
  id: string;
  group: string;
  mode: string;
  lines: string[];
  failed: string[];
  verdict?: Verdict;
  /** The judge model that scored it. */
  judgedBy?: string;
  model?: string;
  promptVersion?: string;
  ms?: number;
  calls?: number;
  repeat?: number;
  error?: string;
}

interface Baseline {
  date: string;
  models: string[];
  results: Record<string, { failed: string[]; task?: number; voice?: number; promptVersion?: string }>;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

/** Busy (the free tier's per-minute cap): wait and try again, a few times. */
async function patiently<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!(error instanceof LlmBusyError) || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20_000 * attempt));
    }
  }
}

/** Runs `work` over `items`, `limit` at a time, keeping their order. */
async function pool<T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await work(items[i]);
    }
  });
  await Promise.all(lanes);
  return out;
}

async function runOne(s: EvalScenario, writer: LlmProvider, judge: LlmProvider | null): Promise<Result> {
  let got: EvalAnswer;
  try {
    got = await patiently(() => answer(writer, s, TIMEOUT_MS));
  } catch (error) {
    return { id: s.id, group: s.group, mode: s.mode, lines: [], failed: ['answered'], error: String((error as Error).message).slice(0, 200) };
  }
  const failed = failedChecks(got.lines, s.expect, { chat: got.chat, redo: s.setup?.redo });
  let verdict: Verdict | undefined;
  let judgedBy: string | undefined;
  if (judge) {
    try {
      const raw = await patiently(() => judge.complete(judgeLayout(s, got.chat, got.lines), { timeoutMs: TIMEOUT_MS }));
      verdict = parseVerdict(raw.text) ?? undefined;
      judgedBy = raw.model;
    } catch (error) {
      console.warn(`[judge] ${s.id}: ${String((error as Error).message).slice(0, 120)}`);
    }
  }
  const mark = failed.length ? '✗' : '✓';
  const scores = verdict ? ` ${verdict.task}/${verdict.voice}` : '';
  console.log(`${mark} ${s.id}${scores}${got.repeat ? ` (repeat ${got.repeat.toFixed(2)}, ${got.calls} calls)` : ''}${failed.length ? `  ${failed.join(', ')}` : ''}`);
  return { id: s.id, group: s.group, mode: s.mode, lines: got.lines, failed, verdict, judgedBy, model: got.model, promptVersion: got.promptVersion, ms: got.ms, calls: got.calls, repeat: got.repeat };
}

const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : '–');

function summary(results: Result[]) {
  const groups = [...new Set(results.map((r) => r.group)), 'all'];
  console.log(`\n${'group'.padEnd(12)}${'checks'.padEnd(10)}${'task'.padEnd(7)}voice`);
  for (const group of groups) {
    const rs = group === 'all' ? results : results.filter((r) => r.group === group);
    const passed = rs.filter((r) => !r.failed.length).length;
    const task = avg(rs.flatMap((r) => (r.verdict ? [r.verdict.task] : [])));
    const voice = avg(rs.flatMap((r) => (r.verdict ? [r.verdict.voice] : [])));
    console.log(`${group.padEnd(12)}${`${passed}/${rs.length}`.padEnd(10)}${task.padEnd(7)}${voice}`);
  }
  const low = results.filter((r) => r.verdict && Math.min(r.verdict.task, r.verdict.voice) <= 2);
  for (const r of [...results.filter((r) => r.failed.length), ...low]) {
    console.log(`\n${r.id}: ${r.failed.join(', ') || `judge ${r.verdict?.task}/${r.verdict?.voice}`}${r.verdict?.flaws ? ` (${r.verdict.flaws})` : ''}${r.error ? ` [${r.error}]` : ''}`);
    for (const line of r.lines) console.log(`  > ${line.replace(/\n/g, ' ').slice(0, 220)}`);
  }
}

/** What got worse (and better) since the baseline; true when a check that passed fails now. */
function compare(results: Result[], baseline: Baseline): boolean {
  console.log(`\nAgainst the baseline of ${baseline.date} (${baseline.models.join(', ')}):`);
  let regressed = false;
  for (const r of results) {
    const before = baseline.results[r.id];
    if (!before) continue;
    const broke = r.failed.filter((f) => !before.failed.some((b) => b.split(' ')[0] === f.split(' ')[0]));
    const fixed = before.failed.filter((b) => !r.failed.some((f) => f.split(' ')[0] === b.split(' ')[0]));
    const drops = r.verdict && before.task && before.voice ? [['task', r.verdict.task - before.task], ['voice', r.verdict.voice - before.voice]].filter(([, d]) => (d as number) <= -2) : [];
    if (broke.length) regressed = true;
    const notes = [...broke.map((f) => `now fails ${f}`), ...fixed.map((f) => `fixed ${f}`), ...drops.map(([k, d]) => `${k} ${d}`)];
    if (notes.length) console.log(`  ${r.id}: ${notes.join('; ')}${r.promptVersion !== before.promptVersion ? ' (prompt changed)' : ''}`);
  }
  console.log(regressed ? 'Regressions: a check that passed before fails now.' : 'No check that passed before fails now.');
  return regressed;
}

async function main() {
  if (!config.geminiKey && !config.openai.apiKey) {
    console.error('No model key: set GEMINI_API_KEY (or the OPENAI_* settings) for this process.');
    process.exit(2);
  }
  const writers: LlmProvider[] = [];
  if (config.openai.apiKey && config.openai.baseUrl && config.openai.model) writers.push(openAiCompatProvider(config.openai));
  if (config.geminiKey) writers.push(geminiProvider(config.geminiKey, config.chatModels));
  const writer = chainProviders(writers)!;
  const judgeModels = (process.env.JUDGE_MODELS ?? 'gemini-3.5-flash,gemini-3-flash-preview,gemini-2.5-flash').split(',').map((m) => m.trim()).filter(Boolean);
  const judgeModel = judgeModels.join(' > ');
  const judge = flag('no-judge') || !config.geminiKey ? null : geminiProvider(config.geminiKey, judgeModels, { temperature: 0.2 });

  const only = value('only')?.split(',');
  const group = value('group');
  const chosen = SCENARIOS.filter((s) => (!only || only.includes(s.id)) && (!group || s.group === group));
  if (!chosen.length) {
    console.error('No scenario matches.');
    process.exit(2);
  }
  console.log(`${chosen.length} scenarios · writer ${writer.name} · judge ${judge ? judgeModel : 'off'}\n`);

  const results = await pool(chosen, Number(value('concurrency') ?? 2), (s) => runOne(s, writer, judge));
  summary(results);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(`${RESULTS}${stamp}.json`, JSON.stringify({ writer: writer.name, judge: judge ? judgeModel : null, results }, null, 2));
  console.log(`\nEvery answer: server/eval-results/${stamp}.json`);

  const models = [...new Set(results.map((r) => r.model).filter((m): m is string => !!m))];
  const baseline: Baseline | null = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
  const regressed = baseline ? compare(results, baseline) : false;

  if (flag('save')) {
    const next: Baseline = {
      date: new Date().toISOString().slice(0, 10),
      models,
      results: Object.fromEntries(
        [
          // Scenarios not run this time keep their scores; removed ones go.
          ...Object.entries(baseline?.results ?? {}).filter(([id]) => SCENARIOS.some((s) => s.id === id)),
          ...results.map((r) => [r.id, { failed: r.failed, task: r.verdict?.task, voice: r.verdict?.voice, promptVersion: r.promptVersion }] as const),
        ],
      ),
    };
    writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
    console.log('Saved as the new baseline: server/src/evals/baseline.json');
  }
  process.exit(regressed ? 1 : 0);
}

void main();
