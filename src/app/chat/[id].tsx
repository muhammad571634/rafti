import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BlurTargetView } from 'expo-blur';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, ListRenderItemInfo, Platform, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, { FadeOut, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput, ChatWallpaper, LevelUpModal, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { AttachMenu, type AttachKey } from '@/components/chat/attach-menu';
import { CaptionDot, CaptionText, ChatHeader, HEADER_ROOM, HeaderFade } from '@/components/chat/chat-header';
import { DayChip } from '@/components/chat/day-chip';
import { MessageMenu, useBackToClose } from '@/components/chat/message-menu';
import { ReplyControls, VersionSwipe } from '@/components/chat/reply-controls';
import { ReportSheet } from '@/components/chat/report-sheet';
import { TimeSkipSheet } from '@/components/chat/time-skip-sheet';
import { lastMineId, runOf } from '@/components/chat/runs';
import { DailyCallsSheet } from '@/components/chat/daily-calls-sheet';
import { AlarmBar, asIdeas, QuickReplies, SceneBar } from '@/components/chat/quick-replies';
import { TruthOrDareSheet } from '@/components/chat/truth-or-dare-sheet';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { CharacterAvatar, Screen, Txt } from '@/components/ui';
import { takeFocus } from '@/lib/chat-focus';
import { steerBlock } from '@/lib/chat-steer';
import { canRewindTo, lastExchange, laterCount } from '@/lib/chat-turns';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { everydayIdeas, shownIdeas } from '@/lib/reply-ideas';
import { shellCosts, backgroundsById, chatArtBackgroundsById, dayKey, todayKey } from '@/mock';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, isDark, shadows, space } from '@/theme';
import type { Message, ReplyIdea, TimeSkip } from '@/types';

/** The alarm bar under the header while the wake-up alarm rings. */
const ALARM_ROOM = 44;


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
  const answerIdea = useAppStore((s) => s.answerIdea);
  /** A long-pressed reply idea waiting in the field to be changed, and the line it answers. */
  const [ideaDraft, setIdeaDraft] = useState<{ messageId: string; idea: ReplyIdea; at: number } | null>(null);
  // The wake-up alarm rings until a real reply here (the morning chain).
  const alarmRinging = useAppStore((s) => s.wake?.state === 'ringing' && s.wake.conversationId === conversationId);
  const sendVoice = useAppStore((s) => s.sendVoice);
  const sendImage = useAppStore((s) => s.sendImage);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const dismissLevelUp = useAppStore((s) => s.dismissLevelUp);

  const [attachOpen, setAttachOpen] = useState(false);
  /** The message a search result pointed at, tinted for a moment. */
  const [flash, setFlash] = useState<string | null>(null);
  const blurTarget = useRef<ViewInstance>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [truthOpen, setTruthOpen] = useState(false);
  const [callsOpen, setCallsOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);
  /** Calling with no minutes: free users see what Basic adds, members can top up. */
  const [callGate, setCallGate] = useState<'paywall' | 'out' | null>(null);
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);

  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const replyVersions = useAppStore((s) => (conversationId ? s.replyVersions[conversationId] : undefined));
  const regenerateReply = useAppStore((s) => s.regenerateReply);
  const showReplyVersion = useAppStore((s) => s.showReplyVersion);
  const editLastMessage = useAppStore((s) => s.editLastMessage);
  const rewindTo = useAppStore((s) => s.rewindTo);
  const continueChat = useAppStore((s) => s.continueChat);
  const skipTime = useAppStore((s) => s.skipTime);
  const memories = useAppStore((s) => s.memories);
  const pinMessage = useAppStore((s) => s.pinMessage);
  const unpinMessage = useAppStore((s) => s.unpinMessage);
  const endScene = useAppStore((s) => s.endScene);
  /** The short notice after a pin ("Pinned to Story"); it shows at once and goes by itself. */
  const [hud, setHud] = useState<string | null>(null);
  useEffect(() => {
    if (!hud) return;
    const timer = setTimeout(() => setHud(null), 1800);
    return () => clearTimeout(timer);
  }, [hud]);
  /** Your newest message while it is being changed in the field (canvas `ChatEdit.dc.html`). */
  const [editing, setEditing] = useState<Message | null>(null);
  const cancelEdit = useCallback(() => setEditing(null), []);
  useBackToClose(!!editing, cancelEdit);
  /** How far their newest reply follows a sideways swipe; all its bubbles share it. */
  const swipeOffset = useSharedValue(0);
  const reportMessage = useAppStore((s) => s.reportMessage);
  /** The message being reported; `reported` flips the sheet to a short thank-you. */
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reported, setReported] = useState(false);
  const openMenu = useCallback((message: Message) => {
    haptic.lift();
    setMenu(message);
  }, []);

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

  // Their newest reply: ↻ under it, then ‹ › and a swipe once there are versions (canvas
  // `ChatRegen.dc.html`). A crisis reply, with the helpline card, is never redone.
  const exchange = useMemo(() => lastExchange(data), [data]);
  // Lines kept word for word in Memories (Story) carry a pin in the chat.
  const pinnedIds = useMemo(
    () => new Set(memories.flatMap((m) => (m.quote && m.characterId === conversation?.characterId ? [m.quote.messageId] : []))),
    [memories, conversation?.characterId],
  );
  const versions = replyVersions && replyVersions.afterId === exchange?.anchor.id ? replyVersions : undefined;
  const canRedo = !!exchange?.burst.length && !exchange.crisis && !typing;
  // » under their newest reply and the "+" menu's Time skip (teardown item 5): null when they may go on.
  const block = useMemo(() => steerBlock(data, !!typing), [data, typing]);
  const burstIds = useMemo(() => new Set(exchange?.burst.map((m) => m.id) ?? []), [exchange]);
  const swipeable = canRedo && (versions?.versions.length ?? 0) > 1;
  const editableId = exchange?.anchor.kind === 'text' && !exchange.anchor.pending ? exchange.anchor.id : undefined;
  const stepVersion = useCallback(
    (delta: 1 | -1) => {
      if (!conversationId || !versions) return;
      const target = versions.index + delta;
      if (target < 0 || target >= versions.versions.length) return;
      haptic.selection();
      showReplyVersion(conversationId, target);
    },
    [conversationId, versions, showReplyVersion],
  );

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
      const bubble = (
        <MessageBubble
          message={item}
          character={character}
          animate={animations && Date.parse(item.createdAt) > openedAt}
          showAvatar={run.runStart}
          runEnd={run.runEnd}
          receipt={item.id === lastMine}
          onCallBack={callBack}
          onLongPress={openMenu}
          pinned={pinnedIds.has(item.id)}
        />
      );
      return (
        <>
          {run.timeBreak ? <DayChip iso={item.createdAt} /> : null}
          <View>
            {item.id === flash ? (
              <Animated.View exiting={FadeOut.duration(600)} pointerEvents="none" style={styles.flash} />
            ) : null}
            {swipeable && burstIds.has(item.id) ? (
              <VersionSwipe offset={swipeOffset} onStep={stepVersion}>
                {bubble}
              </VersionSwipe>
            ) : (
              bubble
            )}
          </View>
          {item.chips?.length && conversationId ? (
            <QuickReplies ideas={asIdeas(item.chips)} onPick={(idea) => pickChip(conversationId, item.id, idea.text)} />
          ) : conversationId && shownIdeas(item, data) ? (
            // A line they wrote first: answering it is free (`answerIdea`).
            <QuickReplies
              ideas={item.ideas!}
              onPick={(idea) => answerIdea(conversationId, item.id, idea)}
              onEdit={(idea) => setIdeaDraft({ messageId: item.id, idea, at: Date.now() })}
            />
          ) : null}
        </>
      );
    },
    [character, animations, openedAt, data, lastMine, flash, callBack, openMenu, conversationId, pickChip, answerIdea, swipeable, burstIds, swipeOffset, stepVersion, pinnedIds],
  );

  // Reply ideas under their last plain line (`everydayIdeas`) unless it carries its own.
  // System lines (the AI notice at a session's start) do not count as their last line.
  const last = data.findLast((m) => m.kind !== 'system' && m.kind !== 'call' && !m.card);
  // Before the user's first message, a created character's own first lines (quick create's
  // starters, D70) stand in for the test chips.
  const starters = character?.starters?.length && !data.some((m) => m.author === 'me') ? character.starters : null;
  const suggestions =
    last && last.author === 'them' && last.kind === 'text' && !last.card && !last.chips?.length && !shownIdeas(last, data) && !typing
      ? starters
        ? asIdeas(starters)
        : everydayIdeas(last.text, last.id)
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
    // A changed reply idea still answers the line it came from.
    const draftIdea = ideaDraft;
    setIdeaDraft(null);
    const result = draftIdea ? answerIdea(conversation.id, draftIdea.messageId, draftIdea.idea, text) : sendText(conversation.id, text);
    if (result === 'noShells') return outOfShells(shellCosts.textMessage);
    return result === 'sent';
  };

  // A new version and an edit are new replies, so each costs what a message does.
  const redo = () => {
    if (regenerateReply(conversation.id) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  // So are a continue and a time skip: each is one reply of theirs.
  const goOn = () => {
    if (continueChat(conversation.id) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const skipTo = (skip: TimeSkip, to?: string) => {
    setSkipOpen(false);
    if (skipTime(conversation.id, skip, to) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const saveEdit = (text: string) => {
    if (editLastMessage(conversation.id, text) === 'noShells') return outOfShells(shellCosts.textMessage);
    setEditing(null);
    return true;
  };

  // An action sheet first (HIG Action sheets): a rewind deletes what came after.
  const askRewind = (message: Message) =>
    confirmAction({
      title: t('chat.rewindTitle', { count: laterCount(data, message.id) }),
      action: t('chat.rewind'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        setEditing(null);
        rewindTo(conversation.id, message.id);
      },
    });

  const pickPhoto = async () => {
    setAttachOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri && sendImage(conversation.id, uri) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const attach = (key: AttachKey) => {
    setAttachOpen(false);
    switch (key) {
      case 'scene':
        return router.push({ pathname: '/scenes/[conversationId]', params: { conversationId: conversation.id } });
      case 'timeSkip':
        return setSkipOpen(true);
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
              contentContainerStyle={[styles.list, { paddingTop: headerRoom + (alarmRinging || conversation.scene ? ALARM_ROOM : 0) }]}
              showsVerticalScrollIndicator={false}
              renderItem={renderItem}
              ListFooterComponent={
                <>
                  {canRedo || !block ? (
                    <ReplyControls
                      count={versions?.versions.length ?? 1}
                      index={versions?.index ?? 0}
                      onStep={stepVersion}
                      onRedo={canRedo ? redo : undefined}
                      onContinue={block ? undefined : goOn}
                    />
                  ) : null}
                  {suggestions ? (
                    <QuickReplies
                      ideas={suggestions}
                      onPick={(idea) => send(idea.text)}
                      onEdit={(idea) => setIdeaDraft(last ? { messageId: last.id, idea, at: Date.now() } : null)}
                    />
                  ) : null}
                  {typing ? <TypingRow characters={[character]} /> : null}
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
            {!artWallpaper ? <HeaderFade color={background[0]} room={headerRoom} /> : null}
            {/* While you edit, the chat fades back; a tap on it cancels the edit. */}
            {editing ? (
              <Pressable
                style={styles.veil}
                onPress={cancelEdit}
                accessibilityRole="button"
                accessibilityLabel={t('chat.cancelEdit')}
              />
            ) : null}
            {hud ? (
              <View pointerEvents="none" style={styles.hudWrap} accessibilityLiveRegion="polite">
                <View style={styles.hud}>
                  <Ionicons name="pin" size={15} color={colors.textOnInk} />
                  <Txt style={styles.hudText}>{hud}</Txt>
                </View>
              </View>
            ) : null}
          </View>

          <ChatInput
            placeholder={t('chat.inputPlaceholder', { name })}
            onSend={send}
            onAttach={() => setAttachOpen(true)}
            onVoice={() => setVoiceOpen(true)}
            initialValue={typeof draft === 'string' ? draft : undefined}
            fill={ideaDraft ? { text: ideaDraft.idea.text, at: ideaDraft.at } : undefined}
            editing={editing ? { id: editing.id, text: editing.text ?? '', onSave: saveEdit, onCancel: cancelEdit } : undefined}
          />
        </KeyboardAvoidingView>

        <ChatHeader
          avatar={<CharacterAvatar character={character} size={54} />}
          title={name}
          identityLabel={[name, t('chat.aiCharacter'), streak > 0 ? t('chat.streakShort', { count: streak }) : null, t('a11y.chatSettings')]
            .filter(Boolean)
            .join(', ')}
          onIdentity={() => router.push(`/character/${character.id}/settings`)}
          caption={
            // Always says what they are; the streak rides along once there is one.
            <>
              <CaptionText>{t('chat.aiCharacter')}</CaptionText>
              {streak > 0 ? (
                <>
                  <CaptionDot />
                  <Ionicons name="heart" size={10} color={colors.textSecondary} />
                  <CaptionText>{t('chat.streakShort', { count: streak })}</CaptionText>
                </>
              ) : null}
            </>
          }
          shells={shells}
          missedCall={missedToday}
          callLabel={t('a11y.call')}
          onCall={startCall}
          below={
            alarmRinging ? (
              <AlarmBar />
            ) : conversation.scene ? (
              <SceneBar title={conversation.scene.title} onSkip={() => setSkipOpen(true)} onEnd={() => endScene(conversation.id)} />
            ) : null
          }
        />
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
      <TimeSkipSheet visible={skipOpen} block={block} scene={conversation.scene?.title} onClose={() => setSkipOpen(false)} onPick={skipTo} />

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
        onEdit={
          menu && menu.id === editableId
            ? (message) => {
                setMenu(null);
                setEditing(message);
              }
            : undefined
        }
        onPin={
          menu?.kind === 'text' && menu.text
            ? (message) => {
                setMenu(null);
                if (pinnedIds.has(message.id)) return unpinMessage(message.id);
                if (!pinMessage(conversation.id, message.id)) return;
                haptic.success();
                setHud(t('chat.pinnedToast'));
              }
            : undefined
        }
        pinned={!!menu && pinnedIds.has(menu.id)}
        onRewind={
          menu && canRewindTo(data, menu.id)
            ? (message) => {
                setMenu(null);
                askRewind(message);
              }
            : undefined
        }
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


const styles = StyleSheet.create({
  flex: { flex: 1 },
  flash: { ...StyleSheet.absoluteFill, top: -3, bottom: -1, backgroundColor: colors.primarySoft },
  artWallpaper: { ...StyleSheet.absoluteFill },
  artWallpaperVeil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: isDark ? 'rgba(14,18,48,0.45)' : 'rgba(255,250,241,0.18)',
  },
  missing: { padding: space.xl },
  list: { paddingBottom: space.sm },
  veil: { ...StyleSheet.absoluteFill, backgroundColor: colors.veil },
  // iOS-style notice over the bottom of the chat, in ink with light text.
  hudWrap: { position: 'absolute', left: 0, right: 0, bottom: space.md, alignItems: 'center' },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 40,
    paddingLeft: space.md,
    paddingRight: space.lg,
    borderRadius: 20,
    backgroundColor: colors.text,
    ...shadows.raised,
  },
  hudText: { fontSize: 15, fontWeight: '600', color: colors.textOnInk },
});
