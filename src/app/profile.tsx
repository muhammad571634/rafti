import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUPPORT_EMAIL } from '@/ai/safety';
import { connectAccount } from '@/ai/account';
import { serverModel } from '@/ai/server';
import {
  AuroraGlass,
  Button,
  CharacterAvatar,
  Divider,
  ListRow,
  PressableScale,
  Screen,
  ShellIcon,
  Sheet,
  Toggle,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import { planStatus } from '@/economy/plans';
import { profileCompletion } from '@/lib/profile';
import { INVITE_REWARD } from '@/mock';
import { sendTestPushes } from '@/notifications/sync';
import { defaultPersona } from '@/lib/personas';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, isDark, moduleFills, space, storeColors, systemColors } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const AVATAR = 96;
const ROW_ICON = 30;
/** iOS system colours for the Settings-style row icons. */
const FILL = {
  gifts: moduleFills.gifts,
  language: systemColors.blue,
  animation: systemColors.teal,
  haptics: systemColors.pink,
  grey: systemColors.gray,
  support: systemColors.green,
  account: systemColors.indigo,
  privacy: systemColors.cyan,
  terms: systemColors.brown,
  plan: systemColors.purple,
  personas: systemColors.blue,
  lore: systemColors.indigo,
  mind: systemColors.orange,
};
const SWITCH_ON = systemColors.green;
const CARD_SHADOW = {
  shadowColor: aurora.shadow,
  shadowOpacity: isDark ? 0.35 : 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
};

/**
 * Who you are, on the aurora (canvas "Profile on the aurora", 2026-10-21): your mascot, full
 * name and handle, shells and plan as two tiles, how full the profile is, then iOS Settings
 * groups with system-colour icons, and Delete account apart at the end. Notifications moved to
 * the bell on Us.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const settings = useAppStore((s) => s.settings);
  // Who new chats use (Character.AI's personas): the profile unless the user picked one.
  const personaName = useAppStore((s) => defaultPersona(s).name);
  const ownBooks = useAppStore((s) => s.lorebooks.length);
  const openThreads = useAppStore((s) => s.threads.filter((x) => x.status === 'open').length);
  const setSetting = useAppStore((s) => s.setSetting);
  const syncServerWallet = useAppStore((s) => s.syncServerWallet);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const endPlan = useAppStore((s) => s.endPlan);
  const loadDemoData = useAppStore((s) => s.loadDemoData);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const characters = useAppStore((s) => s.characters);
  const unblockCharacter = useAppStore((s) => s.unblockCharacter);
  const blocked = characters.filter((c) => blockedIds.includes(c.id));

  const [languageOpen, setLanguageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  /** Dev only: what the last "Test pushes" press did. */
  const [testResult, setTestResult] = useState<string | undefined>();

  /** Dev only: the local AI server's model while Real AI is on ("gemini:…"), else why not. */
  const [aiStatus, setAiStatus] = useState<string | undefined>();
  useEffect(() => {
    if (!__DEV__ || !settings.realAi) return setAiStatus(undefined);
    let alive = true;
    void serverModel().then((model) => {
      if (alive) setAiStatus(model ? model.replace(/^gemini:/, '') : t('profile.aiOffline'));
    });
    return () => {
      alive = false;
    };
  }, [settings.realAi, t]);

  /** Dev only: the server account after the last "Server account" press (shells, or why not). */
  const [accountStatus, setAccountStatus] = useState<string | undefined>();
  const checkAccount = async () => {
    const result = await connectAccount();
    if (result.ok) return setAccountStatus(t('plans.shells', { count: result.session.wallet.shells }));
    setAccountStatus(
      t(result.reason === 'signInOff' ? 'profile.accountSignInOff' : result.reason === 'failed' ? 'profile.accountFailed' : 'profile.aiOffline'),
    );
  };

  /** Dev only: what the last "Next planned texts" press did. */
  const [nextResult, setNextResult] = useState<string | undefined>();
  const nextTexts = () => {
    const { sent, waiting } = useAppStore.getState().devNextTexts();
    setNextResult(t('profile.nextTextsResult', { sent, waiting }));
  };

  /** Dev only: what the last "Morning brief now" press did. */
  const [briefResult, setBriefResult] = useState<string | undefined>();
  const morningBrief = () => setBriefResult(t(useAppStore.getState().devMorningBrief() ? 'profile.briefSent' : 'profile.briefNone'));
  /** Dev only: what the last "Evening question now" press did. */
  const [dayResult, setDayResult] = useState<string | undefined>();
  const dayAsk = () => setDayResult(t(useAppStore.getState().devDayAsk() ? 'profile.briefSent' : 'profile.dayNone'));
  /** Dev only: what the last "Weekly recap now" press did. */
  const [weekResult, setWeekResult] = useState<string | undefined>();
  const weekRecap = () => setWeekResult(t(useAppStore.getState().devWeekRecap() ? 'profile.briefSent' : 'profile.weekNone'));

  const testPushes = async () => {
    const count = await sendTestPushes(useAppStore.getState());
    setTestResult(count > 0 ? t('profile.testPushesSent', { count }) : t('profile.testPushesUnavailable'));
  };

  const percent = profileCompletion(user);
  // One language for now: the picker shows up once there is a second one.
  const canPickLanguage = SUPPORTED_LOCALES.length > 1;

  const confirmDelete = () => {
    setDeleteOpen(false);
    deleteAccount();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
  };

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? i18n.language;
  const plan = planStatus(wallet.subscription, Date.now());
  const planName = plan
    ? plan.trial
      ? t('plans.trialName', { plan: t(`plans.name.${plan.plan}`) })
      : t(`plans.name.${plan.plan}`)
    : t('plans.free');

  const groupA = [
    {
      key: 'gifts',
      title: t('profile.freeGifts'),
      icon: 'gift' as IoniconName,
      fill: FILL.gifts,
      pill: t('profile.inviteOffer', { count: INVITE_REWARD }),
      onPress: () => router.push('/gifts'),
    },
    {
      key: 'personas',
      title: t('personas.title'),
      icon: 'people' as IoniconName,
      fill: FILL.personas,
      meta: personaName,
      onPress: () => router.push('/personas'),
    },
    {
      key: 'mind',
      title: t('mind.title'),
      icon: 'bookmark' as IoniconName,
      fill: FILL.mind,
      ...(openThreads ? { meta: String(openThreads) } : {}),
      onPress: () => router.push('/mind'),
    },
    {
      key: 'lore',
      title: t('lore.title'),
      icon: 'book' as IoniconName,
      fill: FILL.lore,
      ...(ownBooks ? { meta: String(ownBooks) } : {}),
      onPress: () => router.push('/lore'),
    },
    ...(canPickLanguage
      ? [{ key: 'language', title: t('profile.language'), icon: 'globe-outline' as IoniconName, fill: FILL.language, meta: currentLocale, onPress: () => setLanguageOpen(true) }]
      : []),
  ];
  const groupB = [
    ...(blocked.length > 0
      ? [{ key: 'blocked', title: t('safety.blocked'), icon: 'hand-left' as IoniconName, fill: FILL.grey, meta: String(blocked.length), onPress: () => setBlockedOpen(true) }]
      : []),
    { key: 'support', title: t('safety.support'), icon: 'mail' as IoniconName, fill: FILL.support, onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
    { key: 'account', title: t('profile.account'), icon: 'person' as IoniconName, fill: FILL.account, onPress: () => {} },
    { key: 'privacy', title: t('profile.privacy'), icon: 'lock-closed' as IoniconName, fill: FILL.privacy, onPress: () => {} },
    { key: 'terms', title: t('profile.terms'), icon: 'document-text' as IoniconName, fill: FILL.terms, onPress: () => {} },
  ];

  return (
    <Screen background="aurora">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.bar}>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
        </View>

        <View style={styles.hero}>
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editPhoto')}
            onPress={() => router.push('/edit-profile')}
            style={styles.avatarRing}>
            <UserAvatar user={user} size={AVATAR} />
            <View style={styles.camera} pointerEvents="none">
              <Ionicons name="camera-outline" size={16} color={colors.text} />
            </View>
          </PressableScale>
          {/* The whole name here; Today shows only the first six letters. */}
          <Txt style={styles.name} lines={2} accessibilityRole="header">
            {user.displayName}
          </Txt>
          <Txt style={styles.handle} lines={1}>
            {user.handle}
          </Txt>
        </View>

        <View style={styles.tiles}>
          <PressableScale scaleTo={0.97} accessibilityRole="button" style={styles.tile} onPress={() => router.push('/store/shell?tab=shells')}>
            <View style={styles.tileHead}>
              <ShellIcon size={16} />
              <Txt style={styles.tileLabel}>{t('profile.shells')}</Txt>
            </View>
            <View style={styles.tileFoot}>
              <Txt style={styles.tileValue} lines={1}>
                {wallet.shells}
              </Txt>
              <View style={[styles.tilePill, styles.peachPill]}>
                <Txt style={[styles.tilePillText, styles.peachInk]}>{t('profile.getMore')}</Txt>
              </View>
            </View>
          </PressableScale>
          <PressableScale
            scaleTo={0.97}
            accessibilityRole="button"
            style={styles.tile}
            onPress={() => router.push(plan ? '/my-plan' : '/store/shell?tab=plans')}>
            <View style={styles.tileHead}>
              <Ionicons name="diamond" size={15} color={FILL.plan} />
              <Txt style={styles.tileLabel}>{t('profile.myPlan')}</Txt>
            </View>
            <View style={styles.tileFoot}>
              <Txt style={[styles.tileValue, styles.flex]} lines={1}>
                {planName}
              </Txt>
              <View style={[styles.tilePill, styles.violetPill]}>
                <Txt style={[styles.tilePillText, styles.violetInk]}>{plan ? t('profile.manage') : t('profile.tryPlus')}</Txt>
              </View>
            </View>
          </PressableScale>
        </View>

        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={`${percent < 100 ? t('profile.completeTitle') : t('profile.editProfile')}, ${percent}%`}
          onPress={() => router.push('/edit-profile')}
          style={styles.complete}>
          <View style={styles.completeTop}>
            <Txt style={styles.completeTitle}>{percent < 100 ? t('profile.completeTitle') : t('profile.editProfile')}</Txt>
            <Txt style={styles.completePercent}>{percent}%</Txt>
            <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          {percent < 100 ? <Txt style={styles.completeHint}>{t('profile.completeHint')}</Txt> : null}
        </PressableScale>

        <View style={styles.group}>
          {groupA.map(({ key, ...row }) => (
            <SettingsRow key={key} {...row} />
          ))}
          <SettingsRow
            title={t('profile.chatAnimation')}
            icon="sparkles"
            fill={FILL.animation}
            right={
              <Toggle
                value={settings.chatAnimation}
                onChange={(v) => setSetting('chatAnimation', v)}
                onColor={SWITCH_ON}
                accessibilityLabel={t('profile.chatAnimation')}
              />
            }
          />
          <SettingsRow
            title={t('profile.haptics')}
            icon="phone-portrait"
            fill={FILL.haptics}
            last
            right={
              <Toggle
                value={settings.haptics}
                onChange={(v) => setSetting('haptics', v)}
                onColor={SWITCH_ON}
                accessibilityLabel={t('profile.haptics')}
              />
            }
          />
        </View>

        {/* Development builds only. */}
        {__DEV__ ? (
          <View style={styles.group}>
            {/* Replies from the real model on the local server (`server/`); off = the stand-in. */}
            <SettingsRow
              title={t('profile.realAi')}
              icon="sparkles"
              fill={FILL.grey}
              meta={aiStatus}
              right={
                <Toggle
                  value={!!settings.realAi}
                  onChange={(v) => setSetting('realAi', v)}
                  onColor={SWITCH_ON}
                  accessibilityLabel={t('profile.realAi')}
                />
              }
            />
            {/* Signs in to Supabase (anonymously) and loads this account's wallet from the server (B0). */}
            <SettingsRow title={t('profile.serverAccount')} icon="cloud" fill={FILL.grey} meta={accountStatus} onPress={() => void checkAccount()} />
            {/* B1.2: shells are spent and earned on the server; turning it on loads the server's wallet. */}
            <SettingsRow
              title={t('profile.serverWallet')}
              icon="wallet"
              fill={FILL.grey}
              right={
                <Toggle
                  value={!!settings.serverWallet}
                  onChange={(v) => {
                    setSetting('serverWallet', v);
                    if (v) void syncServerWallet();
                  }}
                  onColor={SWITCH_ON}
                  accessibilityLabel={t('profile.serverWallet')}
                />
              }
            />
            {/* Fires the planned pushes now, a few seconds apart. */}
            <SettingsRow title={t('profile.testPushes')} icon="paper-plane" fill={FILL.grey} meta={testResult} onPress={() => void testPushes()} />
            {/* Each thread's next text now (good luck, time to go, how did it go?), without waiting for its hour. */}
            <SettingsRow title={t('profile.nextTexts')} icon="time" fill={FILL.grey} meta={nextResult} onPress={nextTexts} />
            {/* The morning brief now (today's plans, else tomorrow's), without waiting for the morning. */}
            <SettingsRow title={t('profile.briefNow')} icon="sunny" fill={FILL.grey} meta={briefResult} onPress={morningBrief} />
            {/* Tonight's "how was today?" now; the answer becomes today's diary page. */}
            <SettingsRow title={t('profile.dayNow')} icon="moon" fill={FILL.grey} meta={dayResult} onPress={dayAsk} />
            {/* This week's Sunday recap now, whatever the day. */}
            <SettingsRow title={t('profile.weekNow')} icon="sparkles" fill={FILL.grey} meta={weekResult} onPress={weekRecap} />
            {/* A new install starts empty; this fills chats, bonds and diary pages to test full screens. */}
            <SettingsRow title={t('profile.loadDemo')} icon="albums" fill={FILL.grey} onPress={loadDemoData} last={!plan} />
            {/* Ends the plan at once, to see the free screens again. */}
            {plan ? <SettingsRow title={t('profile.endPlan')} icon="close-circle" fill={FILL.grey} onPress={endPlan} last /> : null}
          </View>
        ) : null}

        <View style={styles.group}>
          {groupB.map(({ key, ...row }) => (
            <SettingsRow key={key} {...row} />
          ))}
          <SettingsRow
            title={t('profile.versionRow')}
            icon="information-circle"
            fill={FILL.grey}
            meta={Constants.expoConfig?.version ?? '1.0.0'}
            last
          />
        </View>

        <PressableScale scaleTo={0.98} accessibilityRole="button" onPress={() => setDeleteOpen(true)} style={styles.delete}>
          <Txt style={styles.deleteText}>{t('profile.deleteAccount')}</Txt>
        </PressableScale>
      </ScrollView>

      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('profile.deleteTitle')} center>
        <Txt variant="body" color={colors.textSecondary} center style={styles.deleteBody}>
          {t('profile.deleteBody')}
        </Txt>
        <View style={styles.deleteActions}>
          <Button label={t('profile.deleteConfirm')} variant="danger" size="lg" full onPress={confirmDelete} />
          <Button label={t('profile.cancel')} variant="ghost" size="lg" full onPress={() => setDeleteOpen(false)} />
        </View>
      </Sheet>

      <Sheet visible={blockedOpen} onClose={() => setBlockedOpen(false)} title={t('safety.blocked')}>
        <View style={styles.sheetList}>
          {blocked.map((character, index) => (
            <View key={character.id}>
              {index > 0 ? <Divider inset={space.lg} /> : null}
              <ListRow
                title={character.name}
                left={<CharacterAvatar character={character} size={36} />}
                right={
                  <Button
                    label={t('safety.unblock')}
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      unblockCharacter(character.id);
                      if (blocked.length === 1) setBlockedOpen(false);
                    }}
                  />
                }
              />
            </View>
          ))}
        </View>
      </Sheet>

      <Sheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title={t('profile.language')}>
        <View style={styles.sheetList}>
          {SUPPORTED_LOCALES.map((locale, index) => (
            <View key={locale.code}>
              {index > 0 ? <Divider inset={space.lg} /> : null}
              <ListRow
                title={locale.label}
                right={
                  i18n.language === locale.code ? <Ionicons name="checkmark" size={20} color={colors.text} /> : null
                }
                onPress={async () => {
                  await setLocale(locale.code);
                  setLanguageOpen(false);
                }}
              />
            </View>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

/** One iOS Settings row: a system-colour icon tile, the title, then a pill, a value, a control or a chevron. */
function SettingsRow({
  title,
  icon,
  fill,
  pill,
  meta,
  right,
  last,
  onPress,
}: {
  title: string;
  icon: IoniconName;
  fill: string;
  pill?: string;
  meta?: string;
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, pill, meta].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}>
      <View style={[styles.rowIcon, { backgroundColor: fill }]}>
        <Ionicons name={icon} size={17} color={colors.white} />
      </View>
      <View style={[styles.rowBody, !last && styles.rowLine]}>
        <Txt style={styles.rowTitle} lines={1}>
          {title}
        </Txt>
        {pill ? (
          <View style={[styles.rowPill, styles.peachPill]}>
            <Txt style={[styles.rowPillText, styles.peachInk]}>{pill}</Txt>
          </View>
        ) : null}
        {meta ? (
          <Txt style={styles.rowMeta} lines={1}>
            {meta}
          </Txt>
        ) : null}
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={15} color={colors.textFaint} /> : null)}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { height: 44, paddingHorizontal: space.lg, paddingTop: space.xs, flexDirection: 'row', alignItems: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  hero: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: 6 },
  // A light ring round your mascot, with a soft shadow under it.
  avatarRing: {
    padding: 4,
    borderRadius: AVATAR / 2 + 4,
    backgroundColor: aurora.ring,
    shadowColor: aurora.shadow,
    shadowOpacity: isDark ? 0.45 : 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
  },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(44,44,46,0.95)' : 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.glassEdge,
  },
  name: { marginTop: 14, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center', color: colors.text },
  handle: { marginTop: 2, fontSize: 15, color: aurora.textMuted },
  tiles: { flexDirection: 'row', gap: space.md, marginHorizontal: space.lg, marginTop: 22 },
  tile: { flex: 1, padding: 14, gap: 6, borderRadius: 20, backgroundColor: aurora.card, ...CARD_SHADOW },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: aurora.textMuted },
  tileFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tileValue: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 1 },
  tilePill: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  tilePillText: { fontSize: 13, fontWeight: '700' },
  peachPill: { backgroundColor: isDark ? '#3A2416' : '#FFF0E4' },
  peachInk: { color: isDark ? '#FFB27A' : '#C96A32' },
  violetPill: { backgroundColor: storeColors.violetSoft },
  violetInk: { color: storeColors.violetInk },
  complete: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  completeTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  completeTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  completePercent: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  track: { height: 6, marginTop: 10, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.track },
  fill: { height: '100%', borderRadius: 3, backgroundColor: aurora.tint },
  completeHint: { marginTop: space.sm, fontSize: 13, color: aurora.textMuted },
  group: { marginHorizontal: space.lg, marginTop: 22, borderRadius: 20, overflow: 'hidden', backgroundColor: aurora.card, ...CARD_SHADOW },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  rowPressed: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
  rowIcon: { width: ROW_ICON, height: ROW_ICON, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: 14 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aurora.separator },
  rowTitle: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  rowPill: { height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center' },
  rowPillText: { fontSize: 13, fontWeight: '700' },
  rowMeta: { fontSize: 17, color: aurora.textMuted, maxWidth: '45%' },
  delete: {
    height: 50,
    marginHorizontal: space.lg,
    marginTop: 22,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  deleteText: { fontSize: 17, letterSpacing: -0.4, color: colors.danger },
  deleteBody: { marginBottom: space.xl },
  deleteActions: { gap: space.sm },
  // The sheet card pads its content; rows bring their own gutter.
  sheetList: { marginHorizontal: -space.xl },
});
