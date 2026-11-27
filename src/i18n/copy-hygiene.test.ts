import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const IOS_LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'ios');

const LOCALE_CODES = ['en', 'es', 'pt-BR', 'fr', 'de', 'it', 'ja', 'ko', 'zh-Hant', 'id', 'vi', 'th', 'ru', 'tr'] as const;

function flatten(obj: Record<string, unknown>, pre = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const nk = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v as Record<string, unknown>, nk, out);
    else out[nk] = String(v);
  }
  return out;
}

function loadLocale(code: string): Record<string, string> {
  return flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8')));
}

/**
 * Automated copy & localization hygiene guards (Apple HIG Writing + Sigmazam brand voice).
 * Keeps live copy bugs, robotic strings, FOMO jargon, register splits and unlocalized iOS
 * permissions from creeping back into any of the 14 locales.
 */
describe('copy hygiene across all 14 locales', () => {
  const all = Object.fromEntries(LOCALE_CODES.map((code) => [code, loadLocale(code)]));

  it('uses typographic ellipsis (…) instead of three ASCII dots (...) in UI copy', () => {
    const bad: string[] = [];
    for (const [code, map] of Object.entries(all)) {
      for (const [k, v] of Object.entries(map)) {
        if (k.startsWith('phrases.')) continue;
        if (v.includes('...')) bad.push(`${code}:${k}=${v}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  it('references Pro (never retired Plus) and keeps paywall shell counts dynamic', () => {
    for (const [code, map] of Object.entries(all)) {
      assert.equal('profile.tryPlus' in map, false, `${code} still has retired profile.tryPlus`);
      assert.ok(map['profile.tryPro']?.includes('Pro'), `${code}:profile.tryPro should mention Pro`);
      assert.ok(map['paywall.proMeta']?.includes('{{shells}}'), `${code}:paywall.proMeta must interpolate {{shells}}`);
      assert.equal(/5[,. ]000/.test(map['paywall.proMeta'] ?? ''), false, `${code}:paywall.proMeta hardcodes 5,000`);
    }
  });

  it('avoids 00:00 clock codes, anime tildes, and internal ladder/burn FOMO jargon', () => {
    for (const [code, map] of Object.entries(all)) {
      for (const k of ['paywall.freeBack', 'paywall.comeBack', 'plans.freeNote']) {
        assert.equal(/00[:h]00/.test(map[k] ?? ''), false, `${code}:${k} uses 00:00 instead of midnight`);
      }
      assert.equal((map['call.shareMessage'] ?? '').includes('~') || (map['call.shareMessage'] ?? '').includes('〜'), false, `${code}:call.shareMessage has tilde`);
      assert.equal(/\b(ladder|лестница|merdiven|escalera|échelle|escada|Leiter|scala|tangganya)\b/i.test(map['push.giftLadder'] ?? ''), false, `${code}:push.giftLadder leaks internal ladder jargon`);
      assert.equal(/\b(burn|сгорят|yanacak|queman|brûlent|queimam)\b/i.test(map['push.shellsBurn'] ?? ''), false, `${code}:push.shellsBurn uses harsh burn wording`);
    }
  });

  it('keeps Turkish level suffix grammatically safe for every number', () => {
    const tr = all.tr;
    for (const k of ['closeness.toNext', 'dateTheme.moodHint.flirty', 'dateTheme.moodHint.sweet']) {
      assert.equal(tr[k]?.includes("{{level}}'"), false, `Turkish ${k} must not attach a hardcoded vowel-harmony suffix to {{level}}`);
    }
    assert.equal(tr['call.shareMessage']?.includes('mm'), false, 'Turkish call.shareMessage typo must stay fixed');
  });

  it('uses full localized Level wording instead of gaming Lv abbreviations across all 14 locales', () => {
    const levelKeys = [
      'home.hero.level',
      'levelUp.levelLabel',
      'contacts.level',
      'dating.level',
      'dateTheme.moodHint.flirty',
      'dateTheme.moodHint.sweet',
      'closeness.levels',
      'closeness.level',
      'closeness.toNext',
      'closeness.lockedAt',
    ];
    const abbrRe = /(?<![\p{L}])(Lv|Nv|Niv|Nív|Liv|Ур\.)(?![\p{L}])/iu;
    const bad: string[] = [];
    for (const [code, map] of Object.entries(all)) {
      for (const k of levelKeys) {
        if (abbrRe.test(map[k] ?? '')) bad.push(`${code}:${k}=${map[k]}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  it('follows the Friend vs Character glossary in active-relationship and privacy copy', () => {
    const en = all.en;
    for (const k of [
      'find.noResults',
      'chatList.emptyHint',
      'callHistory.emptyHint',
      'diary.infoBody',
      'chat.voiceConsent.body',
      'chat.photoConsent.body',
      'characterSettings.characterSettings',
      'characterSettings.sectionCharacter',
      'streams.sheetHint',
      'streams.empty',
      'streams.emptyHint',
      'streams.pickOne',
      'streams.others',
      'streams.problems.pair',
    ]) {
      assert.equal(/\bcharacters?\b/i.test(en[k] ?? ''), false, `en:${k} should use friend/someone/Sigmazam instead of character`);
    }
    assert.ok(en['chat.voiceConsent.body']?.includes('Sigmazam'));
    assert.ok(en['chat.photoConsent.body']?.includes('Sigmazam'));
  });

  it('keeps Russian and French singular user copy in warm informal register (ты / tu)', () => {
    const ru = all.ru;
    const ruAllowedPlural = new Set([
      'group.pickMemberBody',
      'gifts.codeAcceptedBody',
      'gifts.inviteRulesNote',
      'createCharacter.youTwo',
      'us.noRelationshipsHint',
      'us.momentText.met',
      'closeness.body',
      'closeness.pick',
      'notifications.hint.weeklyRecap',
      'notifications.inbox.levelUp',
      'friendRemove.deleteBody',
    ]);
    const ruFormalRe = /(?<![\p{L}])(вы|вам|вас|ваш|ваша|ваше|ваши|вашу|вашего|вашему|ваших|вами|вашей|вашем|вашим|вашими)(?![\p{L}])/iu;
    const ruBad = Object.entries(ru)
      .filter(([k, v]) => !k.startsWith('phrases.') && !ruAllowedPlural.has(k) && ruFormalRe.test(v))
      .map(([k, v]) => `${k}: ${v}`);
    assert.deepEqual(ruBad, []);

    const fr = all.fr;
    const frAllowedPlural = new Set([
      'chatList.deleteBody',
      'group.pickMemberBody',
      'secretNote.sealedHint',
      'gifts.codeAcceptedBody',
      'gifts.inviteRulesNote',
      'createCharacter.youTwo',
      'us.noRelationshipsHint',
      'us.momentText.met',
      'closeness.body',
      'closeness.pick',
      'friendRemove.deleteBody',
    ]);
    const frFormalRe = /(?<![\p{L}-])(vous|votre|vos)(?![\p{L}])/iu;
    const frBad = Object.entries(fr)
      .filter(([k, v]) => !k.startsWith('phrases.') && !frAllowedPlural.has(k) && frFormalRe.test(v))
      .map(([k, v]) => `${k}: ${v}`);
    assert.deepEqual(frBad, []);
  });

  it('ships localized iOS InfoPlist permission prompts for all 14 languages in app.json', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const locales = appJson.expo?.locales ?? {};
    const requiredKeys = ['NSMicrophoneUsageDescription', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'];
    for (const code of LOCALE_CODES) {
      assert.equal(locales[code], `./src/i18n/ios/${code}.json`, `app.json missing expo.locales.${code}`);
      const file = path.join(IOS_LOCALES_DIR, `${code}.json`);
      assert.ok(fs.existsSync(file), `missing ${file}`);
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const key of requiredKeys) {
        assert.ok(typeof parsed.ios?.[key] === 'string' && parsed.ios[key].trim().length > 10, `${code}.json missing ios.${key}`);
      }
    }
  });
});
