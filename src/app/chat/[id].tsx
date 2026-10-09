import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, ListRenderItemInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REPORT_REASONS } from '@/ai/safety';
import { ChatInput, ChatWallpaper, LevelUpModal, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { DailyCallsSheet } from '@/components/chat/daily-calls-sheet';
import { TruthOrDareSheet } from '@/components/chat/truth-or-dare-sheet';
import { REACTION_STICKERS, type ReactionName } from '@/assets/brand/registry';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import {
  Button,
  ShellBadge,
  CharacterAvatar,
  ClayIcon,
  IconButton,
  ListRow,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { shortName } from '@/lib/format';
import { shellCosts, backgroundsById, dayKey, todayKey } from '@/mock';
import { displayName, fairUseReached, memberActive, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space } from '@/theme';
import type { Message } from '@/types';
import type { ClayIconName } from '@/components/ui';

type Attachment = {
  key: 'voice' | 'photo' | 'secretNote' | 'quiz' | 'truthOrDare' | 'date' | 'dailyCalls' | 'diary';
  icon: ClayIconName;
};

/** The "+" sheet: four to a row, each a 3D clay icon (the app-wide icon style). */
const ATTACHMENTS: Attachment[] = [
  { key: 'voice', icon: 'voice' },
  { key: 'photo', icon: 'photo' },
  { key: 'secretNote', icon: 'secretNote' },
  { key: 'quiz', icon: 'quiz' },
  { key: 'truthOrDare', icon: 'truthOrDare' },
  { key: 'date', icon: 'date' },
  { key: 'dailyCalls', icon: 'calls' },
  { key: 'diary', icon: 'diary' },
];

const ATTACH_TILE = 60;

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
  const user = useAppStore((s) => s.user);
  const shells = useAppStore((s) => s.wallet.shells);
  const member = useAppStore((s) => memberActive(s.wallet));
  const animations = useAppStore((s) => s.settings.chatAnimation);
  const missedToday = useAppStore((s) =>
    s.calls.some(
      (c) => c.characterId === conversation?.characterId && c.missed && dayKey(c.startedAt) === todayKey(),
    ),
  );

  const sendText = useAppStore((s) => s.sendText);
  const sendVoice = useAppStore((s) => s.sendVoice);
  const sendImage = useAppStore((s) => s.sendImage);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const dismissLevelUp = useAppStore((s) => s.dismissLevelUp);

  const [attachOpen, setAttachOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [truthOpen, setTruthOpen] = useState(false);
  const [callsOpen, setCallsOpen] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);
  /** Calling with no minutes: free users see what Basic adds, members can top up. */
  const [callGate, setCallGate] = useState<'paywall' | 'out' | null>(null);
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);
  // A member past today's fair-use limit: the composer rests until midnight.
  const capped = useAppStore((s) => fairUseReached(s.wallet, s.daily));
  const untilMidnight = useUntilMidnight(capped);

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
      return () => setActiveConversation(null);
    }, [conversationId, setActiveConversation]),
  );

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages?.length, typing]);

  const wallpaper = backgroundsById[relationship?.backgroundId ?? 'bg_blossom'];
  const background = wallpaper?.colors ?? [colors.bg, colors.surface];
  const data = useMemo(() => messages ?? [], [messages]);

  // Only messages that arrive while the chat is open animate in. History, and rows
  // the list re-mounts when you scroll back up, appear without replaying it.
  const [openedAt] = useState(() => Date.now());
  const characterId = character?.id;
  const callBack = useCallback(() => {
    if (characterId) router.push(`/call/${characterId}`);
  }, [characterId, router]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) =>
      character ? (
        <>
          {index === 0 || dayKey(data[index - 1].createdAt) !== dayKey(item.createdAt) ? (
            <DayChip iso={item.createdAt} />
          ) : null}
          <MessageBubble
            message={item}
            character={character}
            user={user}
            animate={animations && Date.parse(item.createdAt) > openedAt}
            showAvatar={
              index === 0 ||
              data[index - 1]?.author !== item.author ||
              data[index - 1]?.kind === 'call' ||
              data[index - 1]?.kind === 'system'
            }
            onCallBack={callBack}
            onLongPress={openMenu}
          />
        </>
      ) : null,
    [character, user, animations, openedAt, data, callBack, openMenu],
  );

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

  const attach = (key: Attachment['key']) => {
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
    setCallGate(member ? 'out' : 'paywall');
  };
  const openStore = (route: '/store/shell?tab=shells' | '/store/shell?tab=plans&plan=pro') => {
    setCallGate(null);
    router.push(route);
  };
  const streak = relationship?.streakDays ?? 0;
  const dark = !!wallpaper?.dark;

  return (
    <Screen background={background as readonly [string, string]} statusBarStyle="dark">
      <View style={[styles.header, { marginTop: -insets.top, paddingTop: insets.top + space.xs }]}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={hitSlop}
          scaleTo={0.88}
          accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={27} color={colors.text} />
        </PressableScale>

        {/* Siblings, not nested: a button inside a button is unreachable for
            VoiceOver/TalkBack and invalid HTML on web. */}
        <View style={styles.identity}>
          <PressableScale
            style={styles.identityTap}
            scaleTo={0.98}
            onPress={() => router.push(`/character/${character.id}`)}>
            <CharacterAvatar character={character} size={36} />
            <View style={styles.identityText}>
              <Txt variant="title" lines={1}>
                {name}
              </Txt>
              {/* Always says what they are; the streak rides along once there is one. */}
              <Txt variant="tiny" color={colors.textSecondary} lines={1}>
                {t('chat.aiCharacter')}
                {streak > 0 ? (
                  <Txt variant="tiny" color={colors.primary}>
                    {` · \u{1F9E1} ${t('chat.streakShort', { count: streak })}`}
                  </Txt>
                ) : null}
              </Txt>
            </View>
          </PressableScale>
          <View>
            <ShellBadge count={shells} showAdd onPress={() => router.push('/store/shell?tab=shells')} />
            <SpendPulse shells={shells} />
          </View>
        </View>

        <IconButton
          icon="call-outline"
          size={22}
          dot={missedToday}
          style={styles.headerIcon}
          accessibilityLabel={t('a11y.call')}
          onPress={startCall}
        />
        <IconButton
          icon="menu"
          size={24}
          style={styles.headerIcon}
          accessibilityLabel={t('a11y.chatSettings')}
          onPress={() => router.push(`/character/${character.id}/settings`)}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}>
        <View style={styles.flex}>
          <ChatWallpaper hidden={dark} />
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            ListFooterComponent={
              <>
                {typing ? <TypingRow character={character} /> : null}
                {capped ? (
                  <View style={styles.fairUse}>
                    <Txt variant="smallStrong" color={colors.textSecondary} center>
                      {t('chat.fairUse', { name: shortName(name) })}
                    </Txt>
                  </View>
                ) : null}
              </>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>

        <ChatInput
          placeholder={t('chat.inputPlaceholder', { name })}
          onSend={send}
          onAttach={() => setAttachOpen(true)}
          onVoice={() => setVoiceOpen(true)}
          initialValue={typeof draft === 'string' ? draft : undefined}
          locked={capped ? t('chat.backAt', { time: untilMidnight }) : undefined}
        />
      </KeyboardAvoidingView>

      <LevelUpModal
        event={levelUp?.characterId === character.id ? levelUp : null}
        characterName={name}
        onClose={dismissLevelUp}
      />

      <Sheet visible={attachOpen} onClose={() => setAttachOpen(false)}>
        <View style={styles.attachGrid}>
          {ATTACHMENTS.map((item) => {
            return (
              <PressableScale
                key={item.key}
                style={styles.attachCell}
                scaleTo={0.94}
                accessibilityLabel={t(`chat.attachments.${item.key}`)}
                onPress={() => attach(item.key)}>
                <ClayIcon name={item.icon} size={ATTACH_TILE} />
                <Txt variant="smallStrong" center lines={2}>
                  {t(`chat.attachments.${item.key}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </View>
      </Sheet>

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

      <Sheet visible={!!menu} onClose={() => setMenu(null)}>
        {menu ? (
          <>
            {menu.text ? (
              <View style={styles.quote}>
                <Txt variant="small" color={colors.textSecondary} lines={3}>
                  {menu.text}
                </Txt>
              </View>
            ) : null}
            <View style={styles.reactions}>
              {REACTIONS.map((name) => {
                const on = menu.reaction === name;
                return (
                  <PressableScale
                    key={name}
                    scaleTo={0.85}
                    style={[styles.reactionButton, on && styles.reactionOn]}
                    accessibilityLabel={t('chat.react', { name: t(`chat.reactions.${name}`) })}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      reactToMessage(conversation.id, menu.id, on ? undefined : name);
                      setMenu(null);
                    }}>
                    <Image source={REACTION_STICKERS[name]} style={styles.reactionSticker} contentFit="contain" />
                  </PressableScale>
                );
              })}
            </View>
            {menu.text ? (
              <ListRow
                title={t('chat.copy')}
                left={<Ionicons name="copy-outline" size={21} color={colors.text} />}
                onPress={() => {
                  void Clipboard.setStringAsync(menu.text ?? '');
                  setMenu(null);
                }}
              />
            ) : null}
            {menu.author === 'them' ? (
              <ListRow
                title={t('safety.report')}
                left={<Ionicons name="flag-outline" size={21} color={colors.text} />}
                onPress={() => {
                  setReported(false);
                  setReporting(menu);
                  setMenu(null);
                }}
              />
            ) : null}
            <ListRow
              title={t('chat.deleteMessage')}
              left={<Ionicons name="trash-outline" size={21} color={colors.danger} />}
              onPress={() => {
                deleteMessage(conversation.id, menu.id);
                setMenu(null);
              }}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet
        visible={!!reporting}
        onClose={() => setReporting(null)}
        title={reported ? t('safety.reportThanks') : t('safety.reportTitle')}>
        {reported ? (
          <Button label={t('safety.done')} size="lg" full onPress={() => setReporting(null)} />
        ) : (
          REPORT_REASONS.map((reason) => (
            <ListRow
              key={reason}
              title={t(`safety.reasons.${reason}`)}
              chevron
              onPress={() => {
                if (reporting) reportMessage(conversation.id, reporting.id, reason);
                setReported(true);
              }}
            />
          ))
        )}
      </Sheet>
    </Screen>
  );
}

const REACTIONS = Object.keys(REACTION_STICKERS) as ReactionName[];

/** "Today", "Yesterday" or the date, between messages from different days. */
function DayChip({ iso }: { iso: string }) {
  const { t, i18n } = useTranslation();
  const key = dayKey(iso);
  const label =
    key === todayKey()
      ? t('chat.dayToday')
      : key === dayKey(new Date(Date.now() - 86_400_000))
        ? t('chat.dayYesterday')
        : new Date(iso).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <View style={styles.dayRow}>
      <View style={styles.dayChip}>
        <Txt variant="caption" color={colors.textSecondary}>
          {label}
        </Txt>
      </View>
    </View>
  );
}

/** "18 min" or "2 h 5 min" to midnight, ticking each minute while `on`. */
function useUntilMidnight(on: boolean) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [on]);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const minutes = Math.max(1, Math.ceil((midnight.getTime() - now) / 60_000));
  return minutes < 60
    ? t('plans.minutes', { count: minutes })
    : t('chat.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
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
  dayRow: { alignItems: 'center', marginTop: space.md, marginBottom: space.md },
  fairUse: {
    alignSelf: 'center',
    maxWidth: '86%',
    marginTop: space.md,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.onMediaSoft,
  },
  dayChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.onMediaSoft,
  },
  pulse: { position: 'absolute', right: space.xs, bottom: -space.lg },
  quote: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  reactions: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: space.lg },
  reactionButton: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  reactionOn: { backgroundColor: colors.primarySoft },
  reactionSticker: { width: 44, height: 44 },
  flex: { flex: 1 },
  missing: { padding: space.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    zIndex: 2,
  },
  headerIcon: { width: 34 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  identityTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  identityText: { flex: 1, gap: 2 },
  list: { paddingVertical: space.lg },
  // The sheet pads its card by space.xl; rows bring their own space.lg gutter.
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  attachCell: { width: '25%', alignItems: 'center', gap: space.sm, paddingHorizontal: 2 },
});
