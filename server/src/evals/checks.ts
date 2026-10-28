import { findRepeat } from '../../../src/ai/repetition.ts';
import type { Message } from '../../../src/types/index.ts';

/**
 * The eval set's machine checks (backend-plan §12.11): free and exact, run on every answer before
 * the judge reads it. Each names what a reply must or must not do in its scenario.
 */
export type Check =
  /** Says at least one of these (any case): a remembered name, a helpline, the topic. */
  | { kind: 'includes'; any: readonly string[] }
  /** Says none of these (any case): "as an AI", a claim to be human, a price. */
  | { kind: 'excludes'; any: readonly string[] }
  /** How many bubbles or lines. */
  | { kind: 'lines'; min?: number; max?: number }
  /** How many words in all. */
  | { kind: 'words'; min?: number; max?: number }
  | { kind: 'noEmoji' }
  /** No *narration* in asterisks. */
  | { kind: 'noNarration' }
  /** Some *narration* in asterisks (Story style). */
  | { kind: 'narration' }
  /** Does not open with one of these words (a tic the chat shows). */
  | { kind: 'opensNot'; any: readonly string[] }
  | { kind: 'noQuestion' }
  /** Written in this language, as `languageOf` reads the whole answer. */
  | { kind: 'language'; is: EvalLanguage }
  /** Echoes none of their replies in the chat, nor a version a ↻ replaces (`findRepeat`). */
  | { kind: 'noRepeat' }
  /** The crisis check's verdict: the helpline card shows (true) or does not (false). */
  | { kind: 'crisis'; is: boolean };

/** What a reply answers: the chat, the versions a ↻ replaces, and what the crisis check said. */
export interface CheckContext {
  chat?: readonly Message[];
  redo?: readonly string[];
  crisis?: boolean;
}

const EMOJI = /\p{Extended_Pictographic}/u;
const NARRATION = /\*[^*\n]+\*/;

/**
 * The languages the eval's scenarios are written in. The app itself names none (the model follows
 * the user, src/ai/reply-language.ts); this only checks that it did.
 */
export type EvalLanguage = 'en' | 'es' | 'fr' | 'pt' | 'ru' | 'ja';

// Everyday words of each Latin-script language that the others rarely use.
const WORDS: Record<'en' | 'es' | 'fr' | 'pt', ReadonlySet<string>> = {
  en: new Set(['the', 'you', 'and', 'is', 'are', 'to', 'of', 'it', 'that', 'what', 'i', "i'm", 'my', 'your', 'with', 'this', 'have', 'not', 'was', 'just', 'so', 'how', 'do', 'can', 'today', 'good', 'about', 'we', 'will', 'want', 'really', 'tonight']),
  es: new Set(['hola', 'qué', 'el', 'y', 'los', 'las', 'por', 'pero', 'muy', 'gracias', 'bien', 'estás', 'estoy', 'eres', 'soy', 'es', 'una', 'mi', 'hoy', 'día', 'noche', 'bueno', 'quiero', 'tengo', 'mucho', 'nada', 'también', 'ahora', 'porque', 'vamos', 'jaja', 'del', 'al', 'con', 'eso', 'mañana', 'yo', 'algo', 'cuando', 'aquí']),
  fr: new Set(['je', 'vous', 'est', 'pas', 'les', 'des', 'une', 'avec', 'pour', 'mais', 'bonjour', 'salut', 'merci', 'très', 'oui', 'suis', 'ce', 'et', 'il', 'elle', 'du', 'au', 'mon', 'ton', 'aujourd', 'ça', 'qui', 'quoi', 'ai', 'fait', 'bien', 'moi', 'toi', 'ici', 'nous']),
  pt: new Set(['você', 'não', 'obrigado', 'obrigada', 'muito', 'estou', 'hoje', 'também', 'uma', 'com', 'mas', 'eu', 'meu', 'minha', 'tudo', 'bem', 'né', 'tá', 'isso', 'aqui', 'agora', 'então', 'oi', 'olá', 'dia', 'noite', 'quero', 'tenho', 'nada', 'sou', 'vamos', 'ao', 'do', 'da', 'na', 'no']),
};

/** The answer's language for the eval's checks: script first, then everyday words; undefined when unclear. */
export function languageOf(text: string): EvalLanguage | undefined {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (!letters) return undefined;
  if ((text.match(/\p{Script=Cyrillic}/gu) ?? []).length / letters >= 0.5) return 'ru';
  if ((text.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu) ?? []).length / letters >= 0.5) return 'ja';
  // Words with an inner apostrophe ("i'm"), never one from a quote mark ("'estás").
  const words = text.toLowerCase().match(/\p{L}+(?:'\p{L}+)*/gu) ?? [];
  const scores = (Object.keys(WORDS) as (keyof typeof WORDS)[]).map((lang) => [lang, words.filter((w) => WORDS[lang].has(w)).length] as const);
  const [best, second] = [...scores].sort((a, b) => b[1] - a[1]);
  return best[1] > second[1] ? best[0] : undefined;
}

const wordsOf = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];

const range = (label: string, n: number, min?: number, max?: number) =>
  (min !== undefined && n < min) || (max !== undefined && n > max) ? `${label} ${min ?? 0}-${max ?? '∞'} (got ${n})` : null;

/** The checks a reply fails, as short labels; [] when it passes them all. */
export function failedChecks(lines: readonly string[], checks: readonly Check[], { chat = [], redo = [], crisis = false }: CheckContext = {}): string[] {
  const text = lines.join('\n');
  const lower = text.toLowerCase();
  const words = wordsOf(text);
  const fails: (string | null)[] = checks.map((check) => {
    switch (check.kind) {
      case 'includes':
        return check.any.some((s) => lower.includes(s.toLowerCase())) ? null : `includes(${check.any.join('|')})`;
      case 'excludes': {
        const hit = check.any.find((s) => lower.includes(s.toLowerCase()));
        return hit ? `excludes(${hit})` : null;
      }
      case 'lines':
        return range('lines', lines.length, check.min, check.max);
      case 'words':
        return range('words', words.length, check.min, check.max);
      case 'noEmoji':
        return EMOJI.test(text) ? 'noEmoji' : null;
      case 'noNarration':
        return NARRATION.test(text) ? 'noNarration' : null;
      case 'narration':
        return NARRATION.test(text) ? null : 'narration';
      case 'opensNot': {
        const first = wordsOf(lines[0] ?? '')[0] ?? '';
        return check.any.some((w) => w.toLowerCase() === first) ? `opensNot(${first})` : null;
      }
      case 'noQuestion':
        return text.includes('?') ? 'noQuestion' : null;
      case 'language': {
        const found = languageOf(text);
        return found === check.is ? null : `language ${check.is} (got ${found ?? 'unclear'})`;
      }
      case 'noRepeat': {
        const repeat = findRepeat(lines, chat, redo);
        return repeat ? `noRepeat (${repeat.score.toFixed(2)}: "${repeat.line.slice(0, 40)}")` : null;
      }
      case 'crisis':
        return crisis === check.is ? null : `crisis ${check.is} (got ${crisis})`;
    }
  });
  if (!lines.length) fails.unshift('answered');
  return fails.filter((f): f is string => f !== null);
}
