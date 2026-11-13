import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Updates from 'expo-updates';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/ai/safety';
import { connectAccount, deleteServerAccount } from '@/ai/account';
import { serverModel } from '@/ai/server';
import { DangerRow, Group, LinkRow, ProfileTop, ProgressCard, SwitchRow } from '@/components/character/kit';
import {
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
  useScrolledPast,
} from '@/components/ui';
import { GlassIconOrbit } from '@/components/onboarding/glass-icon-orbit';
import { pickLanguage } from '@/components/profile/language-list';
import { SUPPORTED_LOCALES, getSavedLocaleSync } from '@/i18n';
import { planStatus } from '@/economy/plans';
import { lastWelcomeCheck, rewindAwayClock } from '@/lib/away-clock';
import { chatDrafts } from '@/lib/chat-drafts';
import { forgetAllSelfies } from '@/lib/booth-selfies';
import { forgetAllNotes } from '@/lib/voice-files';
import { profileCompletion } from '@/lib/profile';
import { INVITE_REWARD } from '@/mock';
import { sendTestPushes } from '@/notifications/sync';
import { defaultPersona } from '@/lib/personas';
import { AWAY_MS } from '@/lib/welcome-back';
import { countMessages } from '@/store/message-db';
import { syncMemories } from '@/store/memory-sync';
import { flushMessages, messagesInDb, restoreFromServer, syncMessages } from '@/store/message-sync';
import { useAppStore } from '@/store/use-app-store';
import { colors, fonts, moduleFills, space, storeColors, systemColors, systemGround } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Show the Development section in dev builds AND in preview (internal APK) builds. */
const SHOW_DEV = __DEV__ || Updates.channel === 'preview';

const AVATAR = 104;
/** iOS system colours for the rows' icon tiles (owner 2026-11-08: keep the coloured icons). */
const FILL = {
  gifts: moduleFills.gifts,
  language: systemColors.blue,
  animation: systemColors.teal,
  haptics: systemColors.pink,
  grey: systemColors.gray,
  support: systemColors.green,
  privacy: systemColors.cyan,
  terms: systemColors.brown,
  plan: systemColors.purple,
  personas: systemColors.blue,
  lore: systemColors.indigo,
  mind: systemColors.orange,
};

/** The legal rows that have a published page to open (`LEGAL_URLS`). */
const legalRows = (
  [
    ['privacy', 'lock-closed'],
    ['terms', 'document-text'],
  ] as const
).flatMap(([key, icon]) => {
  const url = LEGAL_URLS[key];
  return url ? [{ key, url, icon: icon as IoniconName }] : [];
});

/**
 * Who you are, in the merged look (0z156; was the aurora page of 2026-10-21): Apple's white ground, your
 * mascot or photo, the full name and handle, shells and plan as two white cards, how full the
 * profile is, then white cards of rows with soft ink glyphs, and Delete account apart at the end.
 * Notifications live under the bell on Us.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const [hello, setHello] = useState(false);
  // Past the photo and name, the top row shows the name.
  const { scrolled, onScroll } = useScrolledPast(170);

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

  // Development: see the moments without waiting for them. The level-up plays over the newest chat
  // at its friend's current level; the check-in sheet comes up on Today with the day's last amount.
  const playLevelUp = () => {
    const s = useAppStore.getState();
    const convo = [...s.conversations]
      .filter((c) => s.relationships[c.characterId])
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))[0];
    if (!convo) return;
    const rel = s.relationships[convo.characterId];
    useAppStore.setState({ levelUp: { characterId: convo.characterId, level: Math.max(1, rel.level), levelTitle: rel.levelTitle } });
    router.push(`/chat/${convo.id}`);
  };
  // Rings a wake-up alarm now, as its time would: one with a friend (their picture, the reply task).
  const ringWake = () => {
    const s = useAppStore.getState();
    const alarm = s.alarms.find((a) => a.characterId) ?? s.alarms[0];
    if (alarm && s.ringAlarm(alarm.id)) router.push('/alarms/ring');
  };
  const showCheckIn = () => {
    const s = useAppStore.getState();
    useAppStore.setState({ dailyReward: { amount: s.daily.checkInAmount ?? 10, day: Math.max(1, s.daily.checkInDay) } });
    router.navigate('/');
  };

  // Read again on return from Profile → Language.
  const [savedLang, setSavedLang] = useState(getSavedLocaleSync);
  useFocusEffect(useCallback(() => setSavedLang(getSavedLocaleSync()), []));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  /** Dev only: what the last "Test pushes" press did. */
  const [testResult, setTestResult] = useState<string | undefined>();

  /** Dev only: the local AI server's model while Real AI is on ("gemini:…"), else why not. */
  const [aiStatus, setAiStatus] = useState<string | undefined>();
  useEffect(() => {
    if (!SHOW_DEV || !settings.realAi) return setAiStatus(undefined);
    let alive = true;
    void serverModel().then((model) => {
      if (alive) setAiStatus(model ? model.replace(/^gemini:/, '') : t('profile.aiOffline'));
    });
    return () => {
      alive = false;
    };
  }, [settings.realAi, t]);

  /** Dev only: how many messages the on-device database holds (B1.3a); tap to count again. */
  const [messageCount, setMessageCount] = useState<string | undefined>();
  const checkMessages = async () => {
    if (!messagesInDb()) return setMessageCount(t('profile.messagesOldSave'));
    await flushMessages();
    setMessageCount(String(await countMessages()));
  };
  useEffect(() => {
    if (SHOW_DEV) void checkMessages();
    // Counted once when Profile opens; a tap counts again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /** Dev only: the last Server chats sync (B1.3b): what came back, synced, or why not. */
  const [chatsStatus, setChatsStatus] = useState<string | undefined>();
  const syncChats = async () => {
    const restored = await restoreFromServer();
    // The memory goes with the chats (B2.3); the row reports the chats.
    const [status] = await Promise.all([syncMessages(), syncMemories()]);
    if (restored) setChatsStatus(t('profile.chatsRestored', { count: restored }));
    else setChatsStatus(t(status === 'synced' ? 'profile.chatsSynced' : status === 'off' ? 'profile.chatsOff' : 'profile.aiOffline'));
    void checkMessages();
  };

  // The server's copy goes first (App Store 5.1.1(v)); if it cannot, the phone keeps everything.
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const confirmDelete = async () => {
    setDeleting(true);
    const result = await deleteServerAccount();
    setDeleting(false);
    if (result === 'failed') return setDeleteFailed(true);
    setDeleteOpen(false);
    deleteAccount();
    chatDrafts.clearAll();
    void forgetAllNotes();
    void forgetAllSelfies();
    // A fresh start speaks the phone's language again: a language picked by hand goes with the account.
    await pickLanguage(null);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
  };

  const isAuto = !savedLang;
  const currentLocale = isAuto
    ? t('profile.languageAuto')
    : (SUPPORTED_LOCALES.find((l) => l.code === savedLang)?.label ?? savedLang);
  const plan = planStatus(wallet.subscription, Date.now());
  const planName = plan
    ? plan.trial
      ? t('plans.trialName', { plan: t(`plans.name.${plan.plan}`) })
      : t(`plans.name.${plan.plan}`)
    : t('plans.free');

  const groupA = [
    {
      key: 'gifts',
      label: t('profile.freeGifts'),
      icon: 'gift' as IoniconName,
      fill: FILL.gifts,
      pill: t('profile.inviteOffer', { count: INVITE_REWARD }),
      onPress: () => router.push('/gifts'),
    },
    { key: 'personas', label: t('personas.title'), icon: 'people' as IoniconName, fill: FILL.personas, meta: personaName, onPress: () => router.push('/personas') },
    {
      key: 'mind',
      label: t('mind.title'),
      icon: 'bookmark' as IoniconName,
      fill: FILL.mind,
      meta: openThreads ? String(openThreads) : undefined,
      onPress: () => router.push('/mind'),
    },
    {
      key: 'lore',
      label: t('lore.title'),
      icon: 'book' as IoniconName,
      fill: FILL.lore,
      meta: ownBooks ? String(ownBooks) : undefined,
      onPress: () => router.push('/lore'),
    },
    ...(canPickLanguage
      ? [{ key: 'language', label: t('profile.language'), icon: 'globe-outline' as IoniconName, fill: FILL.language, meta: currentLocale, onPress: () => router.push('/language') }]
      : []),
  ];
  const groupB = [
    ...(blocked.length > 0
      ? [{ key: 'blocked', label: t('safety.blocked'), icon: 'hand-left' as IoniconName, fill: FILL.grey, meta: String(blocked.length), onPress: () => setBlockedOpen(true) }]
      : []),
    { key: 'support', label: t('safety.support'), icon: 'mail' as IoniconName, fill: FILL.support, onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
    // Privacy and terms open the published pages; no row until they are online (`LEGAL_URLS`).
    // Account (sign-in) waits for Sign in with Apple, so it has no row yet either.
    ...legalRows.map(({ key, url, icon }) => ({ key, label: t(`profile.${key}`), icon, fill: FILL[key], onPress: () => void Linking.openURL(url) })),
  ];
  const completeTitle = percent < 100 ? t('profile.completeTitle') : t('profile.editProfile');

  return (
    <Screen background={systemGround.ground}>
      <ProfileTop title={user.displayName} showTitle={scrolled} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: space.xs, paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.hero}>
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editPhoto')}
            onPress={() => router.push('/edit-profile')}>
            <View style={styles.ring}>
              <UserAvatar user={user} size={AVATAR} />
            </View>
            <View style={styles.camera} pointerEvents="none">
              <Ionicons name="camera-outline" size={17} color={systemGround.label} />
            </View>
          </PressableScale>
          {/* The whole name here; Today shows only the first six letters. */}
          <Txt style={styles.name} lines={2} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2} accessibilityRole="header">
            {user.displayName}
          </Txt>
          <Txt style={styles.handle} lines={1}>
            {user.handle}
          </Txt>
        </View>

        <View style={styles.tiles}>
          <PressableScale
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={`${t('profile.shells')}, ${wallet.shells}, ${t('profile.getMore')}`}
            style={styles.tile}
            onPress={() => router.push('/store/shell?tab=shells')}>
            <View style={styles.tileHead}>
              <ShellIcon size={16} />
              <Txt style={styles.tileLabel} lines={1}>
                {t('profile.shells')}
              </Txt>
            </View>
            <Txt style={styles.tileValue} lines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
              {wallet.shells}
            </Txt>
            <View style={[styles.tilePill, styles.peachPill]}>
              <Txt style={[styles.tilePillText, styles.peachInk]} lines={1} maxFontSizeMultiplier={1.2}>
                {t('profile.getMore')}
              </Txt>
            </View>
          </PressableScale>
          <PressableScale
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={`${t('profile.myPlan')}, ${planName}, ${plan ? t('profile.manage') : t('profile.tryPlus')}`}
            style={styles.tile}
            onPress={() => router.push(plan ? '/my-plan' : '/store/shell?tab=plans')}>
            <View style={styles.tileHead}>
              <Ionicons name="diamond" size={15} color={FILL.plan} />
              <Txt style={styles.tileLabel} lines={1}>
                {t('profile.myPlan')}
              </Txt>
            </View>
            <Txt style={styles.tileValue} lines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={1.2}>
              {planName}
            </Txt>
            <View style={[styles.tilePill, styles.violetPill]}>
              <Txt style={[styles.tilePillText, styles.violetInk]} lines={1} maxFontSizeMultiplier={1.2}>
                {plan ? t('profile.manage') : t('profile.tryPlus')}
              </Txt>
            </View>
          </PressableScale>
        </View>

        <ProgressCard
          title={completeTitle}
          percent={percent}
          hint={percent < 100 ? t('profile.completeHint') : undefined}
          onPress={() => router.push('/edit-profile')}
        />

        <Group>
          {groupA.map(({ key, ...row }) => (
            <LinkRow key={key} {...row} />
          ))}
          <SwitchRow icon="sparkles" fill={FILL.animation} label={t('profile.chatAnimation')} value={settings.chatAnimation} onChange={(v) => setSetting('chatAnimation', v)} />
          <SwitchRow icon="phone-portrait" fill={FILL.haptics} label={t('profile.haptics')} value={settings.haptics} onChange={(v) => setSetting('haptics', v)} last />
        </Group>

        {/* Development and preview (internal APK) builds. */}
        {SHOW_DEV ? (
          <Group>
            {/* Replies from the real model on the local server (`server/`); off = the stand-in. */}
            <LinkRow
              icon="sparkles"
              label={t('profile.realAi')}
              meta={aiStatus}
              end={<Toggle value={!!settings.realAi} onChange={(v) => setSetting('realAi', v)} accessibilityLabel={t('profile.realAi')} />}
            />
            {/* The welcome back on Today shows on the next return from the background, as if after two hours away. */}
            <LinkRow icon="hand-left" label={t('profile.welcomeTest')} meta={lastWelcomeCheck()} onPress={() => rewindAwayClock(2 * AWAY_MS)} />
            {/* The first launch's hello, without clearing the app's data. */}
            <LinkRow icon="moon" label={t('profile.helloTest')} onPress={() => setHello(true)} />
            <LinkRow icon="heart" label={t('profile.levelUpTest')} onPress={playLevelUp} />
            <LinkRow icon="alarm" label={t('profile.alarmTest')} onPress={ringWake} />
            <LinkRow icon="gift" label={t('profile.checkInTest')} onPress={showCheckIn} />
            {/* Signs in to Supabase (anonymously) and loads this account's wallet from the server (B0). */}
            <LinkRow icon="cloud" label={t('profile.serverAccount')} meta={accountStatus} onPress={() => void checkAccount()} />
            {/* B1.2: shells are spent and earned on the server; turning it on loads the server's wallet. */}
            <LinkRow
              icon="wallet"
              label={t('profile.serverWallet')}
              end={
                <Toggle
                  value={settings.serverWallet !== false}
                  onChange={(v) => {
                    setSetting('serverWallet', v);
                    if (v) void syncServerWallet();
                  }}
                  accessibilityLabel={t('profile.serverWallet')}
                />
              }
            />
            {/* B1.3a: messages live in SQLite on the phone; the count shows the import worked. */}
            <LinkRow icon="chatbubbles" label={t('profile.messagesOnPhone')} meta={messageCount} onPress={() => void checkMessages()} />
            {/* B1.3b: the chats are copied to the server; turning it on reads them back on an empty phone, then sends what is new. */}
            <LinkRow
              icon="cloud-upload"
              label={t('profile.serverChats')}
              meta={chatsStatus}
              onPress={settings.serverMessages ? () => void syncChats() : undefined}
              end={
                <Toggle
                  value={!!settings.serverMessages}
                  onChange={(v) => {
                    setSetting('serverMessages', v);
                    if (v) void syncChats();
                    else setChatsStatus(undefined);
                  }}
                  accessibilityLabel={t('profile.serverChats')}
                />
              }
            />
            {/* Fires the planned pushes now, a few seconds apart. */}
            <LinkRow icon="paper-plane" label={t('profile.testPushes')} meta={testResult} onPress={() => void testPushes()} />
            {/* Each thread's next text now (good luck, time to go, how did it go?), without waiting for its hour. */}
            <LinkRow icon="time" label={t('profile.nextTexts')} meta={nextResult} onPress={nextTexts} />
            {/* The morning brief now (today's plans, else tomorrow's), without waiting for the morning. */}
            <LinkRow icon="sunny" label={t('profile.briefNow')} meta={briefResult} onPress={morningBrief} />
            {/* Tonight's "how was today?" now; the answer becomes today's diary page. */}
            <LinkRow icon="moon" label={t('profile.dayNow')} meta={dayResult} onPress={dayAsk} />
            {/* This week's Sunday recap now, whatever the day. */}
            <LinkRow icon="sparkles" label={t('profile.weekNow')} meta={weekResult} onPress={weekRecap} />
            {/* A new install starts empty; this fills chats, bonds and diary pages to test full screens. */}
            <LinkRow icon="albums" label={t('profile.loadDemo')} onPress={loadDemoData} last={!plan} />
            {/* Ends the plan at once, to see the free screens again. */}
            {plan ? <LinkRow icon="close-circle" label={t('profile.endPlan')} onPress={endPlan} last /> : null}
          </Group>
        ) : null}

        <Group>
          {groupB.map(({ key, ...row }) => (
            <LinkRow key={key} {...row} />
          ))}
          <LinkRow icon="information-circle" fill={FILL.grey} label={t('profile.versionRow')} meta={Constants.expoConfig?.version ?? '1.0.0'} last />
        </Group>

        <Group>
          <DangerRow label={t('profile.deleteAccount')} last onPress={() => setDeleteOpen(true)} />
        </Group>
      </ScrollView>

      <Sheet
        visible={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteFailed(false);
        }}
        title={t('profile.deleteTitle')}
        center
      >
        <Txt variant="body" color={deleteFailed ? colors.danger : colors.textSecondary} center style={styles.deleteBody}>
          {t(deleteFailed ? 'profile.deleteFailed' : 'profile.deleteBody')}
        </Txt>
        <View style={styles.deleteActions}>
          <Button
            label={t('profile.deleteConfirm')}
            variant="danger"
            size="lg"
            full
            loading={deleting}
            disabled={deleting}
            onPress={() => void confirmDelete()}
          />
          <Button label={t('profile.cancel')} variant="ghost" size="lg" full onPress={() => setDeleteOpen(false)} />
        </View>
      </Sheet>

      <Sheet visible={blockedOpen} onClose={() => setBlockedOpen(false)} title={t('safety.blocked')} scroll>
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

      <Modal visible={hello} animationType="none" statusBarTranslucent onRequestClose={() => setHello(false)}>
        <GlassIconOrbit onStart={() => setHello(false)} />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.xs },
  // A white ring lifts the photo off the ground.
  ring: { padding: 4, borderRadius: AVATAR / 2 + 4, backgroundColor: systemGround.card },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemGround.card,
    borderWidth: 3,
    borderColor: systemGround.ground,
  },
  name: { marginTop: 14, fontFamily: fonts.playful, fontSize: 30, lineHeight: 38, letterSpacing: -0.3, textAlign: 'center', color: systemGround.label },
  handle: { marginTop: 2, fontSize: 15, color: colors.textSecondary },
  tiles: { flexDirection: 'row', gap: space.md, marginHorizontal: space.lg, marginTop: 22 },
  tile: { flex: 1, minWidth: 0, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 4, borderRadius: 24, backgroundColor: systemGround.card },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { flexShrink: 1, fontFamily: fonts.playfulBold, fontSize: 13, color: colors.textSecondary },
  tileValue: { fontFamily: fonts.playful, fontSize: 28, lineHeight: 36, color: systemGround.label, fontVariant: ['tabular-nums'] },
  tilePill: { alignSelf: 'flex-start', maxWidth: '100%', height: 28, marginTop: 4, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center', backgroundColor: systemGround.fill },
  tilePillText: { fontFamily: fonts.playfulBold, fontSize: 13, color: systemGround.label },
  peachPill: { backgroundColor: colors.primarySofter },
  peachInk: { color: colors.brandText },
  violetPill: { backgroundColor: storeColors.violetSoft },
  violetInk: { color: storeColors.violetInk },
  deleteBody: { marginBottom: space.xl },
  deleteActions: { gap: space.sm },
  // The sheet card pads its content; rows bring their own gutter.
  sheetList: { marginHorizontal: -space.xl },
});
