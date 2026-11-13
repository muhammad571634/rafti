import { Platform } from 'react-native';

import { apiBase } from '@/ai/server';
import i18n, { phrase } from '@/i18n';
import { allReachKeys, ideaCategory, ideasFor } from '@/lib/reply-ideas';

import { errorText } from './health';
import { MESSAGE_CHANNEL, MESSAGE_SOUND, hasMessageSound } from './incoming';
import { notificationsModule } from './native';
import { planPushes, type PlannedPush, type PlanState, type PushChannel } from './plan';
import { writtenCategory } from './written';
import type { ReplyIdea } from '@/types';

/**
 * Hands the planner's list to the OS (docs/push-plan.md). Since 0z189 the pushes are handed over
 * while the app is open (on coming back and after every change that matters, `use-push-notifications`):
 * on Android every expo-notifications call is a broadcast to the app itself, and a backgrounded app is
 * frozen within moments, so a hand-over started on the way out never finished (seen on the A51: a
 * whole evening with nothing scheduled). A push that comes due while the app is open is not shown:
 * its line lands in the chat at that moment instead (`runTimers` → `landDuePushes`). Where
 * notifications are not available (web, Android Expo Go) every call is a no-op.
 */

/** iOS keeps at most 64 pending notifications per app; stay under it. */
const MAX_PENDING = 60;
/** Test pushes (`sendTestPushes`) carry this id prefix; planning leaves them alone. */
const TEST_PREFIX = 'test:';
/** Wake-up alarm rings (`alarms.ts`) are owned there and never cleared here. */
const ALARM_PREFIX = 'alarm:';
const TEST_FIRST_MS = 5_000;
const TEST_STEP_MS = 8_000;
const TEST_MAX = 10;

const CHANNELS: Record<PushChannel, { name: string; importance: 'HIGH' | 'MAX' | 'DEFAULT' }> = {
  messages: { name: 'push.channels.messages', importance: 'HIGH' },
  calls: { name: 'push.channels.calls', importance: 'MAX' },
  reminders: { name: 'push.channels.reminders', importance: 'HIGH' },
  gifts: { name: 'push.channels.gifts', importance: 'DEFAULT' },
};

/** What a push carries back to the app when it is tapped or seen. */
export interface PushData {
  id: string;
  /** `alarm`: a wake-up alarm ring (`src/notifications/alarms.ts`); `live`: a message that just came (`incoming.ts`). */
  kind: PlannedPush['kind'] | 'alarm' | 'live';
  route: string;
  characterId?: string;
  line?: string;
  writesToChat?: boolean;
  at: string;
  /** A test push from the dev button: shown even while the app is open. */
  test?: boolean;
  /** Why they wrote first; its reply ideas are the push's buttons (`IDEA_ACTION` + intent). */
  reach?: string;
  /** Replies the model wrote for this push; they take the buttons (`WRITTEN_ACTION` + place). */
  ideas?: ReplyIdea[];
}

/** A reply idea's button on a push: `idea_` and the idea's intent. */
export const IDEA_ACTION = 'idea_';
/** A written reply's button on a push: `written_` and its place in `PushData.ideas`. */
export const WRITTEN_ACTION = 'written_';
/** The typed reply on a push (iOS text input action, Android RemoteInput). */
export const REPLY_ACTION = 'reply_text';
/** The action set of a friend's push that carries no ideas: just the typed reply. */
const CHAT_CATEGORY = 'chat_reply';
/** Android shows at most three actions: two ideas and the typed reply. iOS shows four. */
const IDEA_BUTTONS = Platform.OS === 'android' ? 2 : 3;

let configured = false;

/** Once per launch: how pushes behave while the app is open, and the Android channels. */
export async function configurePushes() {
  const N = notificationsModule();
  if (!N || configured) return;
  configured = true;
  // Anything due while the app is open is already happening inside it (its line lands in the chat):
  // no banner, no sound, nothing left in the tray. Test pushes exist to be seen, and a wake-up alarm
  // rings even with the app open.
  N.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as unknown as PushData | undefined;
      const loud = data?.test === true || data?.kind === 'alarm';
      return { shouldPlaySound: loud, shouldSetBadge: false, shouldShowBanner: loud, shouldShowList: loud };
    },
  });
  if (Platform.OS === 'android') {
    await Promise.all(
      (Object.keys(CHANNELS) as PushChannel[]).map((id) =>
        N.setNotificationChannelAsync(channelOf(id), {
          name: i18n.t(CHANNELS[id].name),
          importance: N.AndroidImportance[CHANNELS[id].importance],
          vibrationPattern: [0, 250, 200, 250],
          // Friends' messages ring with our own sound where the APK carries it (`incoming.ts`).
          ...(id === 'messages' && hasMessageSound ? { sound: MESSAGE_SOUND } : {}),
        }),
      ),
    );
    // The old messages channel (default sound) goes once ours exists: one "Messages" in Settings.
    if (hasMessageSound) await N.deleteNotificationChannelAsync('messages').catch(() => {});
  }
  // A friend's push answers like a text: reply ideas as buttons ("I ate!") and a typed reply, from
  // the lock screen. Best effort: where categories are missing the push still comes, without them.
  const reply = replyButton();
  try {
    await Promise.all([
      N.setNotificationCategoryAsync(CHAT_CATEGORY, [reply]),
      ...allReachKeys().map((reach) =>
        N.setNotificationCategoryAsync(ideaCategory(reach), [
          ...ideasFor(reach)
            .slice(0, IDEA_BUTTONS)
            .map((idea) => ({
              identifier: `${IDEA_ACTION}${idea.intent}`,
              buttonTitle: phrase(idea.label),
              options: { opensAppToForeground: true },
            })),
          reply,
        ]),
      ),
    ]);
  } catch {
    // No buttons here; the push itself still works.
  }
}

function replyButton() {
  return {
    identifier: REPLY_ACTION,
    buttonTitle: i18n.t('push.reply'),
    textInput: { submitButtonTitle: i18n.t('push.send'), placeholder: i18n.t('push.replyPlaceholder') },
    options: { opensAppToForeground: true },
  };
}

/** The written buttons last handed over, so an unchanged set is not set again on every re-plan. */
let categoriesSet = '';

/** The buttons the model wrote are this plan's alone: each gets its action set, and old sets go. Best effort, as above. */
async function syncWrittenCategories(plan: readonly PlannedPush[]) {
  const N = notificationsModule()!;
  const written = plan.filter((push) => push.ideas?.length);
  const key = written.map((push) => `${push.id}:${push.ideas!.map((idea) => idea.label).join(',')}`).join('|');
  if (key === categoriesSet) return;
  categoriesSet = key;
  const keep = new Set(written.map((push) => writtenCategory(push.id)));
  try {
    const old = await N.getNotificationCategoriesAsync();
    await Promise.all(
      old
        .filter((category) => category.identifier.startsWith(WRITTEN_ACTION) && !keep.has(category.identifier))
        .map((category) => N.deleteNotificationCategoryAsync(category.identifier)),
    );
    await Promise.all(
      written.map((push) =>
        N.setNotificationCategoryAsync(writtenCategory(push.id), [
          ...push.ideas!.slice(0, IDEA_BUTTONS).map((idea, i) => ({
            identifier: `${WRITTEN_ACTION}${i}`,
            buttonTitle: idea.label,
            options: { opensAppToForeground: true },
          })),
          replyButton(),
        ]),
      ),
    );
  } catch {
    // No buttons here; the push itself still works.
  }
}

/** `unsupported`: web or Android Expo Go, where the app runs without pushes. */
export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function pushPermission(): Promise<PushPermission> {
  const N = notificationsModule();
  if (!N) return 'unsupported';
  if (await pushesAllowed()) return 'granted';
  const { status } = await N.getPermissionsAsync();
  return status === N.PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied';
}

export async function pushesAllowed() {
  const N = notificationsModule();
  if (!N) return false;
  const { granted, ios } = await N.getPermissionsAsync();
  return granted || ios?.status === N.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * For people who said yes in the app before the system prompt existed (onboarded on an
 * older build): ask once, only if the system never asked.
 */
export async function askIfNeverAsked(saidYesInApp: boolean) {
  const N = notificationsModule();
  if (!N || !saidYesInApp) return;
  const { status, canAskAgain } = await N.getPermissionsAsync();
  if (status === N.PermissionStatus.UNDETERMINED && canAskAgain) await requestPushPermission();
}

/** The system prompt. Call it from a screen whose one button opens it (HIG Privacy, pre-alert screens). */
export async function requestPushPermission() {
  const N = notificationsModule();
  if (!N) return false;
  await configurePushes();
  const { granted } = await N.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return granted;
}

/** A planned push (not a test push, not an alarm ring, not a live banner), which planning owns. */
const plannedId = (identifier: string) => !identifier.startsWith(TEST_PREFIX) && !identifier.startsWith(ALARM_PREFIX) && !identifier.startsWith('live:');

/**
 * What each pending push was handed over as (its time and words), so a re-plan only touches the
 * pushes that changed: the app re-plans after every change that matters while it is open, and each
 * OS call costs a round trip. Empty after a restart, when everything is handed over once again.
 */
const handedOver = new Map<string, string>();
const signature = (push: PlannedPush, preview: boolean) => [push.at.getTime(), push.title, bodyFor(push, preview), categoryFor(push) ?? '', push.channel].join('|');

let queue: Promise<unknown> = Promise.resolve();
/** The longest one hand-over holds the next back: an OS call that never answers must not stop all later ones. */
const TURN_LIMIT_MS = 15_000;
/**
 * One hand-over to the OS at a time (0z189): leaving and coming back a second apart used to run their
 * cancels and schedules into each other, so the one that finished last could wipe the other's pushes.
 */
export function serially<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = Promise.race([run.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, TURN_LIMIT_MS))]);
  return run;
}

/** What a sync handed over: the plan, the pushes the OS took, and the first that it refused. */
export interface SyncResult {
  plan: PlannedPush[];
  scheduled: PlannedPush[];
  error?: string;
}

/** An OS call that never answers must not hold the pushes back. */
const BUTTONS_WAIT_MS = 3_000;

/**
 * Re-plans from the current state and brings the pending pushes in line with it, or null when pushes
 * are off: what is no longer planned is cancelled, what is new or changed is scheduled (under its own
 * id, which replaces the old one), and what is unchanged is left alone. Each push is handed over on
 * its own (one the OS refuses no longer loses the rest), and only the ones the OS holds count: the
 * caller keeps them as the outbox and the day's log. The model's buttons go after, with a time limit,
 * since a push without its buttons is better than no push. `step` names where it is, for the record.
 */
export async function syncPushes(state: PlanState, now = new Date(), step: (name: string) => void = () => {}): Promise<SyncResult | null> {
  step('permission');
  if (!(await pushesAllowed())) return null;
  step('configure');
  await configurePushes();
  const N = notificationsModule()!;
  step('pending');
  const pending = await N.getAllScheduledNotificationsAsync();
  const pendingIds = new Set(pending.map((n) => n.identifier));
  // Alarm rings share iOS's 64 pending notifications; the planner takes what is left.
  const alarms = pending.filter((n) => n.identifier.startsWith(ALARM_PREFIX)).length;
  step('plan');
  const preview = state.settings.notificationPreview;
  const plan = planPushes(state, now, { model: !!state.settings.realAi && !!apiBase() }).slice(0, Math.max(0, MAX_PENDING - alarms));
  const keep = new Set(plan.map((push) => push.id));
  step('cancel');
  const gone = pending.filter((n) => plannedId(n.identifier) && !keep.has(n.identifier)).map((n) => n.identifier);
  await Promise.allSettled(gone.map((id) => N.cancelScheduledNotificationAsync(id)));
  gone.forEach((id) => handedOver.delete(id));
  const fresh = plan.filter((push) => !pendingIds.has(push.id) || handedOver.get(push.id) !== signature(push, preview));
  step(`schedule ${fresh.length}/${plan.length}`);
  const results = await Promise.allSettled(fresh.map((push) => schedule(push, push.id, push.at, preview)));
  const refusedIds = new Set<string>();
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') handedOver.set(fresh[i].id, signature(fresh[i], preview));
    else refusedIds.add(fresh[i].id);
  });
  const scheduled = plan.filter((push) => !refusedIds.has(push.id));
  const refused = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  step('buttons');
  await Promise.race([syncWrittenCategories(plan), new Promise((resolve) => setTimeout(resolve, BUTTONS_WAIT_MS))]);
  return { plan, scheduled, ...(refused ? { error: errorText(refused.reason) } : {}) };
}

/**
 * Dev button: the pushes the planner would send, one of each kind, a few seconds apart
 * and with their text shown, so a phone can be checked without waiting for 08:00.
 * Returns how many were scheduled; 0 when notifications are unavailable or not allowed.
 */
export async function sendTestPushes(state: PlanState, now = new Date()): Promise<number> {
  const N = notificationsModule();
  if (!N) return 0;
  if (!(await pushesAllowed()) && !(await requestPushPermission())) return 0;
  await configurePushes();

  const seen = new Set<string>();
  const sample = planPushes(state, now)
    .filter((push) => !seen.has(push.kind) && seen.add(push.kind))
    .slice(0, TEST_MAX);
  await Promise.all(
    sample.map((push, i) =>
      schedule(push, `${TEST_PREFIX}${push.id}`, new Date(now.getTime() + TEST_FIRST_MS + i * TEST_STEP_MS), true, true),
    ),
  );
  return sample.length;
}

function schedule(push: PlannedPush, identifier: string, at: Date, preview: boolean, test = false) {
  const N = notificationsModule()!;
  const data: PushData = {
    id: push.id,
    kind: push.kind,
    route: push.route,
    characterId: push.characterId,
    line: push.line,
    writesToChat: push.writesToChat,
    at: at.toISOString(),
    test: test || undefined,
    reach: push.reach,
    ideas: push.ideas,
  };
  return N.scheduleNotificationAsync({
    identifier,
    content: {
      title: push.title ?? 'Sigmazam',
      body: bodyFor(push, preview),
      data: data as unknown as Record<string, unknown>,
      sound: push.channel === 'messages' ? MESSAGE_SOUND : 'default',
      interruptionLevel: push.timeSensitive ? 'timeSensitive' : 'active',
      categoryIdentifier: categoryFor(push),
      // One friend's texts stack together, as a person's messages do (iOS thread, Android group).
      threadIdentifier: push.characterId ? `friend_${push.characterId}` : undefined,
    },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: channelOf(push.channel) },
  });
}

/** The Android channel a planned push goes to: friends' messages share the live banners' channel. */
const channelOf = (channel: PushChannel) => (channel === 'messages' ? MESSAGE_CHANNEL : channel);

/** A push that opens a friend's chat can be answered from the lock screen. */
function categoryFor(push: PlannedPush) {
  if (push.ideas?.length) return writtenCategory(push.id);
  if (push.reach && ideasFor(push.reach).length) return ideaCategory(push.reach);
  return push.characterId && push.route.startsWith('/chat/') && push.kind !== 'call' ? CHAT_CATEGORY : undefined;
}

/** What they said, as a text shows it; hidden only when the user turned previews off in Profile. */
function bodyFor(push: PlannedPush, preview: boolean) {
  if (push.textKey === 'push.voiceNote') return preview ? `🎤 ${i18n.t('push.voiceMessage')}` : i18n.t(push.textKey);
  if (push.textKey) return i18n.t(push.textKey, push.textParams);
  if (!preview || !push.line) return i18n.t('push.hidden');
  return push.line;
}

/** Pushes still in the tray: lines that were only sent as a push get written into the chat. */
export async function deliveredPushes(): Promise<PushData[]> {
  const N = notificationsModule();
  if (!N) return [];
  const presented = await N.getPresentedNotificationsAsync();
  return presented.map((n) => n.request.content.data as unknown as PushData).filter((d) => !!d?.id);
}
