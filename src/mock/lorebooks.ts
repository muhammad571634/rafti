import type { LoreEntry, LoreKind, Lorebook } from '@/types';

import { shortName } from '../lib/names';
import { characters } from './characters';

/**
 * The four worlds' books (`Character.series`), free for everyone and read-only: a few lines about
 * the world, its places, things, groups, events and rules, and its cast as people, so a friend
 * knows the others by name. Every fact here agrees with the cast's bios and the world quizzes
 * (src/mock/worlds.ts); keep them in step. Later the server sends these.
 */

const CREATED = '2026-10-25T00:00:00.000Z';

type Written = [kind: LoreKind, name: string, keywords: string[], text: string];

const WORLD_BOOKS: { key: string; series: string; about: string; entries: Written[] }[] = [
  {
    key: 'seaside',
    series: 'Seaside Academy',
    about:
      'A university town by the sea: lecture halls on the cliff, a long wooden pier, a campus aquarium and a library with a roof garden. Everyone here is an adult student or staff, term runs from autumn to early summer, and the sea is never far away.',
    entries: [
      ['place', 'The pier', ['pier', 'boardwalk'], 'A long wooden pier below campus. Kai swims off its end at sunrise; students meet there after exams and at night to watch the lighthouse blink.'],
      ['place', 'The library roof', ['library roof', 'roof garden', 'library'], 'A quiet roof garden above the university library, where Iris reads at lunch. Officially closed after 9 p.m., unofficially never.'],
      ['place', 'Aquarium lab', ['aquarium', 'fish', 'lab'], 'The marine biology lab under the science wing. Rowan runs it and names every fish after a friend; visitors are welcome if they do not tap the glass.'],
      ['thing', 'Campus cats', ['cats', 'cat', 'kitten'], 'A small colony of cats that lives by the old boathouse. Elio feeds them in secret and denies it to everyone.'],
      ['event', 'The 1 a.m. show', ['radio', 'radio show', 'on air'], 'Noah’s campus radio show, on air at 1 a.m. on weeknights. The last song is always dedicated to "someone listening".'],
      ['group', 'Clubs', ['club', 'swim team', 'art club', 'film club', 'debate team', 'student union'], 'The swim team (Kai), the art club (Hana), the film club (Jun) and the debate team (Tessa) share the old student union building, which Theo runs as union president.'],
      ['event', 'Exam week', ['exam', 'exams', 'finals'], 'Twice a year the campus goes quiet for exam week: the library stays open all night and the vending machine runs out of coffee by Tuesday.'],
      ['place', 'The quad', ['quad', 'courtyard'], 'The grassy square between the lecture halls, where everyone eats lunch when the sun is out.'],
    ],
  },
  {
    key: 'moonlit',
    series: 'Moonlit Realm',
    about:
      'A kingdom of endless night under a huge silver moon. The court lives in the Moon Palace, the Silver Guard keeps the roads, and magic runs on oaths and starlight. Travellers who lose their way follow the lanterns.',
    entries: [
      ['place', 'Moon Palace', ['palace', 'court', 'throne'], 'The silver palace at the heart of the realm. Prince Aurelian was exiled from its court and tends a garden at its edge that blooms only when someone stays.'],
      ['place', 'Star archive', ['archive', 'stars', 'night sky'], 'A tower where every night sky is written down. Lord Castor has kept it for a thousand years and can read any of them from memory.'],
      ['group', 'Silver Guard', ['guard', 'knight', 'patrol'], 'The realm’s knights, led by Commander Seraphine. Sir Rhys of the Thorn Gate is its most earnest member and reports after every patrol.'],
      ['place', 'Thorn Gate', ['gate', 'thorns'], 'The northern gate, grown over with silver thorns. Sir Rhys keeps watch there.'],
      ['rule', 'Oaths', ['oath', 'promise', 'vow'], 'An oath spoken under the moon binds: whoever breaks it grows dimmer, as if a little light left them. People here are careful with promises.'],
      ['thing', 'The lanterns', ['lantern', 'lanterns', 'lost'], 'Lyra’s lanterns light the roads for lost travellers. She keeps one burning for one person only.'],
      ['place', 'Raven cliff', ['raven', 'ravens', 'cliff'], 'A windy cliff where the exiled general Corvin keeps his ravens. They carry letters anywhere in the realm.'],
      ['thing', 'Memory potions', ['potion', 'potions', 'alchemy', 'brew'], 'Vesper’s potions taste like old memories. Brewing forgetfulness is forbidden, and he would never brew it anyway.'],
    ],
  },
  {
    key: 'neon',
    series: 'NEON TIDE',
    about:
      'A neon-lit city of music, and NEON TIDE at the centre of it: six members, their producer, choreographer and manager, one shared dorm and a schedule that never ends. The girl group PRISM is always one chart spot away.',
    entries: [
      ['group', 'The members', ['members', 'the group', 'neon tide'], 'Ezra (leader), Seren (main vocal), Kiro (rapper), Minu (the youngest, twenty), Haze (visual and sub-vocal) and Rio (main dancer). Dex produces, Ari choreographs, Juno manages.'],
      ['group', 'PRISM', ['rival', 'rivals', 'girl group'], 'The girl group everyone calls NEON TIDE’s rivals, led by Cass Valen. Both sides say there is no rivalry; nobody believes them.'],
      ['place', 'Studio B', ['studio', 'practice room', 'practice'], 'The basement practice studio, mirrors on three walls. Ari counts in eights there, and Rio stays until the lights switch off on their own.'],
      ['place', 'The dorm', ['dorm', 'dormitory'], 'The shared dorm: one kitchen, six opinions about the fridge, and a rooftop where members go to be alone.'],
      ['event', 'The comeback', ['comeback', 'album', 'single', 'teaser'], 'The next comeback is in the works: a new single, a music video shoot and weeks of rehearsal. Every detail stays secret until the teaser drops.'],
      ['event', 'Concerts', ['concert', 'stage', 'tour', 'fan meeting'], 'Arena concerts and fan meetings; the light sticks glow sea blue. Ezra is steady on stage and a little lost once the lights go off.'],
      ['rule', 'Schedules', ['schedule', 'manager'], 'Juno runs every schedule from four phones: early calls, broadcasts, rehearsals. Private life stays private; the members never post about who they date.'],
    ],
  },
  {
    key: 'tidepool',
    series: 'Tidepool Café',
    about:
      'A small café on a busy harbour street, run by Sol. Regulars from the neighbourhood (a florist, a firefighter, a vet, a lawyer, a writer and more) drop in every day. It opens at seven and smells of croissants by half past.',
    entries: [
      ['place', 'The café', ['café', 'cafe', 'coffee shop', 'tidepool'], 'Sol’s café: mismatched chairs, a corner table that belongs to Gideon, a window seat everyone wants, and a chalkboard menu that changes with Sol’s mood.'],
      ['thing', 'The first croissant', ['croissant', 'croissants', 'pastry', 'pastries'], 'Ren bakes from five in the morning and saves the first croissant of the day for one regular.'],
      ['place', 'Flower shop', ['flower', 'flowers', 'florist'], 'Ivy’s flower shop next door. She knows what every flower means and slips one into a regular’s bag when they are not looking.'],
      ['place', 'Fire station', ['firefighter', 'station'], 'The station down the street. Marco orders two coffees every shift and gives one away.'],
      ['thing', 'The old scooter', ['scooter', 'delivery'], 'The café’s delivery scooter, older than Sol’s lease. Cole keeps it running and never sends a bill.'],
      ['event', 'Dog of the week', ['dog', 'dogs', 'puppy', 'rescue'], 'Every week Hugo brings a different rescue dog to the café and asks a regular to name it. Most of them find a home within a month.'],
      ['place', 'Harbour street', ['harbour', 'harbor', 'street'], 'The street runs down to a small harbour: the café, the flower shop, a garage and the fire station all within a few minutes’ walk.'],
    ],
  },
];

/** The cast as people of their world: the name and the short name call them up, the bio says who they are. */
function castEntries(series: string): LoreEntry[] {
  return characters
    .filter((c) => c.isOfficial && c.series === series)
    .map((c) => {
      const short = shortName(c.name);
      return {
        id: `lore_person_${c.id}`,
        kind: 'person' as const,
        name: c.name,
        keywords: short !== c.name ? [short] : [],
        text: c.bio,
        characterId: c.id,
      };
    });
}

export const officialLorebooks: Lorebook[] = WORLD_BOOKS.map((world) => ({
  id: `lore_${world.key}`,
  name: world.series,
  about: world.about,
  entries: [
    ...world.entries.map(([kind, name, keywords, text], i) => ({ id: `lore_${world.key}_${i + 1}`, kind, name, keywords, text })),
    ...castEntries(world.series),
  ],
  characterIds: [],
  series: world.series,
  official: true,
  createdAt: CREATED,
}));
