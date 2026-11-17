import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView } from 'expo-blur';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { FlatList, Keyboard, KeyboardAvoidingView, ListRenderItemInfo, Platform, Pressable, type ScrollViewProps, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewInstance, type ViewStyle } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput, LevelUpModal, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { composerKeyboardOffset } from '@/components/chat/chat-input';
import { AttachMenu, type AttachKey } from '@/components/chat/attach-menu';
import { MoreSheet } from '@/components/more-sheet';
import { CaptionText, ChatHeader, HEADER_ROOM, HeaderFade } from '@/components/chat/chat-header';
import { LevelUpTakeover } from '@/components/level-up';
import { ChatGroundProvider, PictureEdge, PictureGround, PICTURE_EDGE, PORTRAIT_BG, portraitOf, usePictureListTop } from '@/components/chat/chat-ground';
import { currentMood, temperamentFor } from '@/lib/reply-engine/mood';
import { DayChip } from '@/components/chat/day-chip';
import { IntroCard } from '@/components/chat/intro-card';
import type { BubbleAnchor } from '@/components/chat/message-bubble';
import { MessageMenu, useBackToClose } from '@/components/chat/message-menu';
import { OffSheet } from '@/components/chat/off-sheet';
import { NotedChip } from '@/components/mind/noted-chip';
import { ThreadSheet } from '@/components/mind/thread-sheet';
import { WhySheet } from '@/components/mind/why-sheet';
import { ReplyControls, VersionSwipe } from '@/components/chat/reply-controls';
import { playSend, useReceiveSound } from '@/components/chat/chat-sounds';
import { SwipeToReply } from '@/components/chat/reply-quote';
import { ShareSheet } from '@/components/chat/share-sheet';
import { ReportSheet } from '@/components/chat/report-sheet';
import { TimeSkipSheet } from '@/components/chat/time-skip-sheet';
import { ToneMenu } from '@/components/chat/tone-menu';
import type { VoiceNote } from '@/components/chat/use-voice-note';
import { dropNote } from '@/lib/voice-files';
import { useFollowNewest } from '@/components/chat/follow-newest';
import { JumpToNewest } from '@/components/chat/jump-to-newest';
import { lastMineId, runOf } from '@/components/chat/runs';
import { DailyCallsSheet } from '@/components/chat/daily-calls-sheet';
import { AlarmBar, QuickReplies, SceneBar } from '@/components/chat/quick-replies';
import { TruthOrDareSheet } from '@/components/chat/truth-or-dare-sheet';
import { useFreeOutGate } from '@/components/chat/free-used-sheet';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { CharacterAvatar, Header, Screen, Txt } from '@/components/ui';
import { usePickPhoto } from '@/components/chat/use-pick-photo';
import { takeFocus } from '@/lib/chat-focus';
import { steerBlock } from '@/lib/chat-steer';
import { canRewindTo, lastExchange, laterCount, laterNotes, shareLines } from '@/lib/chat-turns';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { reachReason } from '@/lib/mind';
import { isAskReach } from '@/lib/reach-ask';
import { shownIdeas } from '@/lib/reply-ideas';
import { type OffReason, type Rating, ratingOf } from '@/lib/reply-rating';
import { shownLines } from '@/lib/scenes';
import { pushPermission, requestPushPermission } from '@/notifications/sync';
import { CREAM_BG, shellCosts, backgroundsById, chatArtBackgroundsById, dayKey, todayKey } from '@/mock';
import { callsIncluded, displayName, minutesOf, shareReward, useAppStore } from '@/store/use-app-store';
// Always dark (appearance B, owner 2026-11-11): the chat reads the night tokens in both themes.
import { nightColors as colors, shadows, space } from '@/theme';
import { canReplyTo, replySnapshot } from '@/lib/reply-quote';
import { freeMessagesLeftNow } from '@/lib/use-free-messages';
import type { Message, MessageTone, ReplyIdea, ReplyTo, TimeSkip } from '@/types';
import { KC } from '@/lib/keyboard-native';

/** The alarm bar under the header while the wake-up alarm rings. */
const ALARM_ROOM = 44;
/** Stable, so the list does not get a new key function on every render. */
const messageKey = (m: Message) => m.id;

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
  const answerIdea = useAppStore((s) => s.answerIdea);
  const noteNotifyOff = useAppStore((s) => s.noteNotifyOff);
  /**
   * "Yes, text me!": the system asks for pushes now, the moment the user is most willing. Blocked
   * pushes leave a card with a way to Settings; web and Expo Go on Android have none to ask for.
   */
  const afterIdea = useCallback(
    (message: Message | undefined, idea: ReplyIdea) => {
      if (!conversationId || !isAskReach(message?.reach) || idea.intent !== 'yes') return;
      void (async () => {
        const status = await pushPermission();
        if (status === 'granted' || status === 'unsupported') return;
        const granted = status === 'undetermined' && (await requestPushPermission());
        if (!granted) noteNotifyOff(conversationId);
      })();
    },
    [conversationId, noteNotifyOff],
  );
  // The wake-up alarm rings until a real reply here (the morning chain).
  const alarmRinging = useAppStore((s) => s.wake?.state === 'ringing' && s.wake.conversationId === conversationId);
  const sendVoice = useAppStore((s) => s.sendVoice);
  const sendImage = useAppStore((s) => s.sendImage);
  const pickPhoto = usePickPhoto();
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const dismissLevelUp = useAppStore((s) => s.dismissLevelUp);

  const [attachOpen, setAttachOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  /** Sends what the field holds in the tone picked; set when send is held. */
  const sendToned = useRef<((tone: MessageTone) => void) | null>(null);
  /** The message a search result pointed at, tinted for a moment. */
  const [flash, setFlash] = useState<string | null>(null);
  const blurTarget = useRef<ViewInstance>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [truthOpen, setTruthOpen] = useState(false);
  const [callsOpen, setCallsOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);
  // The paywall opened for a message (not a photo): it then speaks of today's free messages.
  const [paywallForMessage, setPaywallForMessage] = useState(false);
  // Today's first paid message asks once (owner, 2026-11-16): the free count is used, a shell each now.
  const freeOut = useFreeOutGate();
  const [menu, setMenu] = useState<Message | null>(null);
  /** Keeping in mind: the thread a noted chip or Why? opened, and the line Why? is about. */
  const [threadOpen, setThreadOpen] = useState<string | null>(null);
  const [why, setWhy] = useState<Message | null>(null);
  /** Calling with no minutes: free users see what Basic adds, members can top up. */
  const [callGate, setCallGate] = useState<'paywall' | 'out' | null>(null);
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);

  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const replyVersions = useAppStore((s) => (conversationId ? s.replyVersions[conversationId] : undefined));
  const regenerateReply = useAppStore((s) => s.regenerateReply);
  const rateReply = useAppStore((s) => s.rateReply);
  const locale = useAppStore((s) => s.user.locale);
  /** "What was off?" after 👎, with the reason picked so far. */
  const [offOpen, setOffOpen] = useState(false);
  const [offReason, setOffReason] = useState<OffReason>();
  const stopReply = useAppStore((s) => s.stopReply);
  const setComposing = useAppStore((s) => s.setComposing);
  const retryReply = useAppStore((s) => s.retryReply);
  const showReplyVersion = useAppStore((s) => s.showReplyVersion);
  const editLastMessage = useAppStore((s) => s.editLastMessage);
  const rewindTo = useAppStore((s) => s.rewindTo);
  const continueChat = useAppStore((s) => s.continueChat);
  const skipTime = useAppStore((s) => s.skipTime);
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
  /** The line your next message answers (swipe left on it, or Reply in the menu). */
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const cancelReply = useCallback(() => setReplyTo(null), []);
  useBackToClose(!!replyTo, cancelReply);
  const startReply = useCallback((message: Message) => {
    setEditing(null);
    setReplyTo(replySnapshot(message));
  }, []);
  /** How far their newest reply follows a sideways swipe; all its bubbles share it. */
  const swipeOffset = useSharedValue(0);
  const reportMessage = useAppStore((s) => s.reportMessage);
  /** The message being reported; `reported` flips the sheet to a short thank-you. */
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reported, setReported] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<BubbleAnchor>();
  const openMenu = useCallback((message: Message, anchor?: BubbleAnchor) => {
    haptic.lift();
    setMenuAnchor(anchor);
    setMenu(message);
  }, []);
  // A double tap loves a line, a second one takes it back (Instagram); the menu holds the rest.
  const toggleLove = useCallback(
    (message: Message) => {
      if (!conversationId) return;
      haptic.tap();
      reactToMessage(conversationId, message.id, message.reaction === 'love' ? undefined : 'love');
    },
    [conversationId, reactToMessage],
  );

  /** Scrolls to a line and tints it for a moment (a search result, a reply's quote). */
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const goToMessage = useCallback(
    (id: string) => {
      if (!conversationId) return;
      // The list's own lines (a scene's end line before a new scene is not drawn), so the index matches.
      const lines = shownLines(useAppStore.getState().messages[conversationId] ?? []);
      const at = lines.findIndex((m) => m.id === id);
      if (at < 0) return;
      // The list runs newest first.
      listRef.current?.scrollToIndex({ index: lines.length - 1 - at, animated: true, viewPosition: 0.5 });
      setFlash(id);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1600);
    },
    [conversationId],
  );

  // Replies that land while this chat is on screen are read, not unread.
  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      setActiveConversation(conversationId);
      // Back from a search result: scroll to that message and flash it (iOS Messages).
      const target = takeFocus(conversationId);
      const timer = target ? setTimeout(() => goToMessage(target), 350) : undefined;
      return () => {
        clearTimeout(timer);
        setActiveConversation(null);
      };
    }, [conversationId, setActiveConversation, goToMessage]),
  );

  // A new line or typing keeps a reader at the newest end there; your own line always brings you back.
  const { onScroll, follow, jump, away, unseen } = useFollowNewest(listRef, messages?.length ?? 0);
  const newestMine = messages?.at(-1)?.author === 'me';
  // A soft pop as their line lands while you read (behind the message-sound switch).
  useReceiveSound(messages);
  useEffect(() => {
    follow(newestMine);
    // A new line or a typing flip, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length, typing]);

  const { width, height } = useWindowDimensions();
  const backgroundId = relationship?.backgroundId ?? CREAM_BG;
  // Their own picture is the default ground; an Art wallpaper is a picture too. Either takes the
  // owner's prototype look (2026-11-03): the face at the top, the conversation below it. A Classic
  // wallpaper keeps the light chat; a character with no picture falls back to the plain ground.
  const portrait = useMemo(
    () => (backgroundId === PORTRAIT_BG && character ? portraitOf(character, width / height) : undefined),
    [backgroundId, character, width, height],
  );
  const artWallpaper = chatArtBackgroundsById[backgroundId];
  const picture = portrait ?? (artWallpaper ? { source: artWallpaper.image } : undefined);
  const onPicture = !!picture;
  const pictureTop = usePictureListTop(onPicture, insets.top + HEADER_ROOM + (alarmRinging || conversation?.scene ? ALARM_ROOM : 0));
  const wallpaper = backgroundsById[backgroundId] ?? backgroundsById.bg_plain;
  const background = wallpaper.colors;
  const data = useMemo(() => messages ?? [], [messages]);
  // What the list draws: a scene's end line is left out when a new scene card follows it (`shownLines`).
  const shown = useMemo(() => shownLines(data), [data]);
  // Newest first for the inverted list: the chat opens on its latest line with nothing to scroll (iOS Messages).
  const rows = useMemo(() => [...shown].reverse(), [shown]);

  // Their newest reply: ↻ under it, then ‹ › and a swipe once there are versions (canvas
  // `ChatRegen.dc.html`). A crisis reply, with the helpline card, is never redone.
  const exchange = useMemo(() => lastExchange(data), [data]);
  // Lines kept word for word in Memories (Story) carry a pin in the chat.
  // Only these ids are read, so a memory saved about anyone else does not re-render the chat (Step 3.8).
  const pinnedList = useAppStore(
    useShallow((s) =>
      s.memories.flatMap((m) => (m.quote && m.characterId === conversation?.characterId ? [m.quote.messageId] : [])),
    ),
  );
  const pinnedIds = useMemo(() => new Set(pinnedList), [pinnedList]);
  const versions = replyVersions && replyVersions.afterId === exchange?.anchor.id ? replyVersions : undefined;
  const canRedo = !!exchange?.burst.length && !exchange.crisis && !typing;
  const rating = useMemo(() => (exchange ? ratingOf(exchange.burst) : undefined), [exchange]);
  // Share under their newest reply: your line and theirs on a picture card.
  // The thread a share card shows (as many as six lines); null while their reply has no words yet.
  const shared = useMemo(() => (typing ? null : shareLines(data)), [data, typing]);
  const reward = useAppStore((s) => shareReward(s.daily, character ? `chat:${character.id}` : undefined));
  const [sharing, setSharing] = useState(false);
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
  const retry = useCallback(() => {
    if (conversationId) retryReply(conversationId);
  }, [conversationId, retryReply]);
  // The model's own chips ride only on the newest line: older replies keep none.
  const newestLineId = useMemo(() => data.findLast((m) => m.kind !== 'system' && m.kind !== 'call' && !m.card)?.id, [data]);
  // Whose line a quote is: "You" or their name as the header shows it.
  const theirName = character ? displayName(character, relationship) : '';
  const you = t('search.you');
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => {
      if (!character) return null;
      const run = runOf(shown, shown.length - 1 - index);
      const bubble = (
        <MessageBubble
          message={item}
          character={character}
          animate={animations && Date.parse(item.createdAt) > openedAt}
          showAvatar={run.runStart}
          runEnd={run.runEnd}
          receipt={item.id === lastMine}
          readFace
          showTime={run.showTime}
          onCallBack={callBack}
          onLongPress={openMenu}
          onDoubleTap={toggleLove}
          pinned={pinnedIds.has(item.id)}
          onRetry={item.failed ? retry : undefined}
          quoteTitle={item.replyTo ? (item.replyTo.author === 'me' ? you : theirName) : undefined}
          onQuotePress={goToMessage}
        />
      );
      return (
        // One View: an inverted list lays each cell out column-reverse, so a Fragment's
        // children would draw bottom to top (the day chip under its line).
        <View>
          {run.dayBreak ? <DayChip iso={item.createdAt} /> : null}
          <View>
            {item.id === flash ? (
              <Animated.View exiting={FadeOut.duration(600)} pointerEvents="none" style={styles.flash} />
            ) : null}
            {/* Their newest reply swipes both ways through its versions; any other line swipes left to answer it. */}
            {swipeable && burstIds.has(item.id) ? (
              <VersionSwipe offset={swipeOffset} onStep={stepVersion}>
                {bubble}
              </VersionSwipe>
            ) : canReplyTo(item) ? (
              <SwipeToReply onReply={() => startReply(item)}>{bubble}</SwipeToReply>
            ) : (
              bubble
            )}
          </View>
          {item.noted && item.author === 'me' ? <NotedChip noted={item.noted} onPress={setThreadOpen} /> : null}
          {/* No ready replies in the chat (owner, 2026-11-17: the user writes, a live conversation). The
              one exception is "May I text you?": its Yes is the only way to allow their pushes. */}
          {conversationId && isAskReach(item.reach) && shownIdeas(item, data) ? (
            <QuickReplies
              ideas={item.ideas!}
              onPick={(idea) => {
                answerIdea(conversationId, item.id, idea);
                afterIdea(item, idea);
              }}
            />
          ) : null}
        </View>
      );
    },
    [character, animations, openedAt, data, shown, lastMine, flash, callBack, openMenu, toggleLove, conversationId, answerIdea, afterIdea, swipeable, burstIds, swipeOffset, stepVersion, pinnedIds, retry, you, theirName, goToMessage, startReply],
  );

  if (!conversation || !character) {
    return (
      <Screen>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const outOfShells = (cost: number, message = true) => {
    setPaywallForMessage(message);
    setPaywall(cost);
    return false;
  };

  const send = (text: string, tone?: MessageTone) => {
    // The text stays in the field while the sheet says the free messages are used.
    if (!freeOut.allow(shellCosts.textMessage)) return false;
    // The composer stays live under the tone menu: a plain send closes it too.
    setToneOpen(false);
    const result = sendText(conversation.id, text, tone, replyTo ?? undefined);
    if (result === 'sent') {
      setReplyTo(null);
      playSend();
    }
    if (result === 'noShells') return outOfShells(shellCosts.textMessage);
    return result === 'sent';
  };

  const sendNote = (note: VoiceNote) => {
    const result = sendVoice(conversation.id, note.seconds, note.transcript, note.audioFile, note.language, note.levels);
    if (result === 'sent') playSend();
    if (result !== 'noShells') return;
    outOfShells(shellCosts.voiceMessage);
    if (note.audioFile) void dropNote(note.audioFile);
  };
  const canRecord = () => {
    // A voice line uses today's free count first (audit §6.3), so 0 shells does not stop the mic; read now, not at the last render (midnight).
    if (freeMessagesLeftNow() > 0 || shells >= shellCosts.voiceMessage) return freeOut.allow(shellCosts.voiceMessage);
    outOfShells(shellCosts.voiceMessage);
    return false;
  };

  // A new version and an edit are new replies, so each costs what a message does.
  const redo = (off?: OffReason) => {
    if (!freeOut.allow(shellCosts.textMessage)) return;
    if (regenerateReply(conversation.id, off) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  // 👍 👎 under their newest reply: a second tap takes the vote back; 👎 asks what was off.
  const rate = (vote: Rating) => {
    haptic.selection();
    if (rating === vote) return rateReply(conversation.id, undefined);
    rateReply(conversation.id, vote);
    if (vote === 'down') {
      setOffReason(undefined);
      setOffOpen(true);
    }
  };

  // So are a continue and a time skip: each is one reply of theirs.
  const goOn = () => {
    if (!freeOut.allow(shellCosts.textMessage)) return;
    if (continueChat(conversation.id) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const skipTo = (skip: TimeSkip, to?: string) => {
    setSkipOpen(false);
    if (!freeOut.allow(shellCosts.textMessage)) return;
    if (skipTime(conversation.id, skip, to) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const saveEdit = (text: string) => {
    if (!freeOut.allow(shellCosts.textMessage)) return false;
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
        // Read at the tap, not from the render: a note may have landed while the sheet was open.
        const notes = laterNotes(useAppStore.getState().messages[conversation.id], message.id);
        rewindTo(conversation.id, message.id);
        for (const name of notes) void dropNote(name);
      },
    });

  const attach = (key: AttachKey) => {
    setAttachOpen(false);
    switch (key) {
      case 'scene':
        return router.push({ pathname: '/scenes/[conversationId]', params: { conversationId: conversation.id } });
      case 'timeSkip':
        return setSkipOpen(true);
      case 'photo':
        return pickPhoto((uri, aspect) => {
          if (sendImage(conversation.id, uri, aspect) === 'noShells') outOfShells(shellCosts.textMessage, false);
        });
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
      case 'more':
        return setMoreOpen(true);
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
  // How they feel right now, under their name (canvas v3: alive); it fades back to their usual self.
  const mood = currentMood(relationship?.mood, temperamentFor(character), Date.now()).emotion;

  // The list scrolls under a glass header (iOS Messages); this much room keeps its first line clear.
  const headerRoom = insets.top + HEADER_ROOM;

  // The keyboard (audit Step 3.4): with keyboard-controller in the APK the composer rides the keyboard
  // frame by frame, the list lifts its newest lines by the same distance, and a drag down on the chat
  // takes the keyboard with the finger on Android too (iOS Messages). Older APKs keep the padding box.
  const keyboardLift = composerKeyboardOffset(insets.bottom);
  const renderChatScroll = useMemo(
    () =>
      ChatScroll
        ? (props: ScrollViewProps) => <ChatScroll {...props} inverted offset={keyboardLift} freeze={attachOpen} />
        : undefined,
    [keyboardLift, attachOpen],
  );


  return (
    <Screen background={(onPicture ? [colors.black, colors.black] : background) as readonly [string, string]} statusBarStyle="light" edgeToEdge>
      {/* Every ground is dark now, a picture or a wallpaper: the whole chat takes its on-picture look. */}
      <ChatGroundProvider value>
      {/* What the menus blur on Android (expo-blur needs a target there). */}
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        {/* Outside the keyboard's room, so the picture stays put while the keyboard is up. */}
        {picture ? <PictureGround picture={picture} /> : null}
        <KeyboardBox style={styles.flex} {...keyboardBoxProps}>
          <ChatGestureArea style={styles.flex}>
            <FlatList
              ref={listRef}
              data={rows}
              inverted
              keyExtractor={messageKey}
              // Lines differ in height, so no getItemLayout; smaller batches keep a scroll back through
              // a long history from stalling the JS thread (Step 3.8).
              initialNumToRender={14}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={40}
              windowSize={11}
              onScroll={onScroll}
              scrollEventThrottle={100}
              // The keyboard goes with a drag of the chat (iOS follows the finger).
              keyboardDismissMode={KC || Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              // With keyboard-controller the list lifts its newest lines with the keyboard, frame by frame.
              renderScrollComponent={renderChatScroll}
              // Inverted: the bottom padding is the room under the header at the top of the screen.
              contentContainerStyle={[styles.list, { paddingBottom: onPicture ? space.md : headerRoom + (alarmRinging || conversation.scene ? ALARM_ROOM : 0) }]}
              // On a picture the list starts under the header (lower while the keyboard is down), and
              // its older lines fade out there: inverted, so the list's end is the top (Android).
              style={onPicture ? { marginTop: pictureTop } : undefined}
              fadingEdgeLength={onPicture ? { start: 0, end: PICTURE_EDGE } : undefined}
              showsVerticalScrollIndicator={false}
              renderItem={renderItem}
              // The header of an inverted list sits under the newest line.
              ListHeaderComponent={
                <>
                  {/* Only ↻ and Share under it (owner's pick A, 0z269): Continue and 👎 are in its long-press menu. */}
                  {canRedo || (!block && shared) ? (
                    <ReplyControls
                      count={versions?.versions.length ?? 1}
                      index={versions?.index ?? 0}
                      onStep={stepVersion}
                      onRedo={canRedo ? () => redo() : undefined}
                      onShare={shared ? () => setSharing(true) : undefined}
                      shareReward={reward}
                    />
                  ) : null}
                  {typing ? <TypingRow characters={[character]} /> : null}
                </>
              }
              // The footer of an inverted list sits above the oldest line: who they are, first.
              ListFooterComponent={
                <IntroCard
                  character={character}
                  name={name}
                  locale={locale}
                  level={relationship?.level}
                  onPress={() => router.push(`/character/${character.id}`)}
                />
              }
              // A row far up is not measured yet: jump near it, then aim again.
              onScrollToIndexFailed={(info) => {
                listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
                setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }), 120);
              }}
            />
            {onPicture ? <PictureEdge top={pictureTop} /> : null}
            <JumpToNewest visible={away && !editing} unseen={unseen} onPress={jump} />
            {/* The ground fades out under the header, so bubbles slide away beneath the glass. */}
            {!onPicture ? <HeaderFade color={background[0]} room={headerRoom} /> : null}
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
            <ToneMenu
              visible={toneOpen}
              onClose={() => setToneOpen(false)}
              onPick={(tone) => {
                setToneOpen(false);
                sendToned.current?.(tone);
              }}
            />
          </ChatGestureArea>

          <ComposerBox lift={keyboardLift}>
            <ChatInput
            key={conversationId}
            draftId={conversationId}
            placeholder={t('chat.inputPlaceholder', { name })}
            onSend={send}
            onHoldSend={(sendIt) => {
              sendToned.current = sendIt;
              setToneOpen(true);
            }}
            onAttach={() => {
              if (!attachOpen) Keyboard.dismiss();
              setAttachOpen(!attachOpen);
            }}
            attachOpen={attachOpen}
            onFieldFocus={() => setAttachOpen(false)}
            onVoice={() => setVoiceOpen(true)}
            onVoiceNote={sendNote}
            canRecord={canRecord}
            initialValue={typeof draft === 'string' ? draft : undefined}
            editing={editing ? { id: editing.id, text: editing.text ?? '', onSave: saveEdit, onCancel: cancelEdit } : undefined}
            replying={replyTo ? { quote: replyTo, title: replyTo.author === 'me' ? you : name, onCancel: cancelReply } : undefined}
            onStop={typing && conversationId ? () => stopReply(conversationId) : undefined}
            onTyping={conversationId ? (isTyping) => setComposing(conversationId, isTyping) : undefined}
            />
          </ComposerBox>
          <AttachMenu visible={attachOpen} onClose={() => setAttachOpen(false)} onPick={attach} />
        </KeyboardBox>

        <ChatHeader
          avatar={<CharacterAvatar character={character} size={46} />}
          title={name}
          online
          identityLabel={[name, t('chat.aiCharacter'), typing ? t('chatList.typing') : t(`chat.mood.${mood}`), t('a11y.chatSettings')].join(', ')}
          onIdentity={() => router.push(`/character/${character.id}/settings`)}
          caption={
            // "typing…" while their reply is on its way; otherwise what they are and how they feel.
            typing ? (
              <CaptionText strong>{t('chatList.typing')}</CaptionText>
            ) : (
              // One line, cut only at its end: the short "AI" keeps the mood readable in long languages.
              <CaptionText>{`${t('chat.aiShort')} · ${t(`chat.mood.${mood}`)}`}</CaptionText>
            )
          }
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

      {LevelUpTakeover ? (
        <LevelUpTakeover
          event={levelUp?.characterId === character.id ? levelUp : null}
          character={character}
          characterName={name}
          onClose={dismissLevelUp}
        />
      ) : (
        <LevelUpModal
          event={levelUp?.characterId === character.id ? levelUp : null}
          characterName={name}
          onClose={dismissLevelUp}
        />
      )}


      <TruthOrDareSheet visible={truthOpen} onClose={() => setTruthOpen(false)} character={character} name={name} />
      <DailyCallsSheet visible={callsOpen} onClose={() => setCallsOpen(false)} characterId={character.id} />

      <VoiceSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        chatId={conversation.id}
        canRecord={canRecord}
        onSend={(note) => {
          setVoiceOpen(false);
          sendNote(note);
        }}
      />

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} chat message={paywallForMessage} />
      {freeOut.sheet}
      <TimeSkipSheet visible={skipOpen} block={block} scene={conversation.scene?.title} onClose={() => setSkipOpen(false)} onPick={skipTo} />
      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} onChatPick={attach} />

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
        anchor={menuAnchor}
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
          if (message.audioFile) void dropNote(message.audioFile);
          setMenu(null);
        }}
        onReply={
          menu && canReplyTo(menu)
            ? (message) => {
                setMenu(null);
                startReply(message);
              }
            : undefined
        }
        onEdit={
          menu && menu.id === editableId
            ? (message) => {
                setMenu(null);
                setReplyTo(null);
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
        onWhy={
          reachReason(menu?.reach)
            ? (message) => {
                setMenu(null);
                setWhy(message);
              }
            : undefined
        }
        onRewind={
          menu && canRewindTo(data, menu.id)
            ? (message) => {
                setMenu(null);
                askRewind(message);
              }
            : undefined
        }
        // Their newest reply leads its menu with what used to sit under it (owner's pick A, 0z269).
        onContinue={
          menu && menu.author === 'them' && !block && (burstIds.has(menu.id) || menu.id === newestLineId)
            ? () => {
                setMenu(null);
                goOn();
              }
            : undefined
        }
        onRateDown={
          menu && canRedo && burstIds.has(menu.id)
            ? () => {
                setMenu(null);
                rate('down');
              }
            : undefined
        }
        ratedDown={rating === 'down'}
      />

      <WhySheet
        message={why}
        character={character}
        onClose={() => setWhy(null)}
        onOpenThread={(threadId) => {
          setWhy(null);
          // One sheet at a time: iOS cannot show the next while the last one is still leaving.
          setTimeout(() => setThreadOpen(threadId), Platform.OS === 'ios' ? 350 : 0);
        }}
      />
      <ThreadSheet threadId={threadOpen} onClose={() => setThreadOpen(null)} />

      <OffSheet
        visible={offOpen}
        name={name}
        reason={offReason}
        onPick={(reason) => {
          setOffReason(reason);
          // The reason is kept with the 👎 even if they close the sheet without a new reply.
          rateReply(conversation.id, 'down', reason);
        }}
        onClose={() => setOffOpen(false)}
        onNewReply={() => {
          setOffOpen(false);
          redo(offReason);
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

      {shared ? <ShareSheet visible={sharing} onClose={() => setSharing(false)} character={character} /> : null}
      </ChatGroundProvider>
    </Screen>
  );
}


const COMPOSER_VEIL = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.94)'] as const;
const COMPOSER_VEIL_STOPS = [0, 0.3, 1] as const;

/** The chat's keyboard room: keyboard-controller lifts the parts itself; older APKs keep the padding box. */
const KeyboardBox = KC ? View : KeyboardAvoidingView;
const ChatScroll = KC?.KeyboardChatScrollView;
const keyboardBoxProps = KC ? {} : { behavior: 'padding' as const };
/** A drag starting this far above the keyboard (the composer's height) already takes it along. */
const GESTURE_OFFSET = 64;

/** Android: a drag down on the chat takes the keyboard with the finger, as iOS's interactive dismiss. */
function ChatGestureArea({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  if (KC && Platform.OS === 'android') {
    return (
      <KC.KeyboardGestureArea interpolator="ios" offset={GESTURE_OFFSET} style={style}>
        {children}
      </KC.KeyboardGestureArea>
    );
  }
  return <View style={style}>{children}</View>;
}

/**
 * The composer rides the keyboard frame by frame, its foot always `space.sm` over the keyboard's top
 * (iOS Messages): it starts to rise only once the keyboard covers its resting room (`lift`), so a drag
 * down never opens a gap between them (a progress-based offset did, mid-drag on the A51).
 */
function ComposerBox({ lift, children }: { lift: number; children: ReactNode }) {
  if (!KC) return <>{children}</>;
  return <StickyComposer lift={lift}>{children}</StickyComposer>;
}

function StickyComposer({ lift, children }: { lift: number; children: ReactNode }) {
  // KC is set whenever this renders (ComposerBox checks it), and it never changes while the app runs.
  const { height, progress } = KC!.useReanimatedKeyboardAnimation();
  const ride = useAnimatedStyle(() => ({ transform: [{ translateY: Math.min(0, height.value + lift) }] }), [lift]);
  // A drag down scrolls the chat with the finger, so lines pass behind the bar; iOS hides them under its
  // glass. Android cannot afford a live blur, so a dark veil rises with the keyboard (none at rest).
  const veil = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View style={ride}>
      <Animated.View pointerEvents="none" style={[styles.composerVeil, veil]}>
        <LinearGradient colors={COMPOSER_VEIL} locations={COMPOSER_VEIL_STOPS} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Behind the composer while the keyboard is up or moving: from a little above the bar to its foot.
  composerVeil: { position: 'absolute', left: 0, right: 0, top: -28, bottom: 0 },
  flex: { flex: 1 },
  flash: { ...StyleSheet.absoluteFill, top: -3, bottom: -1, backgroundColor: colors.primarySoft },
  list: { paddingTop: space.sm },
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
