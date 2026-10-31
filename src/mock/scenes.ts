import type { Scene } from '@/types';

/**
 * Scenes that come with the app, for any friend (official or the user's own). Later the server
 * sends these and can add scenes made for one world.
 */
/**
 * Each world's way in: its page starts this scene with `WorldStory.entry.characterId`. Their first
 * lines are that one character's, so the chat's scene list leaves them out (`Scene.series`).
 */
const WORLD_SCENES: Scene[] = [
  {
    id: 'scene_world_seaside',
    title: 'Your first morning',
    setting: 'Your first morning at Seaside. You got lost on the way to your first lecture and ended up at the far end of the pier, where someone is climbing out of the sea.',
    userRole: 'A transfer student who arrived yesterday.',
    opening: '*pulls himself up onto the pier, dripping, and grins* You’re the new transfer, right? Lecture hall’s the other way. ...Want half a melon bread first?',
    official: true,
    series: 'Seaside Academy',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
  {
    id: 'scene_world_moonlit',
    title: 'The thread on your wrist',
    setting: 'A garden at the edge of the Moonlit Realm, in the ruins of an old temple. You have walked here from the lantern road with a silver thread on your wrist, and the moonflowers are opening as you pass.',
    userRole: 'A traveller bound by an oath they cannot remember.',
    opening: '*looks up from the moonflowers, then at the thread on your wrist, and goes very still* So it is you the oath chose. Sit. Before the Court’s riders find you, we should talk about what you promised.',
    official: true,
    series: 'Moonlit Realm',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
  {
    id: 'scene_world_neon',
    title: 'Your first day on the team',
    setting: 'Studio B at seven in the morning, your first day as co-manager of NEON TIDE. The members are asleep in a heap on the practice floor. Your new phone has not stopped buzzing.',
    userRole: 'NEON TIDE’s new co-manager.',
    opening: '*gets up quietly so he won’t wake the others, and holds out a coffee* You must be the new co-manager. I’m Ezra. Your phone’s about to tell you we have a problem. Drink that first.',
    official: true,
    series: 'NEON TIDE',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
  {
    id: 'scene_world_tidepool',
    title: 'The flat upstairs',
    setting: 'Tidepool Café at seven in the morning, the day you moved in upstairs. It smells of butter and coffee, and everyone at the counter has stopped talking to look at you.',
    userRole: 'The new tenant in the flat above the café.',
    opening: '*sets a cup down at the only empty stool without asking* You’re the one with the creaky floor. On the house, first day only. Now, what’s in the letter you’re holding? You look like it bit you.',
    official: true,
    series: 'Tidepool Café',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
  {
    id: 'scene_world_velvet',
    title: 'The safe house',
    setting: 'A flat over a shut-down jazz bar, in the rain, at two in the morning. The police brought you here an hour ago. There is one lamp, one chair and a man in a black half-mask checking the window.',
    userRole: 'A witness to what happened at the Orchid.',
    opening: '*doesn’t turn from the window* Away from the glass. There are three rules, and I’ll tell you them once. You can break any of them. I’ll still be here when you do.',
    official: true,
    series: 'Velvet District',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
  {
    id: 'scene_world_gilded',
    title: 'The first morning',
    setting: 'You wake in a bed the size of a small room, in someone else’s silk. You know this room from a novel you once read. A woman in grey is drawing the curtains, and has clearly been waiting to say something unpleasant.',
    userRole: 'The villainess of The Crown and the Rose, newly awake.',
    opening: '*sets down the tray without a sound* You slept past the hour again, my lady. The Prince is waiting, your father is furious, and you have made three people cry this week. Shall I bring the blue gown, or would you like to throw it first?',
    official: true,
    series: 'Gilded Empire',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
  {
    id: 'scene_world_arena',
    title: 'First day in the tunnel',
    setting: 'Your first morning at the arena, before the lights are fully on. The tunnel smells of ice and old coffee. The captain is sitting on your treatment table, taping his own hand, badly.',
    userRole: 'The Northgate Wolves’ new physio.',
    opening: '*doesn’t look up* You’re the new physio. You’re late. ...You’re not late, I got here at five. Don’t touch the tape.',
    official: true,
    series: 'Ice & Arena',
    createdAt: '2026-10-30T00:00:00.000Z',
  },
];

const ANY_FRIEND: Scene[] = [
  {
    id: 'scene_ferry',
    title: 'Night ferry',
    setting: 'The last ferry of the night crosses a calm, dark sea. The deck is empty except for the two of you, and the city lights fade behind.',
    userRole: 'A traveller who almost missed the boat.',
    opening: 'You made it. I was watching the gangway the whole time, you know.',
    official: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  },
  {
    id: 'scene_cabin',
    title: 'Snowed in',
    setting: "A mountain cabin, a storm outside, and the power just went out. There's a fire, a stack of blankets and nowhere to go until morning.",
    opening: "Well. Candles, a fire and no signal. Guess you're stuck with me.",
    official: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  },
  {
    id: 'scene_rooftop',
    title: 'Rooftop after the party',
    setting: "The party downstairs is still loud. Up on the roof it's quiet: warm air, fairy lights and the whole city below.",
    opening: 'You found my hiding spot. Sit, there is room for two.',
    official: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  },
  {
    id: 'scene_market',
    title: 'Lost at the night market',
    setting: "A night market in a city neither of you knows: lanterns, food stalls, music, and you've both lost the group.",
    opening: "Okay, don't panic. We're lost, but we're lost together. Dumplings first?",
    official: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  },
  {
    id: 'scene_lighthouse',
    title: 'Storm at the lighthouse',
    setting: 'A lighthouse on a cliff in a storm. The lamp has to stay lit until dawn, and the keeper left the two of you in charge.',
    opening: "Hand me that lantern. We've got a long night ahead.",
    official: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  },
  {
    id: 'scene_train',
    title: 'Sleeper train',
    setting: 'An overnight train rolls through the countryside. Your seats face each other and the cabin lights are low.',
    opening: "Six hours till the next station. Tell me something you've never told anyone.",
    official: true,
    createdAt: '2026-10-25T00:00:00.000Z',
  },
];

export const officialScenes: Scene[] = [...ANY_FRIEND, ...WORLD_SCENES];
