import type { Ionicons } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

import { systemColors } from '@/theme';
import type { Scene } from '@/types';

export type SceneLook = { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string };

/** Each of the app's scenes keeps one glyph and iOS hue, as Settings' rows do (never orange). */
const SCENE_LOOK: Record<string, SceneLook> = {
  scene_ferry: { ios: 'ferry.fill', icon: 'boat', fill: systemColors.blue },
  scene_cabin: { ios: 'snowflake', icon: 'snow', fill: systemColors.cyan },
  scene_rooftop: { ios: 'building.2.fill', icon: 'business', fill: systemColors.purple },
  scene_market: { ios: 'takeoutbag.and.cup.and.straw.fill', icon: 'fast-food', fill: systemColors.red },
  scene_lighthouse: { ios: 'cloud.bolt.rain.fill', icon: 'thunderstorm', fill: systemColors.indigo },
  scene_train: { ios: 'tram.fill', icon: 'train', fill: systemColors.green },
};
/** The user's own scenes, and the moments a friend wrote. */
const OWN_LOOK: SceneLook = { ios: 'theatermasks.fill', icon: 'film', fill: systemColors.teal };

/** A scene's glyph and hue, the same in the chat's scene list and on a friend's page. */
export const sceneLook = (scene: Pick<Scene, 'id'>): SceneLook => SCENE_LOOK[scene.id] ?? OWN_LOOK;
