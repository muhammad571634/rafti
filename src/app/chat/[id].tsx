import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BlurTargetView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, ListRenderItemInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput, ChatWallpaper, LevelUpModal, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { AttachMenu, type AttachKey } from '@/components/chat/attach-menu';
import { DayChip } from '@/components/chat/day-chip';
import { MessageMenu } from '@/components/chat/message-menu';
import { ReportSheet } from '@/components/chat/report-sheet';
import { lastMineId, runOf } from '@/components/chat/runs';
import { DailyCallsSheet } from '@/components/chat/daily-calls-sheet';
import { AlarmBar, QuickReplies } from '@/components/chat/quick-replies';
import { TruthOrDareSheet } from '@/components/chat/truth-or-dare-sheet';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import {
  CharacterAvatar,
  IconButton,
  PressableScale,
  Screen,
  Sheet,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { takeFocus } from '@/lib/chat-focus';
import { shortName } from '@/lib/format';
import { shellCosts, backgroundsById, chatArtBackgroundsById, dayKey, todayKey } from '@/mock';
import { suggestedReplies } from '@/mock/suggestions';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, isDark, radius, shadows, space } from '@/theme';
import type { Message } from '@/types';

/** Room the glass header takes under the status bar: avatar, name chip and caption. */
const HEADER_ROOM = 112;
/** The alarm bar under the header while the wake-up alarm rings. */
const ALARM_ROOM = 44;

/** The same colour, fully transparent: the end of the fade under the header. */
const fadeOut = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent');

export default function ChatRoomScreen() {
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const conversationId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const conversation = useAppStore((s) => s.conversations.find((c) => c.id === conversationId));
  const character = useAppStore((s) => s.characters.find((c) => c.id === conversation?.characterId));
  const messages = useAppStore((s) => (conversationId ? s.messages[conversationId] : undefined));
  const relationship = useAppStore((s) => (conversation ? s.relationships[conversation.characterId] : undefined));
  const typing = useAppStore((s) => (conversationId ? !!s.typing[conversationId] : false));
  const levelUp = useAppStore((s) => s.levelUp);
  const shells = useAppStore((s) => s.wallet.shells);
  // Pro or the trial: out of minutes means a top-up; otherwise the plans sheet.
  const withCalls = useAppStore((s) => callsIncluded(s.wallet));
  const animations = useAppStore((s) => s.settings.chatAnimation);
  const missedToday = useAppStore((s) =>
    s.calls.some(
      (c) => c.characterId === conversation?.characterId && c.missed && dayKey(c.startedAt) === todayKey(),
    ),
  );

  const sendText = useAppStore((s) => s.sendText);
  const pickChip = useAppStore((s) => s.pickChip);
  // The wake-up alarm rings until a real reply here (the morning chain).
  const alarmRinging = useAppStore((s) => s.wake?.state === 'ringing' && s.wake.conversationId === conversationId);
  const sendVoice = useAppStore((s) => s.sendVoice);
  const sendImage = useAppStore((s) => s.sendImage);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const dismissLevelUp = useAppStore((s) => s.dismissLevelUp);

  const [attachOpen, setAttachOpen] = useState(false);
  /** The message a search result pointed at, tinted for a moment. */
  const [flash, setFlash] = useState<string | null>(null);
  const blurTarget = useRef<View>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [truthOpen, setTruthOpen] = useState(false);
  const [callsOpen, setCallsOpen] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);
  /** Calling with no minutes: free users see what Basic adds, members can top up. */
  const [callGate, setCallGate] = useState<'paywall' | 'out' | null>(null);
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);

  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const reportMessage = useAppStore((s) => s.reportMessage);
  /** The message being reported; `reported` flips the sheet to a short thank-you. */
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reported, setReported] = useState(false);
  const openMenu = useCallback((message: Message) => setMenu(message), []);

  // Replies that land while this chat is on screen are read, not unread.
  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      setActiveConversation(conversationId);
      // Back from a search result: scroll to that message and flash it (iOS Messages).
      const target = takeFocus(conversationId);
      const timers: ReturnType<typeof setTimeout>[] = [];
      if (target) {
        timers.push(
          setTimeout(() => {
            const index = (useAppStore.getState().messages[conversationId] ?? []).findIndex((m) => m.id === target);
            if (index < 0) return;
            listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
            setFlash(target);
            timers.push(setTimeout(() => setFlash(null), 1600));
          }, 350),
        );
      }
      return () => {
        timers.forEach(clearTimeout);
        setActiveConversation(null);
      };
    }, [conversationId, setActiveConversation]),
  );

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages?.length, typing]);

  const backgroundId = relationship?.backgroundId ?? 'bg_plain';
  const artWallpaper = chatArtBackgroundsById[backgroundId];
  const wallpaper = backgroundsById[backgroundId] ?? backgroundsById.bg_plain;
  const background = wallpaper.colors;
  const data = useMemo(() => messages ?? [], [messages]);

  // Only messages that arrive while the chat is open animate in. History, and rows
  // the list re-mounts when you scroll back up, appear without replaying it.
  const [openedAt] = useState(() => Date.now());
  const characterId = character?.id;
  const callBack = useCallback(() => {
    if (characterId) router.push(`/call/${characterId}`);
  }, [characterId, router]);

  const lastMine = useMemo(() => lastMineId(data), [data]);
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => {
      if (!character) return null;
      const run = runOf(data, index);
      return (
        <>
          {run.timeBreak ? <DayChip iso={item.createdAt} /> : null}
          <View>
            {item.id === flash ? (
              <Animated.View exiting={FadeOut.duration(600)} pointerEvents="none" style={styles.flash} />
            ) : null}
            <MessageBubble
              message={item}
              character={character}
              animate={animations && Date.parse(item.createdAt) > openedAt}
              showAvatar={run.runStart}
              runEnd={run.runEnd}
              receipt={item.id === lastMine}
              onCallBack={callBack}
              onLongPress={openMenu}
            />
          </View>
          {item.chips?.length && conversationId ? (
            <QuickReplies chips={item.chips} onPick={(chip) => pickChip(conversationId, item.id, chip)} />
          ) : null}
        </>
      );
    },
    [character, animations, openedAt, data, lastMine, flash, callBack, openMenu, conversationId, pickChip],
  );

  // TEST: two suggested replies under their last plain line (see src/mock/suggestions.ts).
  // System lines (the AI notice at a session's start) do not count as their last line.
  const last = data.findLast((m) => m.kind !== 'system' && m.kind !== 'call' && !m.card);
  const suggestions =
    last && last.author === 'them' && last.kind === 'text' && !last.card && !last.chips?.length && !typing
      ? suggestedReplies(last.id)
      : null;

  if (!conversation || !character) {
    return (
      <Screen>
        <Txt style={styles.missing}>{t('errors.notFound')}</Txt>
      </Screen>
    );
  }

  const outOfShells = (cost: number) => {
    setPaywall(cost);
    return false;
  };

  const send = (text: string) => {
    const result = sendText(conversation.id, text);
    if (result === 'noShells') return outOfShells(shellCosts.textMessage);
    return result === 'sent';
  };

  const pickPhoto = async () => {
    setAttachOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri && sendImage(conversation.id, uri) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const attach = (key: AttachKey) => {
    setAttachOpen(false);
    switch (key) {
      case 'voice':
        return setVoiceOpen(true);
      case 'photo':
        return pickPhoto();
      case 'secretNote':
        return router.push(`/secret-note/${character.id}`);
      case 'quiz':
        return router.push({ pathname: '/quiz/[characterId]', params: { characterId: character.id } });
      case 'truthOrDare':
        return setTruthOpen(true);
      case 'date':
        return router.push('/dating');
      case 'dailyCalls':
        return setCallsOpen(true);
      case 'diary':
        return router.push('/diary/write');
    }
  };


  const name = displayName(character, relationship);

  const startCall = () => {
    if (callMinutes > 0) return router.push(`/call/${character.id}`);
    setCallGate(withCalls ? 'out' : 'paywall');
  };
  const openStore = (route: '/store/shell?tab=shells' | '/store/shell?tab=plans&plan=pro') => {
    setCallGate(null);
    router.push(route);
  };
  const streak = relationship?.streakDays ?? 0;
  const dark = !!wallpaper.dark;

  // The list scrolls under a glass header (iOS Messages); this much room keeps its first line clear.
  const headerRoom = insets.top + HEADER_ROOM;

  return (
    <Screen background={background as readonly [string, string]} statusBarStyle={dark ? 'light' : 'dark'} edgeToEdge>
      {/* What the menus blur on Android (expo-blur needs a target there). */}
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {artWallpaper ? (
            <>
              <Image
                source={artWallpaper.image}
                contentFit="cover"
                style={styles.artWallpaper}
                accessible={false}
              />
              <View pointerEvents="none" style={styles.artWallpaperVeil} />
            </>
          ) : null}
          <View style={styles.flex}>
            {!artWallpaper ? <ChatWallpaper hidden={dark || backgroundId === 'bg_plain'} /> : null}
            <FlatList
              ref={listRef}
              data={data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingTop: headerRoom + (alarmRinging ? ALARM_ROOM : 0) }]}
              showsVerticalScrollIndicator={false}
              renderItem={renderItem}
              ListFooterComponent={
                <>
                  {suggestions ? <QuickReplies chips={suggestions} onPick={send} /> : null}
                  {typing ? <TypingRow character={character} /> : null}
                </>
              }
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              // A row far up is not measured yet: jump near it, then aim again.
              onScrollToIndexFailed={(info) => {
                listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
                setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.4 }), 120);
              }}
            />
            {/* The ground fades out under the header, so bubbles slide away beneath the glass. */}
            {!artWallpaper ? (
              <LinearGradient
                pointerEvents="none"
                colors={[background[0], background[0], fadeOut(background[0])]}
                locations={[0, 0.55, 1]}
                style={[styles.fade, { height: headerRoom + space.md }]}
              />
            ) : null}
          </View>

          <ChatInput
            placeholder={t('chat.inputPlaceholder', { name })}
            onSend={send}
            onAttach={() => setAttachOpen(true)}
            onVoice={() => setVoiceOpen(true)}
            initialValue={typeof draft === 'string' ? draft : undefined}
          />
        </KeyboardAvoidingView>

        {/* Glass back, the friend in the middle (tap: chat settings), shells and call on the right. */}
        <View style={[styles.header, { paddingTop: insets.top + space.xs }]} pointerEvents="box-none">
          <View style={styles.headerRow} pointerEvents="box-none">
            <PressableScale
              onPress={() => router.back()}
              hitSlop={hitSlop}
              scaleTo={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.back')}
              style={[styles.glass, styles.round]}>
              <Ionicons name="chevron-back" size={24} color={colors.text} style={styles.backGlyph} />
            </PressableScale>

            <PressableScale
              style={styles.identity}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={[name, t('chat.aiCharacter'), streak > 0 ? t('chat.streakShort', { count: streak }) : null, t('a11y.chatSettings')]
                .filter(Boolean)
                .join(', ')}
              onPress={() => router.push(`/character/${character.id}/settings`)}>
              <CharacterAvatar character={character} size={54} />
              <View style={[styles.glass, styles.nameChip]}>
                <Txt style={styles.nameText} lines={1}>
                  {name}
                </Txt>
                <Ionicons name="chevron-forward" size={11} color={colors.textSecondary} />
              </View>
              {/* Always says what they are; the streak rides along once there is one. */}
              <View style={styles.caption}>
                <Txt style={styles.captionText}>{t('chat.aiCharacter')}</Txt>
                {streak > 0 ? (
                  <>
                    <View style={styles.captionDot} />
                    <Ionicons name="heart" size={10} color={colors.primary} />
                    <Txt style={[styles.captionText, styles.captionStreak]}>{t('chat.streakShort', { count: streak })}</Txt>
                  </>
                ) : null}
              </View>
            </PressableScale>

            <View style={[styles.glass, styles.capsule]}>
              <View>
                <PressableScale
                  scaleTo={0.92}
                  onPress={() => router.push('/store/shell?tab=shells')}
                  accessibilityRole="button"
                  accessibilityLabel={`${shells} ${t('common.shells')}`}
                  style={styles.shells}>
                  <ShellIcon size={16} />
                  <Txt style={styles.shellCount}>{shells}</Txt>
                </PressableScale>
                <SpendPulse shells={shells} />
              </View>
              <View style={styles.capsuleLine} />
              <IconButton
                icon="call-outline"
                size={20}
                dot={missedToday}
                style={styles.callButton}
                accessibilityLabel={t('a11y.call')}
                onPress={startCall}
              />
            </View>
          </View>
          {alarmRinging ? (
            <View style={styles.alarm}>
              <AlarmBar />
            </View>
          ) : null}
        </View>
      </BlurTargetView>

      <LevelUpModal
        event={levelUp?.characterId === character.id ? levelUp : null}
        characterName={name}
        onClose={dismissLevelUp}
      />

      <AttachMenu visible={attachOpen} onClose={() => setAttachOpen(false)} onPick={attach} blurTarget={blurTarget} />

      <TruthOrDareSheet visible={truthOpen} onClose={() => setTruthOpen(false)} character={character} name={name} />
      <DailyCallsSheet visible={callsOpen} onClose={() => setCallsOpen(false)} characterId={character.id} />

      <VoiceSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onSend={(seconds) => {
          setVoiceOpen(false);
          if (sendVoice(conversation.id, seconds, '(voice message)') === 'noShells') {
            outOfShells(shellCosts.voiceMessage);
          }
        }}
      />

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} chat />

      <CallPaywallSheet
        visible={callGate === 'paywall'}
        character={character}
        name={name}
        onClose={() => setCallGate(null)}
        onStarted={() => {
          setCallGate(null);
          router.push(`/call/${character.id}`);
        }}
      />
      <OutOfMinutesSheet
        visible={callGate === 'out'}
        onAdded={() => {
          setCallGate(null);
          router.push(`/call/${character.id}`);
        }}
        onNoShells={() => openStore('/store/shell?tab=shells')}
        onGetPro={() => openStore('/store/shell?tab=plans&plan=pro')}
        onDone={() => setCallGate(null)}
      />

      <MessageMenu
        message={menu}
        blurTarget={blurTarget}
        onClose={() => setMenu(null)}
        onReact={(message, reaction) => {
          reactToMessage(conversation.id, message.id, reaction);
          setMenu(null);
        }}
        onCopy={(message) => {
          void Clipboard.setStringAsync(message.text ?? '');
          setMenu(null);
        }}
        onReport={(message) => {
          setReported(false);
          setReporting(message);
          setMenu(null);
        }}
        onDelete={(message) => {
          deleteMessage(conversation.id, message.id);
          setMenu(null);
        }}
      />

      <ReportSheet
        visible={!!reporting}
        reported={reported}
        onClose={() => setReporting(null)}
        onReport={(reason) => {
          if (reporting) reportMessage(conversation.id, reporting.id, reason);
          setReported(true);
        }}
      />
    </Screen>
  );
}


/** A "-1" that floats off the shell badge whenever a message is paid for. */
function SpendPulse({ shells }: { shells: number }) {
  const { t } = useTranslation();
  const prev = useRef(shells);
  const [spent, setSpent] = useState(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    const diff = prev.current - shells;
    prev.current = shells;
    if (diff <= 0) return;
    setSpent(diff);
    lift.value = 0;
    lift.value = withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 0 }));
  }, [shells, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: lift.value === 0 ? 0 : 1 - lift.value * 0.9,
    transform: [{ translateY: -lift.value * 14 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.pulse, style]} accessibilityLabel={t('chat.spent', { count: spent })}>
      <Txt variant="smallStrong" color={colors.brandText}>
        -{spent}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pulse: { position: 'absolute', right: space.xs, bottom: -space.lg },
  flex: { flex: 1 },
  flash: { ...StyleSheet.absoluteFill, top: -3, bottom: -1, backgroundColor: colors.primarySoft },
  artWallpaper: { ...StyleSheet.absoluteFill },
  artWallpaperVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: isDark ? 'rgba(14,18,48,0.45)' : 'rgba(255,250,241,0.18)',
  },
  missing: { padding: space.xl },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.glassButton,
  },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { marginLeft: -2 },
  // Centred between the side buttons; it may not crowd them.
  identity: { flex: 1, alignItems: 'center', marginHorizontal: space.sm },
  nameChip: {
    marginTop: space.xs,
    height: 26,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: space.md,
    paddingRight: space.sm + 2,
    borderRadius: 13,
  },
  nameText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1, flexShrink: 1 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  captionText: { fontSize: 11, color: colors.textSecondary },
  captionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textSecondary },
  captionStreak: { color: colors.primary, fontWeight: '600' },
  capsule: { height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  shells: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.sm + 2, paddingRight: space.sm },
  shellCount: { fontSize: 15, fontWeight: '600' },
  capsuleLine: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.borderStrong },
  callButton: { width: 40, height: 36 },
  alarm: { marginTop: space.sm },
  list: { paddingBottom: space.sm },
  // The sheet pads its card by space.xl; rows bring their own space.lg gutter.
});
