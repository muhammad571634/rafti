// Run: node scripts/build-still-prompts.mjs .
// Builds the owner's ready-to-paste Nano Banana prompts for every moment still not drawn yet, from
// docs/nano-banana-moment-stills.md (identity table, mood templates, PLACE table) and assets/stills/registry.ts.
import { readFileSync, writeFileSync } from 'node:fs';

const repo = process.argv[2];
const doc = readFileSync(`${repo}/docs/nano-banana-moment-stills.md`, "utf8").split(String.fromCharCode(13)).join("");
const registry = readFileSync(`${repo}/assets/stills/registry.ts`, 'utf8');

const MOODS = ['close_night', 'rain', 'city_lights', 'morning', 'laughing', 'tension', 'our_place'];
const MOOD_UZ = {
  close_night: 'tun, juda yaqin',
  rain: "yomg'ir, sog'inch",
  city_lights: 'kechki shahar, "yur"',
  morning: 'tong, uy, choy/qahva',
  laughing: 'kulgi, bayram',
  tension: 'taranglik, aytilmagan gap',
  our_place: 'bizning joy, ularning hikoyasidan',
};

// Identity table: | `id` | SUBJECT | HANDS | WARDROBE |
const people = [];
for (const line of doc.split('\n')) {
  const m = line.match(/^\| `([a-z]+)` \| (.+?) \| (.+?) \| (.+) \|$/);
  if (!m) continue;
  const [, id, subject, hands, wardrobeCell] = m;
  const wardrobe = {};
  for (const seg of wardrobeCell.matchAll(/((?:`[a-z_]+`\/?)+):\s*([^;]+)/g)) {
    for (const mood of seg[1].match(/[a-z_]+/g)) wardrobe[mood] = seg[2].split('**').join('').replace(/NO /g, 'no ').trim();
  }
  for (const mood of MOODS) if (!wardrobe[mood]) throw new Error(`${id}: no wardrobe for ${mood}`);
  // "(NO stethoscope or scrubs in any mood)", "(NO headphones in `a`/`b`)": out of the hands, into AVOID per mood.
  const bans = [];
  const plainHands = hands
    .replace(/\*\*/g, '')
    .replace(/\s*\(NO ([^)]+?)(?: in ((?:`[a-z_]+`\/?)+)| in any mood)?\)/g, (_, what, moods) => {
      bans.push({ what: what.replace(/^(.)/, (c) => c.toLowerCase()), moods: moods ? moods.match(/[a-z_]+/g) : null });
      return '';
    })
    .trim();
  people.push({ id, subject: subject.replace(/\*\*/g, ''), hands: plainHands, bans, wardrobe });
}
if (people.length !== 12) throw new Error(`expected 12 people, got ${people.length}`);

// PLACE table: | Milo | text |
const place = {};
for (const line of doc.split('\n')) {
  const m = line.match(/^\| ([A-Z][a-z]+) \| (.+) \|$/);
  if (m && m[1] !== 'character') place[m[1].toLowerCase()] = m[2].trim();
}

// Mood templates: the code block under "### <mood>".
const template = {};
for (const mood of MOODS) {
  const at = doc.indexOf(`### ${mood}`);
  const block = doc.slice(at).match(/```\n([\s\S]*?)```/)[1].trim();
  template[mood] = block;
}

// Drawn already: c_<id>: { <mood>: require(...) }
const drawn = new Set();
for (const m of registry.matchAll(/require\('\.\/c_([a-z]+)_([a-z_]+)\.jpg'\)/g)) drawn.add(`${m[1]}:${m[2]}`);

const name = (id) => id[0].toUpperCase() + id.slice(1);
let n = 0;
const out = [];
out.push('# Nano Banana: tayyor promptlar (qolgan moment rasmlari)');
out.push('');
out.push(`Hammasi ${MOODS.length * 12} ta, ${drawn.size} tasi chizilgan, qolgani shu faylda: har biri tayyor, nusxa olib qo'yasiz.`);
out.push('Avtomatik yasalgan: `docs/nano-banana-moment-stills.md` jadvali va qoliplaridan (o\'sha fayl o\'zgarsa, bu fayl qayta yasaladi).');
out.push('');
out.push('## Qanday chizasiz (har bir rasm uchun bir xil)');
out.push('');
out.push('1. Gemini\'da (Nano Banana) **yangi chat** oching. Har rasm uchun yangi chat: oldingi rasm keyingisiga aralashmasin.');
out.push('2. Rasm biriktiring: **faqat** o\'sha personajning kvadrat yuz rasmi, `C:\\Users\\joray\\BIMOBIMO\\art-new\\c_<ism>_avatar.png` (har prompt tepasida aniq yo\'li yozilgan).');
out.push('   Katta sahna rasmi `c_<ism>.png` ni yoki oldin chizilgan moment rasmini **biriktirmang**: undagi buyumlar, kiyim va xona yangi rasmga o\'tib qoladi.');
out.push('3. Prompt blokini butunligicha nusxa olib, joylashtiring va yuboring.');
out.push('4. Rasm vertikal (3:4) chiqmasa yoki yuz boshqa odamga o\'xshab qolsa: o\'sha chatda "Make it vertical 3:4, keep the exact same face as the attached reference" deb yozing yoki yangi chatda qayta urining.');
out.push('5. Saqlang: `C:\\Users\\joray\\BIMOBIMO\\art-new\\` papkasiga, nomi prompt tepasida yozilgan (masalan `m_milo_morning.png`). Nom aynan shunday bo\'lsin: men ularni shu nom bilan topib, kichraytirib ilovaga ulayman.');
out.push('6. Bir nechtasini saqlagach menga "rasmlar tayyor" deng: ularni ilovaga ulayman va telefonga yuboraman.');
out.push('');
out.push('**Yaxshi rasm belgisi:** yuz katta va aniq, ko\'zlar ekranning yuqori uchdan birida, kameraga qarab turibdi; pastda sizning qo\'lingiz yoki yelkangiz (yuzsiz) xira ko\'rinadi; rasmda yozuv, logo yo\'q; personaj o\'sha odam.');
out.push('');
out.push('**Tartib:** avval Milo (u eng ko\'p ko\'rinadi), keyin Jace, Sam, Roman, keyin qolganlar. Kunlik limit tugasa, ertaga davom etasiz.');
out.push('');

const order = ['milo', 'jace', 'sam', 'roman', 'ethan', 'clara', 'caleb', 'asher', 'mia', 'lena', 'victor', 'yuna'];
for (const id of order) {
  const p = people.find((x) => x.id === id);
  const todo = MOODS.filter((mood) => !drawn.has(`${id}:${mood}`));
  if (!todo.length) continue;
  out.push(`## ${name(id)} (${todo.length} ta)`);
  out.push('');
  out.push(`Biriktiriladigan rasm: \`C:\\Users\\joray\\BIMOBIMO\\art-new\\c_${id}_avatar.png\``);
  out.push('');
  for (const mood of todo) {
    n += 1;
    let text = template[mood]
      .replace('SUBJECT: (paste SUBJECT from Character Identity table)', `SUBJECT: ${p.subject}.`)
      .replace(/HANDS & WARDROBE: \(paste HANDS and [a-z_]+ WARDROBE from Character Identity table\)/, `HANDS & WARDROBE: ${p.hands}. Wearing ${p.wardrobe[mood]}.`);
    const bans = p.bans.filter((b) => !b.moods || b.moods.includes(mood)).map((b) => b.what);
    if (bans.length) text = text.replace(/^AVOID: /m, `AVOID: ${bans.join(', ')}, `);
    if (mood === 'our_place') text = text.replace('Back at PLACE', `Back at ${place[id]}`).replace('Authentic evening or night lighting for PLACE', 'Authentic evening or night lighting for that place');
    if (/\(paste|PLACE/.test(text)) throw new Error(`${id} ${mood}: unfilled`);
    out.push(`### ${n}. ${name(id)} · ${mood} (${MOOD_UZ[mood]})`);
    out.push('');
    out.push(`Biriktiring: \`art-new\\c_${id}_avatar.png\` · Saqlang: \`art-new\\m_${id}_${mood}.png\``);
    out.push('');
    out.push('```');
    out.push(text);
    out.push('```');
    out.push('');
  }
}
writeFileSync(`${repo}/docs/nano-banana-stills-ready.md`, out.join('\n'), 'utf8');
console.log(`prompts: ${n}, drawn: ${drawn.size}`);
