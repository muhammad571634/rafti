import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, ListRenderItemInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput, ChatWallpaper, LevelUpModal, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { PaywallSheet } from '@/components/paywall-sheet';
import {
  ShellBadge,
  CharacterAvatar,
  Divider,
  IconButton,
  IconTile,
  ListRow,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { shellCosts, backgroundsById, dayKey, todayKey } from '@/mock';
import { displayName, memberActive, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space } from '@/theme';
import type { Message } from '@/types';

type Attachment = {
  key: 'voice' | 'photo' | 'secretNote' | 'date' | 'diary';
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const ATTACHMENTS: Attachment[] = [
  { key: 'voice', icon: 'mic-outline' },
  { key: 'photo', icon: 'image-outline' },
  { key: 'secretNote', icon: 'mail-outline' },
  { key: 'date', icon: 'cafe-outline' },
  { key: 'diary', icon: 'book-outline' },
];

/** Leading tile size in the "+" sheet; the dividers inset by it to meet the row text. */
const ATTACH_TILE = 38;

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
  const [paywall, setPaywall] = useState<number | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);

  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
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

  const send = (text: string) =>
    sendText(conversation.id, text) === 'noShells' ? outOfShells(shellCosts.textMessage) : true;

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
      case 'date':
        return router.push('/dating');
      case 'diary':
        return router.push('/diary/write');
    }
  };

  // The price shown on each "+" row. Members send voice and photos free; the
  // date row opens its own screen, so it carries a chevron instead.
  const attachMeta = (key: Attachment['key']) => {
    switch (key) {
      case 'voice':
        return member ? undefined : t('chat.shellCost', { count: shellCosts.voiceMessage });
      case 'photo':
        return member ? undefined : t('chat.shellCost', { count: shellCosts.textMessage });
      case 'secretNote':
        return t('chat.shellCost', { count: shellCosts.secretNote });
      case 'diary':
        return t('common.free');
      case 'date':
        return undefined;
    }
  };

  const name = displayName(character, relationship);
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
              <Txt variant="tiny" color={colors.primary} lines={1}>
                {streak > 0 ? `${t('chat.streak', { count: streak })} \u{1F9E1}` : t('chat.streakNone')}
              </Txt>
            </View>
          </PressableScale>
          <View>
            <ShellBadge count={shells} showAdd onPress={() => router.push('/store/shell')} />
            <SpendPulse shells={shells} />
          </View>
        </View>

        <IconButton
          icon="call-outline"
          size={22}
          dot={missedToday}
          style={styles.headerIcon}
          accessibilityLabel={t('a11y.call')}
          onPress={() => router.push(`/call/${character.id}`)}
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
            ListFooterComponent={typing ? <TypingRow character={character} /> : null}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>

        <ChatInput
          placeholder={t('chat.inputPlaceholder', { name })}
          onSend={send}
          onAttach={() => setAttachOpen(true)}
          onVoice={() => setVoiceOpen(true)}
          initialValue={typeof draft === 'string' ? draft : undefined}
        />
      </KeyboardAvoidingView>

      <LevelUpModal
        event={levelUp?.characterId === character.id ? levelUp : null}
        characterName={name}
        onClose={dismissLevelUp}
      />

      <Sheet visible={attachOpen} onClose={() => setAttachOpen(false)}>
        <View style={styles.attachList}>
          {ATTACHMENTS.map((item, index) => {
            const title = t(`chat.attachments.${item.key}`);
            const meta = attachMeta(item.key);
            return (
              <Fragment key={item.key}>
                {index > 0 ? <Divider inset={space.lg + ATTACH_TILE + space.md} /> : null}
                <ListRow
                  title={title}
                  left={<IconTile icon={item.icon} size={ATTACH_TILE} />}
                  meta={meta}
                  chevron={item.key === 'date'}
                  accessibilityLabel={meta ? `${title}, ${meta}` : title}
                  onPress={() => attach(item.key)}
                />
              </Fragment>
            );
          })}
        </View>
      </Sheet>

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
              {REACTIONS.map((emoji) => {
                const on = menu.reaction === emoji;
                return (
                  <PressableScale
                    key={emoji}
                    scaleTo={0.85}
                    style={[styles.reactionButton, on && styles.reactionOn]}
                    accessibilityLabel={t('chat.react', { emoji })}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      reactToMessage(conversation.id, menu.id, on ? undefined : emoji);
                      setMenu(null);
                    }}>
                    <Txt style={styles.reactionEmoji}>{emoji}</Txt>
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
    </Screen>
  );
}

const REACTIONS = ['\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F525}', '\u{1F44D}'];

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
  reactionButton: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  reactionOn: { backgroundColor: colors.primarySoft },
  reactionEmoji: { fontSize: 26, lineHeight: 32 },
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
  attachList: { marginHorizontal: -space.xl },
});
