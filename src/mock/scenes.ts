import type { Scene } from '@/types';

/**
 * Scenes that come with the app, for any friend (official or the user's own). Later the server
 * sends these and can add scenes made for one world.
 */
export const officialScenes: Scene[] = [
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
