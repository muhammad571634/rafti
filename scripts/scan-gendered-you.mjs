// scripts/scan-gendered-you.mjs
// Lists translated content strings that may assume the user's gender (docs/agent-tasks/gendered-user-forms.md).
// Rough on purpose: it flags candidates, a reader decides. Usage: node scripts/scan-gendered-you.mjs [code] [--count]

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src', 'i18n', 'content');

// Character gender from the mocks, so a line said to a character can use that character's gender.
const castSrc = fs.readFileSync(path.join(root, 'src', 'mock', 'characters.ts'), 'utf8');
const castGender = {};
for (const m of castSrc.matchAll(/id: '(c_\w+)'[\s\S]*?gender: '(\w+)'/g)) castGender[m[1]] = m[2];

// Who says the line. 'user': the user speaks (first person = the user). 'about': narration about the user.
// Everything else: a character speaks to the user (second person = the user).
function roleOf(p) {
  if (/^characters\.[^.]+\.starters\./.test(p)) return 'user';
  if (/^(truthsForThem|daresForThem)\.[^.]+\.ask$/.test(p)) return 'user';
  if (/^secretNotes\.[^.]+\.myNote$/.test(p)) return 'user';
  if (/^datePlaces\..*\.choices\.\d+\.text$/.test(p)) return 'user';
  if (/^diaryEntries\.[^.]+\.(title|body)$/.test(p)) return 'user';
  if (/^quizPacks\..*\.options\./.test(p)) return 'user';
  if (/^scenes\.[^.]+\.userRole$/.test(p) || /^datePlaces\..*\.line$/.test(p)) return 'about';
  return 'char';
}

// Letter-aware word edges: JS \b is ASCII-only, so ⟨ and ⟩ stand for them below.
const rx = (s, flags = 'iu') =>
  new RegExp(s.replaceAll('⟨', '(?<![\\p{L}\\p{M}])').replaceAll('⟩', '(?![\\p{L}\\p{M}])'), flags);

const RU_SHORT =
  'готов|уверен|рад|должен|голоден|занят|свободен|прав|доволен|влюбл[её]н|жив|здоров|согласен|один|сам|способен|нужен|счастлив|красив|хорош|серь[её]зен|честен|ум[её]н|сил[её]н|смешон|виноват|знаком|обязан|спокоен|болен|похож|одет|осторожен|удивл[её]н|расстроен|обижен';
const RU_PAST = '\\p{L}+(?:л|лся)|(?:с|по|за)?мог|лёг|привык|промок|замёрз|продрог';
const FR_M =
  'prêt|content|heureux|sûr|seul|beau|mignon|fou|amoureux|jaloux|sérieux|curieux|nerveux|chanceux|gentil|parfait|bienvenu|mort|fort|grand|petit|bon|cher|certain|génial|inquiet|doux|têtu|patient|discret|courageux|généreux|malin|\\p{L}+(?:é|u|is)';
const FR_ADV = '(?:(?:si|très|trop|tellement|déjà|encore|bien|enfin|vraiment|tout|toujours|un\\s+peu|plus|aussi|pas|jamais)\\s+){0,2}';
const ES_ADV = '(?:(?:muy|tan|todavía|aún|ya|bien|demasiado|súper|super|más|siempre|un\\s+poco|bastante|algo|medio)\\s+){0,2}';
const IT_ADV = '(?:(?:molto|così|già|ancora|davvero|proprio|tanto|un\\s+po\'|troppo|sempre|più|tutto|veramente)\\s+){0,2}';
const PT_ADV = '(?:(?:muito|tão|ainda|já|bem|meio|super|mais|sempre|todo|um\\s+pouco|bastante)\\s+){0,2}';
// Words ending in -o that are not about a person.
const NOT_PERSON = '(?!(?:como|poco|pouco|tanto|cuanto|quanto|algo|tempo|tiempo|modo|posto|lavoro|trabajo|trabalho|momento|caso|dopo|molto|troppo|proprio|davvero|sotto|dentro|centro|cedo|pronto\\s+para|\\p{L}+ndo)⟩)';

// Only these five content languages mark the user's gender in "you" or "I"; the other eight were checked on
// 2026-10-30 (zh-Hant uses 你, ko/vi/th/ja/de/id/tr had no user-gendered forms).
// you: a character speaks to the user. me: the user speaks. q: only in a question. s: only in a statement.
const RULES = {
  ru: {
    you: [
      `⟨(?:ты|будь)⟩[^.!?…]{0,30}?⟨(?:${RU_PAST}|${RU_SHORT})⟩`,
      `⟨ты⟩\\s+(?:\\p{L}+\\s+){0,2}(?!(?:этой|той|мной|тобой|собой|одной|своей|моей|твоей|домой|порой)⟩)\\p{L}+(?:ый|ий|ой)⟩`,
      `(?:^|[,.!?…—]\\s*)(?:мой\\s+)?(?:дорогой|милый|родной|любимый|красавчик|дружище|приятель|бро|чувак|парень|братишка|сладкий|глупый|герой|мой хороший)(?=\\s*[,.!?…)]|$)`,
    ],
    q: [`^[—*\\s]*(?:${RU_PAST}|${RU_SHORT})⟩`, `[,—]\\s*(?:${RU_PAST})\\s*\\?`],
    me: [`⟨я⟩[^.!?…]{0,30}?⟨(?:${RU_PAST}|${RU_SHORT})⟩`],
    s: [`^[—*\\s]*(?:${RU_PAST})⟩`],
  },
  fr: {
    you: [
      `⟨(?:tu\\s+(?:es|étais|seras|serais|sembles|parais|restes|deviens|as\\s+l'air|te\\s+sens)|t['’]es|es-tu|étais-tu)\\s+${FR_ADV}(?!(?:ici|aussi|lui|qui|celui)⟩)(?:${FR_M})⟩`,
      `⟨tu\\s+t['’]es\\s+(?:\\p{L}+\\s+)?\\p{L}+(?:é|i|u|is|it)⟩`,
      `⟨(?:t['’]|te\\s+)(?:ai|a|avons|avais|avait|aurais)\\s+(?:(?:déjà|tellement|tant|bien|toujours|jamais|vraiment|pas|enfin)\\s+){0,2}(?!(?:dit|écrit|promis|répondu|demandé|offert|apporté|gardé|envoyé|préparé|acheté|fait|parlé|raconté|montré|donné|laissé|réservé|souri|menti|manqué)⟩)\\p{L}+(?:é|i|u|is|it)⟩`,
      `⟨bienvenus?⟩`,
      `(?:^|[,.!?…]\\s*)(?:mon\\s+(?:cher|chéri|beau|grand|petit|pote|vieux|héros)|cher|chéri|beau\\s+gosse)(?=\\s*[,.!?…]|$)`,
    ],
    q: [`^[*\\s]*(?:${FR_M})\\s*\\?`],
    me: [
      `⟨(?:je\\s+(?:suis|serai|serais|me\\s+sens|reste|deviens)|j['’]étais|je\\s+me\\s+suis)\\s+${FR_ADV}(?:\\p{L}+\\s+)?(?:${FR_M})⟩`,
      `⟨(?:désolé|ravi|prêt|fatigué|épuisé|crevé|occupé)⟩`,
    ],
  },
  es: {
    you: [
      `⟨(?:estás|estabas|estarás|estarías|estuviste|eres|eras|serás|serías|fuiste|pareces|te\\s+ves|te\\s+sientes|te\\s+sentiste|te\\s+quedaste|has\\s+estado|has\\s+sido|sigues|andas|te\\s+pusiste)\\s+${ES_ADV}${NOT_PERSON}\\p{L}+os?⟩`,
      `⟨(?:bienvenidos?|tú\\s+mismo|contigo\\s+mismo)⟩`,
      `(?:^|[,.!?…¡¿]\\s*)(?:querido|guapo|precioso|tonto|tontito|amigo|campeón|chico)(?=\\s*[,.!?…]|$)`,
    ],
    q: [`^[¿¡*\\s]*(?:listo|cansado|seguro|preparado|despierto|dormido|nervioso|contento|ocupado|enojado|enfadado|celoso|aburrido|perdido|mojado|empapado|solito)⟩`],
    me: [
      `⟨(?:estoy|estaba|estuve|soy|era|fui|me\\s+siento|me\\s+sentí|me\\s+quedé|sigo|ando|he\\s+estado|he\\s+sido)\\s+${ES_ADV}${NOT_PERSON}\\p{L}+os?⟩`,
      `⟨(?:obligado|encantado|agradecido)⟩`,
    ],
  },
  it: {
    you: [
      `⟨(?:sei|eri|sarai|saresti|sembri|sembravi|ti\\s+senti|ti\\s+sei|resti|rimani|diventi|stai|sei\\s+stato|sei\\s+rimasto)\\s+${IT_ADV}${NOT_PERSON}\\p{L}+o⟩`,
      `⟨(?:benvenuto|tu\\s+stesso|da\\s+solo|tutto\\s+solo|caro\\s+mio|bello\\s+mio|amico\\s+mio)⟩`,
      `(?:^|[,.!?…]\\s*)(?:caro|bello|carino|amico|campione)(?=\\s*[,.!?…]|$)`,
    ],
    q: [`^[*\\s]*(?:pronto|stanco|sicuro|sveglio|contento|arrivato|tornato|nervoso|geloso|occupato|bagnato|fradicio|affamato)⟩`],
    me: [
      `⟨(?:sono|ero|sarò|sarei|mi\\s+sento|mi\\s+sono|resto|rimango|sto|sono\\s+stato|sono\\s+rimasto)\\s+${IT_ADV}${NOT_PERSON}\\p{L}+o⟩`,
    ],
  },
  'pt-BR': {
    you: [
      `⟨(?:você|vc|cê|tu)⟩[^.!?…]{0,15}?⟨(?:está|estava|estará|estaria|esteve|tá|é|era|será|seria|foi|parece|parecia|ficou|fica|continua|anda)\\s+${PT_ADV}${NOT_PERSON}\\p{L}+os?⟩`,
      `⟨(?:bem-vindos?|você\\s+mesmo|sozinho)⟩`,
      `(?:^|[,.!?…]\\s*)(?:querido|lindo|bonitão|gato|amigo|campeão)(?=\\s*[,.!?…]|$)`,
    ],
    q: [`^[*\\s]*(?:(?:tá|está|ficou|chegou)\\s+)?(?:cansado|pronto|preparado|acordado|nervoso|ocupado|sozinho|molhado|encharcado|bravo|chateado|contente|animado|perdido)⟩`],
    me: [
      `⟨(?:eu\\s+)?(?:estou|tô|estava|estive|sou|era|fui|fiquei|fico|me\\s+sinto|me\\s+senti)\\s+${PT_ADV}${NOT_PERSON}\\p{L}+os?⟩`,
      `⟨(?:obrigado|cansado|preparado|sozinho)⟩`,
    ],
  },
};

function* strings(node, p = '') {
  if (typeof node === 'string') yield [p, node];
  else if (Array.isArray(node)) for (let i = 0; i < node.length; i++) yield* strings(node[i], p ? `${p}.${i}` : `${i}`);
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) yield* strings(v, p ? `${p}.${k}` : k);
}

function scan(code) {
  const r = RULES[code];
  const compiled = Object.fromEntries(Object.entries(r).map(([k, list]) => [k, list.map((s) => rx(s))]));
  const json = JSON.parse(fs.readFileSync(path.join(contentDir, `${code}.json`), 'utf8'));
  const hits = [];
  for (const [p, text] of strings(json)) {
    // Tags, likes and dislikes describe the character, not the user.
    if (/^characters.[^.]+.(tags|likes|dislikes)./.test(p)) continue;
    const role = roleOf(p);
    const sentences = text.split(/(?<=[.!?…])\s+/);
    // A user line said to one character may use that character's gender for "you": skip the "you" rules there.
    const kinds = role === 'user' ? ['me', 's'] : ['you', 'q'];
    const found = kinds.some((k) =>
      (compiled[k] ?? []).some((re) =>
        sentences.some((s) => {
          const isQ = /\?\s*\*?\s*$/.test(s);
          if (k === 'q' && !isQ) return false;
          if (k === 's' && isQ) return false;
          return re.test(s);
        }),
      ),
    );
    if (found) {
      const cid = p.match(/^characters\.(c_\w+)/)?.[1];
      hits.push({ path: p, role: cid ? `${role}, character ${castGender[cid] ?? '?'}` : role, text });
    }
  }
  return hits;
}

const args = process.argv.slice(2);
const countOnly = args.includes('--count');
const codes = args.filter((a) => !a.startsWith('--'));
let total = 0;
for (const code of codes.length ? codes : Object.keys(RULES)) {
  if (!RULES[code]) {
    console.error(`No rules for ${code}. Known: ${Object.keys(RULES).join(', ')}`);
    process.exit(1);
  }
  const hits = scan(code);
  total += hits.length;
  if (countOnly) {
    console.log(`${code}: ${hits.length}`);
    continue;
  }
  console.log(`\n## ${code}: ${hits.length} candidates`);
  for (const h of hits) console.log(`${h.path} [${h.role}]\n  ${h.text}`);
}
if (countOnly) console.log(`total: ${total}`);
