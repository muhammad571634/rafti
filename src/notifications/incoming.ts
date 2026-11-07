import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Updates from 'expo-updates';
import { AppState, Platform } from 'react-native';

import i18n from '@/i18n';
import type { AppSettings } from '@/types';

import { notificationsModule } from './native';
import { inQuietHours } from './plan';

/**
 * A friend's message that lands while its chat is not on screen (owner, 2026-11-07): the app plays
 * our own short sound (`assets/sounds/message.wav`, two soft tines a fifth apart) when it is open
 * on another screen, and posts a banner at the top, as Telegram does, when it is in the background.
 * It goes with the red unread count: only a message that adds to it announces itself.
 *
 * A reply that comes in several bubbles is one announcement: the sound plays on the first and rests
 * for `SOUND_REST_MS`; the banner waits until the bubbles stop (`BANNER_SETTLE_MS`) and shows the
 * last. Quiet hours keep both quiet (messages wait for the morning, as the planned pushes do).
 */

export interface Incoming {
  conversationId: string;
  /** The friend's name (or the group's name). */
  title: string;
  /** What they wrote, as the chat list previews it. */
  body: string;
  /** Where a tap on the banner leads. */
  route: string;
  characterId?: string;
  /** When the message was written; an old one landing now (a push line) does not ring. */
  createdAt: string;
}

const SOUND_REST_MS = 6_000;
const BANNER_SETTLE_MS = 2_000;
/** A message older than this when it lands was already announced (a push line coming into the chat). */
const FRESH_MS = 60_000;
/** The banner's id: one per chat, so a newer message takes the old one's place. */
const LIVE_PREFIX = 'live:';

/**
 * The APK carries the sound for banners only from 1.2.0 (`app.json` → expo-notifications `sounds`);
 * a channel naming a sound the APK lacks would stay wrong for good (Android channels cannot change),
 * so older builds keep the plain `messages` channel and the default sound.
 */
const SOUND_FROM_RUNTIME = [1, 2, 0];
const newer = (version: string | null | undefined, from: number[]) => {
  if (!version) return false;
  const parts = version.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < from.length; i++) {
    if ((parts[i] ?? 0) !== from[i]) return (parts[i] ?? 0) > from[i];
  }
  return true;
};
export const hasMessageSound = newer(Updates.runtimeVersion, SOUND_FROM_RUNTIME);

/** The Android channel friends' messages use: `chat` (our sound) on new builds, `messages` before. */
export const MESSAGE_CHANNEL = hasMessageSound ? 'chat' : 'messages';
/** The sound a friend's message plays in a banner (iOS bundle file / Android raw resource). */
export const MESSAGE_SOUND = hasMessageSound ? 'message.wav' : 'default';

let player: AudioPlayer | null = null;
let lastSound = 0;
const banners = new Map<string, ReturnType<typeof setTimeout>>();

function chime() {
  const now = Date.now();
  if (now - lastSound < SOUND_REST_MS) return;
  lastSound = now;
  try {
    player ??= createAudioPlayer(require('@/assets/sounds/message.wav'));
    player.volume = 0.6;
    void player.seekTo(0).then(() => player?.play());
  } catch {
    // No sound here (web); the unread count still says it.
  }
}

async function banner(message: Incoming, preview: boolean) {
  const N = notificationsModule();
  if (!N) return;
  const { granted } = await N.getPermissionsAsync();
  if (!granted) return;
  await N.scheduleNotificationAsync({
    identifier: `${LIVE_PREFIX}${message.conversationId}`,
    content: {
      title: message.title,
      body: preview ? message.body : i18n.t('push.hidden'),
      data: { id: `${LIVE_PREFIX}${message.conversationId}`, kind: 'live', route: message.route, characterId: message.characterId, at: message.createdAt },
      sound: MESSAGE_SOUND,
      threadIdentifier: message.characterId ? `friend_${message.characterId}` : undefined,
    },
    trigger: Platform.OS === 'android' ? { channelId: MESSAGE_CHANNEL } : null,
  });
}

/** A friend's message added to the unread count: a sound in the app, a banner outside it. */
export function announceIncoming(message: Incoming, settings: AppSettings, muted: boolean) {
  if (muted || !settings.messageSound) return;
  const now = new Date();
  if (now.getTime() - Date.parse(message.createdAt) > FRESH_MS) return;
  if (inQuietHours(settings, now)) return;
  if (AppState.currentState === 'active') {
    chime();
    return;
  }
  // Several bubbles of one reply: one banner, with the last of them.
  clearTimeout(banners.get(message.conversationId));
  banners.set(
    message.conversationId,
    setTimeout(() => {
      banners.delete(message.conversationId);
      void banner(message, settings.notificationPreview).catch(() => {});
    }, BANNER_SETTLE_MS),
  );
}

/** Back in the app: the banners of messages now on screen go, as Telegram clears them. */
export async function clearLiveBanners() {
  const N = notificationsModule();
  if (!N) return;
  const shown = await N.getPresentedNotificationsAsync();
  await Promise.all(shown.filter((n) => n.request.identifier.startsWith(LIVE_PREFIX)).map((n) => N.dismissNotificationAsync(n.request.identifier)));
}
