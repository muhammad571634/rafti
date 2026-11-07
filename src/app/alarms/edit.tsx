import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NIGHT_WHEEL } from '@/components/alarms/night';
import { TimeWheel } from '@/components/alarms/time-wheel';
import { useRadioClips } from '@/components/radio/use-clips';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CharacterAvatar, PressableScale, ShellIcon, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { ALARM_SOUNDS, nextAlarmAt } from '@/lib/alarms';
import { weekdayNames } from '@/lib/calendar';
import { haptic } from '@/lib/haptics';
import { allowAlarms } from '@/notifications/alarms';
import { alarmSetupCost, useAppStore } from '@/store/use-app-store';
import { fonts, radius, sleepColors as night, space, systemColors, type } from '@/theme';
import type { Alarm, AlarmSound, Character } from '@/types';

type Page = 'main' | 'sound';
type Draft = Omit<Alarm, 'id' | 'createdAt' | 'enabled'>;

/** The friend you picked is big, the others wait beside them (owner-approved prototype, 0z137). */
const FACE_ON = 84;
const FACE = 56;
const STEP_MIN = 15;
const DEFAULT_HOUR = 7;
/** The ring's padding and border around a face; its radius is set in numbers (Android draws 999 square). */
const RING_PAD = 3;
const RING_BORDER = 3;
/** How long the "set" moment stays before the sheet closes by itself. */
const SET_MOMENT_MS = 2600;

/**
 * Add or edit a wake-up alarm, readable at a glance (owner, 2026-11-07: "make the alarm easy to
 * understand"; approved prototype https://claude.ai/artifact/87mvHSpxDrzw92sQNrbyED). On Bedtime's
 * navy: who wakes you as a row of faces, a big time (tap for the wheel, -/+ a quarter of an hour)
 * with how long until it rings, the seven days on the screen, Voice / Reply / Snooze as three
 * tiles, Sound and Label, and one big button with its price. A new one ends on a short "set"
 * moment: their face and the time.
 */
export default function AlarmEditScreen() {
  const friendName = useFriendName();
  // `characterId` and `clipId` come from a Radio clip's "Wake me with this".
  const { id, characterId: fromClipFriend, clipId: fromClip } = useLocalSearchParams<{ id?: string; characterId?: string; clipId?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const { gifts, mine } = useRadioClips();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = useAppStore((s) => (editId ? s.alarms.find((a) => a.id === editId) : undefined));
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const saveAlarm = useAppStore((s) => s.saveAlarm);
  const alarms = useAppStore((s) => s.alarms);
  const wallet = useAppStore((s) => s.wallet);
  const spendShells = useAppStore((s) => s.spendShells);
  const deleteAlarm = useAppStore((s) => s.deleteAlarm);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [wheel, setWheel] = useState(false);
  const [setMoment, setSetMoment] = useState(false);
  const h12 = uses12Hour();

  // Friends, the one you talked with last first.
  const friends = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
        .map((c) => characters.find((ch) => ch.id === c.characterId))
        .filter((c): c is Character => !!c && !blockedIds.includes(c.id)),
    [conversations, characters, blockedIds],
  );

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, enabled: _e, ...rest } = existing;
      return rest;
    }
    const clipFriend = fromClip ? friends.find((f) => f.id === fromClipFriend) : undefined;
    const friend = clipFriend ?? friends.find((f) => f.voiceReady) ?? friends[0];
    return {
      // A wake-up starts at a morning hour, not at whatever the clock says now ("in 23 h 59 min").
      hour: DEFAULT_HOUR,
      minute: 0,
      repeat: [],
      label: '',
      characterId: friend?.id,
      voice: !!clipFriend || !!friend?.voiceReady,
      clipId: clipFriend ? fromClip : undefined,
      sound: 'morningTide',
      replyToWake: !!friend,
      snooze: true,
    };
  });
  const [page, setPage] = useState<Page>('main');

  const friend = characters.find((c) => c.id === draft.characterId);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  // The friend's clips that can wake the user: the ones they made with them, and open gifts.
  const friendClips = [...mine, ...gifts].filter((c) => !c.locked && c.character.id === draft.characterId);
  const wakeClip = draft.voice ? friendClips.find((c) => c.id === draft.clipId) : undefined;

  const pick = (c: Character | undefined) => {
    haptic.selection();
    if (!c) return set({ characterId: undefined, voice: false, clipId: undefined, replyToWake: false });
    set({ characterId: c.id, voice: c.voiceReady, clipId: undefined, replyToWake: draft.characterId ? draft.replyToWake : true });
  };
  const step = (by: number) => {
    haptic.selection();
    const total = (draft.hour * 60 + draft.minute + by + 24 * 60) % (24 * 60);
    set({ hour: Math.floor(total / 60), minute: total % 60 });
  };
  const toggleDay = (day: number) => {
    haptic.selection();
    setDraft((d) => ({ ...d, repeat: d.repeat.includes(day) ? d.repeat.filter((x) => x !== day) : [...d.repeat, day].sort() }));
  };

  // Opened from a link there is nothing to go back to: land on the list instead.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/alarms'));

  // A friend who wakes you costs what the wake-up talk costs (`alarmSetupCost`), as from the chat.
  const cost = alarmSetupCost(alarms, draft, existing?.id);
  const save = () => {
    if (cost && wallet.shells < cost) return setPaywall(cost);
    saveAlarm({ ...draft, id: existing?.id });
    if (cost && draft.characterId) spendShells(cost, 'setup', draft.characterId);
    // The first alarm asks for notifications; where they cannot run the list still works.
    void allowAlarms();
    haptic.success();
    // A new alarm ends on its moment; an edit just closes.
    if (existing) close();
    else setSetMoment(true);
  };
  useEffect(() => {
    if (!setMoment) return;
    const timer = setTimeout(close, SET_MOMENT_MS);
    return () => clearTimeout(timer);
    // `close` is stable for this screen's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMoment]);

  const remove = () => {
    if (existing) deleteAlarm(existing.id);
    close();
  };

  const shown = alarmTime(draft.hour, draft.minute, h12);
  const clock = shown.period ? `${shown.time} ${t(`alarms.${shown.period}`)}` : shown.time;
  const until = untilText(t, nextAlarmAt(draft, new Date()).getTime() - Date.now());
  // Monday first, as the Us calendar; the store keeps 0 = Sunday.
  const weekdays = weekdayNames(i18n.language).map((name, i) => ({ name, day: (i + 1) % 7 }));
  const melody = !friend;
  const cta = existing ? t('alarms.save') : melody ? t('alarms.setAlarm') : t('alarms.wakeMe');

  const tiles: { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; on: boolean; off: boolean; flip: () => void }[] = [
    {
      key: 'voice',
      label: t('alarms.voice'),
      icon: 'mic',
      on: draft.voice && !!friend,
      off: !friend?.voiceReady && !friendClips.length,
      flip: () => set({ voice: !draft.voice, clipId: undefined }),
    },
    { key: 'reply', label: t('alarms.reply'), icon: 'chatbubble', on: draft.replyToWake && !!friend, off: !friend, flip: () => set({ replyToWake: !draft.replyToWake }) },
    { key: 'snooze', label: t('alarms.snooze'), icon: 'moon', on: draft.snooze, off: false, flip: () => set({ snooze: !draft.snooze }) },
  ];

  if (setMoment) {
    return (
      <View style={[styles.sheet, styles.moment, { paddingBottom: insets.bottom + space.xl }]}>
        <StatusBar style="light" />
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.momentBody}>
          {friend ? (
            <View>
              <CharacterAvatar character={friend} size={148} />
              <View style={styles.momentBadge}>
                <Ionicons name="alarm" size={22} color={night.textOnPrimary} />
              </View>
            </View>
          ) : (
            <View style={styles.momentBell}>
              <Ionicons name="alarm" size={64} color={night.textOnPrimary} />
            </View>
          )}
          <Txt style={styles.momentTime} maxFontSizeMultiplier={1.2}>
            {clock}
          </Txt>
          <View style={styles.until}>
            <Ionicons name="moon" size={15} color={night.primary} />
            <Txt variant="body" color={night.textSecondary}>
              {until}
            </Txt>
          </View>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(400)} style={[styles.momentDone, { bottom: insets.bottom + space.lg }]}>
          <PressableScale onPress={close} accessibilityRole="button" style={styles.doneButton}>
            <Txt variant="bodyStrong" color={night.text}>
              {t('alarms.done')}
            </Txt>
          </PressableScale>
        </Animated.View>
      </View>
    );
  }

  const title = page === 'sound' ? t('alarms.sound') : existing ? t('alarms.edit') : t('alarms.add');

  return (
    <View style={[styles.sheet, { paddingTop: Math.max(insets.top, space.md) }]}>
      <StatusBar style="light" />
      <View style={styles.nav}>
        {page === 'main' ? (
          <NavButton label={t('alarms.cancel')} onPress={close} />
        ) : (
          <NavButton label={t('alarms.back')} chevron onPress={() => setPage('main')} />
        )}
        <Txt variant="bodyStrong" color={night.text} style={styles.navTitle}>
          {title}
        </Txt>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xl }]} keyboardShouldPersistTaps="handled">
        {page === 'main' ? (
          <>
            <Txt variant="caption" color={night.textSecondary} style={styles.groupTitle}>
              {t('alarms.who').toUpperCase()}
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
              {/* The picked friend first, then melody only (easy to reach with many friends), then the rest. */}
              {friend ? (
                <Face name={friendName(friend, true)} on onPress={() => pick(friend)}>
                  <CharacterAvatar character={friend} size={FACE_ON} />
                </Face>
              ) : null}
              <Face name={t('alarms.melodyOnly')} on={melody} onPress={() => pick(undefined)}>
                <View style={[styles.bell, melody ? styles.bellOn : null]}>
                  <Ionicons name="musical-notes" size={melody ? 34 : 24} color={melody ? night.textOnPrimary : night.textSecondary} />
                </View>
              </Face>
              {friends
                .filter((c) => c.id !== friend?.id)
                .map((c) => (
                  <Face key={c.id} name={friendName(c, true)} on={false} onPress={() => pick(c)}>
                    <CharacterAvatar character={c} size={FACE} />
                  </Face>
                ))}
            </ScrollView>

            <View style={styles.timeCard}>
              <View style={styles.timeRow}>
                <RoundButton icon="remove" label={t('alarms.earlier', { count: STEP_MIN })} onPress={() => step(-STEP_MIN)} />
                <Pressable
                  onPress={() => setWheel((w) => !w)}
                  accessibilityRole="button"
                  accessibilityLabel={clock}
                  accessibilityState={{ expanded: wheel }}
                  style={styles.timeBox}>
                  <Txt style={styles.bigTime} maxFontSizeMultiplier={1.2}>
                    {shown.time}
                    {shown.period ? <Txt style={styles.period}>{` ${t(`alarms.${shown.period}`)}`}</Txt> : null}
                  </Txt>
                </Pressable>
                <RoundButton icon="add" label={t('alarms.later', { count: STEP_MIN })} onPress={() => step(STEP_MIN)} />
              </View>
              {wheel ? <TimeWheel hour={draft.hour} minute={draft.minute} h12={h12} tone={NIGHT_WHEEL} onChange={(hour, minute) => set({ hour, minute })} /> : null}
              <View style={styles.until}>
                <Ionicons name="moon" size={15} color={night.primary} />
                <Txt variant="body" color={night.textSecondary}>
                  {until}
                </Txt>
              </View>
            </View>

            <View style={styles.days} accessibilityRole="toolbar" accessibilityLabel={t('alarms.repeat')}>
              {weekdays.map(({ name, day }) => {
                const on = draft.repeat.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={name}
                    style={[styles.day, on && styles.dayOn]}>
                    <Txt style={[styles.dayText, on && styles.dayTextOn]} maxFontSizeMultiplier={1.2} lines={1}>
                      {name.slice(0, 2)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.tiles}>
              {tiles.map((tile) => (
                <PressableScale
                  key={tile.key}
                  disabled={tile.off}
                  onPress={() => {
                    haptic.selection();
                    tile.flip();
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: tile.on, disabled: tile.off }}
                  accessibilityLabel={tile.label}
                  style={[styles.tile, tile.on && styles.tileOn, tile.off && styles.tileOff]}>
                  <Ionicons name={tile.on ? tile.icon : (`${tile.icon}-outline` as typeof tile.icon)} size={26} color={tile.on ? night.textOnPrimary : night.textSecondary} />
                  <Txt style={[styles.tileText, tile.on && styles.tileTextOn]} lines={1} maxFontSizeMultiplier={1.2}>
                    {tile.label}
                  </Txt>
                </PressableScale>
              ))}
            </View>

            <Group>
              <Cell label={t('alarms.sound')} value={wakeClip ? wakeClip.title : t(`alarms.sounds.${draft.sound}`)} onPress={() => setPage('sound')} />
              <View style={[styles.cell, styles.last]}>
                <Txt variant="body" color={night.text}>{t('alarms.label')}</Txt>
                <TextInput
                  value={draft.label}
                  onChangeText={(label) => set({ label })}
                  placeholder={t('alarms.defaultLabel')}
                  placeholderTextColor={night.textMuted}
                  style={styles.labelInput}
                  maxLength={40}
                  returnKeyType="done"
                />
              </View>
            </Group>
            {existing ? (
              <Group>
                <Pressable style={[styles.cell, styles.last]} onPress={remove} accessibilityRole="button">
                  <Txt variant="body" color={systemColors.red}>
                    {t('alarms.deleteAlarm')}
                  </Txt>
                </Pressable>
              </Group>
            ) : null}
          </>
        ) : null}

        {page === 'sound' ? (
          <>
            <Txt variant="caption" color={night.textMuted} style={styles.groupTitle}>
              {t('alarms.theirVoice').toUpperCase()}
            </Txt>
            <Group>
              {friend?.voiceReady ? (
                <CheckCell
                  label={t('alarms.saysGoodMorning', { name: friendName(friend, true) })}
                  checked={draft.voice && !wakeClip}
                  onPress={() => set({ voice: true, clipId: undefined })}
                />
              ) : null}
              <CheckCell label={t('alarms.voiceOff')} checked={!draft.voice} onPress={() => set({ voice: false, clipId: undefined })} last />
            </Group>
            {friendClips.length ? (
              <>
                <Txt variant="caption" color={night.textMuted} style={styles.groupTitle}>
                  {t('alarms.theirClips').toUpperCase()}
                </Txt>
                <Group>
                  {friendClips.map((clip, i) => (
                    <CheckCell
                      key={clip.id}
                      label={clip.title}
                      lead={<Ionicons name="radio" size={20} color={night.primary} />}
                      checked={wakeClip?.id === clip.id}
                      last={i === friendClips.length - 1}
                      onPress={() => set({ voice: true, clipId: clip.id })}
                    />
                  ))}
                </Group>
              </>
            ) : null}
            <Txt variant="caption" color={night.textMuted} style={styles.groupTitle}>
              {t('alarms.melody').toUpperCase()}
            </Txt>
            <Group>
              {ALARM_SOUNDS.map((sound: AlarmSound, i) => (
                <CheckCell
                  key={sound}
                  label={t(`alarms.sounds.${sound}`)}
                  checked={draft.sound === sound}
                  last={i === ALARM_SOUNDS.length - 1}
                  onPress={() => set({ sound })}
                />
              ))}
            </Group>
          </>
        ) : null}
      </ScrollView>

      {page === 'main' ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <PressableScale
            onPress={save}
            accessibilityRole="button"
            accessibilityLabel={cost ? `${cta}, ${cost} ${t('common.shells')}` : cta}
            style={styles.cta}>
            <Txt style={styles.ctaText} maxFontSizeMultiplier={1.2}>
              {cta}
            </Txt>
            {cost ? (
              <View style={styles.price}>
                <ShellIcon size={15} />
                <Txt style={styles.priceText}>{cost}</Txt>
              </View>
            ) : null}
          </PressableScale>
        </View>
      ) : null}
      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </View>
  );
}

/** "in 8 h 30 min" until the next ring. */
function untilText(t: (key: string, options?: Record<string, unknown>) => string, ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(minutes / 60);
  return h ? t('alarms.inTime', { h, m: String(minutes % 60).padStart(2, '0') }) : t('alarms.inMinutes', { m: minutes });
}

function Face({ name, on, onPress, children }: { name: string; on: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={name} style={styles.face}>
      <View style={[styles.faceRing, on && styles.faceRingOn, { borderRadius: ((on ? FACE_ON : FACE) + RING_PAD * 2 + (on ? RING_BORDER * 2 : 0)) / 2 }]}>{children}</View>
      <Txt style={[styles.faceName, on && styles.faceNameOn]} lines={1} maxFontSizeMultiplier={1.2}>
        {name}
      </Txt>
    </PressableScale>
  );
}

function RoundButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={styles.round}>
      <Ionicons name={icon} size={22} color={night.text} />
    </PressableScale>
  );
}

function NavButton({ label, onPress, strong, chevron }: { label: string; onPress: () => void; strong?: boolean; chevron?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.navButton} accessibilityRole="button">
      {chevron ? <Ionicons name="chevron-back" size={20} color={night.primary} /> : null}
      <Txt variant={strong ? 'bodyStrong' : 'body'} color={night.primary}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Cell({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.cell} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`}>
      <Txt variant="body" color={night.text}>{label}</Txt>
      <View style={styles.value}>
        <Txt variant="body" color={night.textMuted} lines={1} style={styles.valueText}>
          {value}
        </Txt>
        <Ionicons name="chevron-forward" size={16} color={night.textFaint} />
      </View>
    </Pressable>
  );
}

function CheckCell({
  label,
  checked,
  onPress,
  lead,
  last,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  lead?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.cell, last && styles.last]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: checked }}>
      <View style={styles.lead}>
        {lead}
        <Txt variant="body" color={night.text}>{label}</Txt>
      </View>
      {checked ? <Ionicons name="checkmark" size={20} color={night.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: night.bgPlain },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  navTitle: { flex: 1, textAlign: 'center' },
  navButton: { flexDirection: 'row', alignItems: 'center', minWidth: 64, minHeight: 44 },
  navSpacer: { minWidth: 64 },
  scroll: { gap: space.lg, paddingTop: space.sm },
  groupTitle: { marginHorizontal: space.lg + space.lg, marginBottom: -space.sm, letterSpacing: 0.4 },
  faces: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingHorizontal: space.lg },
  face: { alignItems: 'center', gap: 6, minWidth: 56 },
  faceRing: { padding: RING_PAD },
  faceRingOn: { borderWidth: RING_BORDER, borderColor: night.primary },
  faceName: { fontSize: 13, color: night.textSecondary, maxWidth: 84, textAlign: 'center' },
  faceNameOn: { fontWeight: '700', color: night.text },
  bell: { width: FACE, height: FACE, borderRadius: FACE / 2, backgroundColor: night.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  bellOn: { width: FACE_ON, height: FACE_ON, borderRadius: FACE_ON / 2, backgroundColor: night.primary },
  timeCard: { marginHorizontal: space.lg, borderRadius: 28, backgroundColor: night.surface, alignItems: 'center', paddingVertical: space.md, gap: space.xs },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  // A steady box, so -/+ do not shift as the digits change width (Fredoka's are proportional).
  timeBox: { minWidth: 196, alignItems: 'center' },
  bigTime: { fontFamily: fonts.display, fontSize: 72, lineHeight: 84, color: night.text, fontVariant: ['tabular-nums'] },
  period: { fontFamily: fonts.display, fontSize: 24, color: night.textSecondary },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: night.well, alignItems: 'center', justifyContent: 'center' },
  until: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: space.lg },
  day: { width: 44, height: 44, borderRadius: 22, backgroundColor: night.well, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: night.primary },
  dayText: { fontSize: 14, fontWeight: '700', color: night.textSecondary },
  dayTextOn: { color: night.textOnPrimary },
  tiles: { flexDirection: 'row', gap: space.sm + 2, marginHorizontal: space.lg },
  tile: { flex: 1, height: 92, borderRadius: 20, backgroundColor: night.surface, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  tileOn: { backgroundColor: night.primary },
  tileOff: { opacity: 0.4 },
  tileText: { fontSize: 14, fontWeight: '600', color: night.textSecondary },
  tileTextOn: { color: night.textOnPrimary },
  group: {
    marginHorizontal: space.lg,
    borderRadius: radius.sm + 1,
    backgroundColor: night.surface,
    overflow: 'hidden',
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 46,
    paddingHorizontal: space.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: night.border,
  },
  last: { borderBottomWidth: 0 },
  value: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  valueText: { flexShrink: 1 },
  labelInput: { flex: 1, textAlign: 'right', color: night.textMuted, paddingVertical: space.sm, ...type.body },
  lead: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  cta: { height: 56, borderRadius: 28, backgroundColor: night.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  // System bold, not Fredoka: the button's words come in every script (Fredoka has Latin only).
  ctaText: { fontSize: 18, fontWeight: '700', color: night.textOnPrimary },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: space.sm + 2, paddingVertical: 4, borderRadius: 14, backgroundColor: 'rgba(42,26,18,0.12)' },
  priceText: { fontSize: 15, fontWeight: '700', color: night.textOnPrimary },
  moment: { alignItems: 'center', justifyContent: 'center' },
  momentBody: { alignItems: 'center', gap: space.lg },
  momentBadge: {
    position: 'absolute',
    right: -4,
    bottom: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: night.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: night.bgPlain,
  },
  momentBell: { width: 148, height: 148, borderRadius: 74, backgroundColor: night.primary, alignItems: 'center', justifyContent: 'center' },
  momentTime: { fontFamily: fonts.display, fontSize: 84, lineHeight: 96, color: night.text, fontVariant: ['tabular-nums'] },
  momentDone: { position: 'absolute', left: space.lg, right: space.lg },
  doneButton: { height: 56, borderRadius: 28, backgroundColor: night.well, alignItems: 'center', justifyContent: 'center' },
});
