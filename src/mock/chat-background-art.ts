import type { ImageSourcePropType } from 'react-native';

type ChatArtBackground = {
  id: string;
  nameKey: string;
  image: ImageSourcePropType;
};

/** Original, user-selectable art wallpapers for any character conversation. */
export const chatArtBackgrounds: readonly ChatArtBackground[] = [
  {
    id: '01-soft-peach',
    nameKey: 'softPeach',
    image: require('../../assets/images/chat-wallpapers/01-soft-peach.jpg'),
  },
  {
    id: '02-plum-orbit',
    nameKey: 'plumOrbit',
    image: require('../../assets/images/chat-wallpapers/02-plum-orbit.jpg'),
  },
  {
    id: '03-midnight-moon',
    nameKey: 'midnightMoon',
    image: require('../../assets/images/chat-wallpapers/03-midnight-moon.jpg'),
  },
  {
    id: '04-ember-current',
    nameKey: 'emberCurrent',
    image: require('../../assets/images/chat-wallpapers/04-ember-current.jpg'),
  },
  {
    id: '05-rose-afterglow',
    nameKey: 'roseAfterglow',
    image: require('../../assets/images/chat-wallpapers/05-rose-afterglow.jpg'),
  },
  {
    id: '06-seaside-dusk',
    nameKey: 'seasideDusk',
    image: require('../../assets/images/chat-wallpapers/06-seaside-dusk.jpg'),
  },
  {
    id: '07-rainy-window',
    nameKey: 'rainyWindow',
    image: require('../../assets/images/chat-wallpapers/07-rainy-window.jpg'),
  },
  {
    id: '08-city-after-dark',
    nameKey: 'cityAfterDark',
    image: require('../../assets/images/chat-wallpapers/08-city-after-dark.jpg'),
  },
  {
    id: '09-moonlit-garden',
    nameKey: 'moonlitGarden',
    image: require('../../assets/images/chat-wallpapers/09-moonlit-garden.jpg'),
  },
  {
    id: '10-warm-room',
    nameKey: 'warmRoom',
    image: require('../../assets/images/chat-wallpapers/10-warm-room.jpg'),
  },
  {
    id: '11-confident-muse',
    nameKey: 'confidentMuse',
    image: require('../../assets/images/chat-wallpapers/11-confident-muse.jpg'),
  },
  {
    id: '12-two-muses',
    nameKey: 'twoMuses',
    image: require('../../assets/images/chat-wallpapers/12-two-muses.jpg'),
  },
  {
    id: '13-midnight-gentleman',
    nameKey: 'midnightGentleman',
    image: require('../../assets/images/chat-wallpapers/13-midnight-gentleman.jpg'),
  },
  {
    id: '14-aurora-drift',
    nameKey: 'auroraDrift',
    image: require('../../assets/images/chat-wallpapers/14-aurora-drift.jpg'),
  },
  {
    id: '15-golden-hour-muse',
    nameKey: 'goldenHourMuse',
    image: require('../../assets/images/chat-wallpapers/15-golden-hour-muse.jpg'),
  },
  {
    id: '16-quiet-artist',
    nameKey: 'quietArtist',
    image: require('../../assets/images/chat-wallpapers/16-quiet-artist.jpg'),
  },
  {
    id: '17-rainy-cafe',
    nameKey: 'rainyCafe',
    image: require('../../assets/images/chat-wallpapers/17-rainy-cafe.jpg'),
  },
  {
    id: '18-rooftop-poet',
    nameKey: 'rooftopPoet',
    image: require('../../assets/images/chat-wallpapers/18-rooftop-poet.jpg'),
  },
  {
    id: '19-moonlit-musician',
    nameKey: 'moonlitMusician',
    image: require('../../assets/images/chat-wallpapers/19-moonlit-musician.jpg'),
  },
  {
    id: '20-seaside-library',
    nameKey: 'seasideLibrary',
    image: require('../../assets/images/chat-wallpapers/20-seaside-library.jpg'),
  },
  {
    id: '21-ember-loft',
    nameKey: 'emberLoft',
    image: require('../../assets/images/chat-wallpapers/21-ember-loft.jpg'),
  },
  {
    id: '22-lavender-dream',
    nameKey: 'lavenderDream',
    image: require('../../assets/images/chat-wallpapers/22-lavender-dream.jpg'),
  },
  {
    id: '23-snow-window',
    nameKey: 'snowWindow',
    image: require('../../assets/images/chat-wallpapers/23-snow-window.jpg'),
  },
  {
    id: '24-velvet-jazz',
    nameKey: 'velvetJazz',
    image: require('../../assets/images/chat-wallpapers/24-velvet-jazz.jpg'),
  },
  {
    id: '25-moon-garden',
    nameKey: 'moonGarden',
    image: require('../../assets/images/chat-wallpapers/25-moon-garden.jpg'),
  },
  {
    id: '26-golden-hour-traveler',
    nameKey: 'goldenHourTraveler',
    image: require('../../assets/images/chat-wallpapers/26-golden-hour-traveler.jpg'),
  },
  {
    id: '27-neon-bookshop',
    nameKey: 'neonBookshop',
    image: require('../../assets/images/chat-wallpapers/27-neon-bookshop.jpg'),
  },
  {
    id: '28-desert-moonrise',
    nameKey: 'desertMoonrise',
    image: require('../../assets/images/chat-wallpapers/28-desert-moonrise.jpg'),
  },
  {
    id: '29-harbor-lights',
    nameKey: 'harborLights',
    image: require('../../assets/images/chat-wallpapers/29-harbor-lights.jpg'),
  },
  {
    id: '30-starlit-room',
    nameKey: 'starlitRoom',
    image: require('../../assets/images/chat-wallpapers/30-starlit-room.jpg'),
  },
];

export const chatArtBackgroundsById = Object.fromEntries(
  chatArtBackgrounds.map((background) => [background.id, background]),
) as Record<string, (typeof chatArtBackgrounds)[number]>;
