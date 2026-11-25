/**
 * The alarms and wake-up slice of the app store: the Alarms editor, the friend told in their chat
 * (0z135, 0z139), the ring, snooze and the morning chain's clock. Split out of `use-app-store.ts`
 * (0z352, app audit P1-6); the persisted shape is unchanged. The chat helpers it calls come in as
 * `deps`, so this file imports nothing from the store at runtime.
 */
import type { AppState, appendMessage, genderOf, sayFirst, setupCancelled, setupInChat, setupRemoved } from './use-app-store';
import type { Getter, RawSetter } from './slice-types';
import { uid } from './ids';
import i18n from '@/i18n';
import { alarmSetCue, wakeCheckInCue } from '@/ai/moment-prompt';
import { SNOOZE_MIN, dueRing } from '@/lib/alarms';
import { CHAIN_LINES, MAX_SNOOZES, WAKE_WINDOW_MIN, wakeQuestion } from '@/lib/morning-chain';
import { dayKey, planAddedLine, todayKey } from '@/mock';
import type { Alarm, SetupOffer, WakeSession } from '@/types';

/** An alarm's days for the friend's cue (`alarmSetCue`): "every day", "weekdays", "once"… */
function alarmDaysWord(repeat: readonly number[]) {
  const days = [...new Set(repeat)].sort();
  if (!days.length) return 'once';
  if (days.length === 7) return 'every day';
  if (days.join() === '1,2,3,4,5') return 'on weekdays';
  if (days.join() === '0,6') return 'on weekends';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `on ${days.map((d) => names[d]).join(', ')}`;
}

/** An alarm as a setup card: its time, its days, and the day it rings next. */
function alarmOffer(alarm: Pick<Alarm, 'hour' | 'minute' | 'repeat' | 'label'>): SetupOffer {
  const now = new Date();
  const at = new Date(now);
  at.setHours(alarm.hour, alarm.minute, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  const time = `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
  return { kind: 'alarm', title: alarm.label.trim(), date: dayKey(at), time, repeat: [...alarm.repeat] };
}

export interface AlarmDeps {
  setupInChat: typeof setupInChat;
  setupCancelled: typeof setupCancelled;
  setupRemoved: typeof setupRemoved;
  sayFirst: typeof sayFirst;
  appendMessage: typeof appendMessage;
  genderOf: typeof genderOf;
}

type AlarmActions = Pick<AppState, 'saveAlarm' | 'deleteAlarm' | 'setAlarmEnabled' | 'ringAlarm' | 'snoozeWake' | 'stopWake' | 'wakeTick'>;

/** The slice, made once with the store's chat helpers. */
export function createAlarms(deps: AlarmDeps) {
  const { setupInChat, setupCancelled, setupRemoved, sayFirst, appendMessage, genderOf } = deps;

  const actions = (set: RawSetter, get: Getter): AlarmActions => ({
    saveAlarm: ({ id, ...fields }, opts) => {
      const existing = id ? get().alarms.find((a) => a.id === id) : undefined;
      // The friend who wakes them hears about it in their chat, as with a plan (0z135): on a new
      // alarm, or when the time, the days or the friend changed, not on a label or sound edit.
      const waker = fields.characterId;
      const told =
        !!waker &&
        get().characters.some((c) => c.id === waker) &&
        (!existing ||
          existing.characterId !== waker ||
          existing.hour !== fields.hour ||
          existing.minute !== fields.minute ||
          existing.repeat.join() !== fields.repeat.join());
      let savedId: string;
      if (existing) {
        const armedAt = new Date().toISOString();
        set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, ...fields, enabled: true, armedAt } : a)) }));
        savedId = existing.id;
      } else {
        const now = new Date().toISOString();
        const alarm: Alarm = { ...fields, id: uid('alarm'), enabled: true, createdAt: now, armedAt: now };
        set((s) => ({ alarms: [...s.alarms, alarm] }));
        savedId = alarm.id;
      }
      if (told && waker && !opts?.quiet) {
        const at = `${String(fields.hour).padStart(2, '0')}:${String(fields.minute).padStart(2, '0')}`;
        const days = alarmDaysWord(fields.repeat);
        const title = fields.label.trim() || i18n.t('home.widget.wakeUp');
        // The card first, on their side; then the friend's word under it (0z139).
        const conversationId = setupInChat(set, get, waker, alarmOffer(fields), savedId);
        sayFirst(set, get, conversationId, planAddedLine(title, at, genderOf(get(), waker)), alarmSetCue(at, days));
      }
      return savedId;
    },
    deleteAlarm: (id, opts) => {
      const alarm = get().alarms.find((a) => a.id === id);
      set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id), messages: setupRemoved(s.messages, id) }));
      // A wake-up still to come, with a friend: they see it is off and ask what changed (0z139).
      if (!opts?.quiet && alarm?.enabled && alarm.characterId && get().characters.some((c) => c.id === alarm.characterId)) {
        const at = `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
        setupCancelled(set, get, alarm.characterId, alarmOffer(alarm), id, `${at} ${alarmDaysWord(alarm.repeat)}`);
      }
    },
    setAlarmEnabled: (id, enabled) =>
      set((s) => ({
        alarms: s.alarms.map((a) =>
          a.id === id ? { ...a, enabled, armedAt: enabled ? new Date().toISOString() : a.armedAt } : a,
        ),
      })),

    ringAlarm: (alarmId) => {
      const alarm = get().alarms.find((a) => a.id === alarmId);
      if (!alarm) return null;
      const now = new Date();
      const current = get().wake;
      // The same ring seen twice (the clock and a notification tap) stays one session. A ring
      // after the alarm was set again (new time, switched back on) is a new one: ringing sets
      // `armedAt` to `rangAt`, so only a later save moves it past the session.
      if (
        current?.alarmId === alarmId &&
        (!alarm.armedAt || Date.parse(current.rangAt) >= Date.parse(alarm.armedAt)) &&
        now.getTime() - Date.parse(current.rangAt) < WAKE_WINDOW_MIN * 60_000
      ) {
        return current;
      }
      const friend = alarm.characterId ? get().characters.find((c) => c.id === alarm.characterId) : undefined;
      const conversation = friend ? get().conversations.find((c) => c.characterId === friend.id) : undefined;
      // Today's plan with that friend makes the question about it ("Exam at 10 today. Ready?").
      const todayPlan = get().schedules.find(
        (p) => p.date === todayKey() && (!friend || p.characterId === friend.id) && !p.followedUp,
      );
      const question = wakeQuestion(now.getDate() + alarm.minute, todayPlan && { title: todayPlan.title, time: todayPlan.time }, friend?.gender);
      const session: WakeSession = {
        alarmId,
        characterId: friend?.id,
        conversationId: conversation?.id,
        replyToWake: alarm.replyToWake && !!conversation,
        question,
        rangAt: now.toISOString(),
        state: 'ringing',
        snoozes: 0,
      };
      set((s) => ({
        wake: session,
        // A one-time alarm switches itself off once it has rung, as on the iPhone.
        alarms: s.alarms.map((a) =>
          a.id === alarmId ? { ...a, armedAt: now.toISOString(), enabled: a.repeat.length > 0 ? a.enabled : false } : a,
        ),
      }));
      if (conversation && friend) {
        // The recorded wake-up line (free voice lines, backend-plan §13.5): never charged.
        const voice = alarm.voice && friend.voiceReady;
        appendMessage(set, get, conversation.id, {
          id: uid('m'),
          conversationId: conversation.id,
          author: 'them',
          kind: voice ? 'voice' : 'text',
          text: voice ? undefined : question,
          transcript: voice ? question : undefined,
          durationSec: voice ? 4 : undefined,
          createdAt: now.toISOString(),
        });
      }
      return session;
    },

    snoozeWake: () => {
      const wake = get().wake;
      if (!wake || wake.state !== 'ringing' || wake.snoozes >= MAX_SNOOZES) return;
      const alarm = get().alarms.find((a) => a.id === wake.alarmId);
      if (alarm && !alarm.snooze) return;
      set({
        wake: { ...wake, state: 'snoozed', snoozes: wake.snoozes + 1, snoozeUntil: new Date(Date.now() + SNOOZE_MIN * 60_000).toISOString() },
      });
    },

    stopWake: () => set({ wake: null }),

    wakeTick: () => {
      const now = new Date();
      const t = now.getTime();
      const { alarms, wake } = get();
      const busy = wake && wake.state !== 'awake';
      if (!busy) {
        const due = alarms.find((a) => a.enabled && dueRing(a, now));
        if (due) {
          get().ringAlarm(due.id);
          return 'ring';
        }
      }
      if (!wake) return null;
      if (wake.state === 'snoozed' && wake.snoozeUntil && Date.parse(wake.snoozeUntil) <= t) {
        set({ wake: { ...wake, state: 'ringing', snoozeUntil: undefined } });
        return 'ring';
      }
      if (wake.checkInAt && Date.parse(wake.checkInAt) <= t && wake.conversationId) {
        sayFirst(set, get, wake.conversationId, CHAIN_LINES.checkIn(genderOf(get(), wake.characterId)), wakeCheckInCue());
        set((s) => ({ wake: s.wake ? { ...s.wake, checkInAt: undefined } : null }));
        return null;
      }
      // A finished morning ends when its window closes; a ring nobody answered gives up after two.
      const since = Date.parse(wake.awakeAt ?? wake.rangAt);
      const window = WAKE_WINDOW_MIN * 60_000;
      if ((wake.state === 'awake' && !wake.checkInAt && t - since > window) || (wake.state === 'ringing' && t - since > window * 2)) {
        set({ wake: null });
      }
      return null;
    },
  });

  return { actions };
}
