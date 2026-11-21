import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, type ListRenderItemInfo, type ViewInstance } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput, MessageBubble, TypingRow, VoiceSheet } from '@/components/chat';
import { useFollowNewest } from '@/components/chat/follow-newest';
import { JumpToNewest } from '@/components/chat/jump-to-newest';
import type { VoiceNote } from '@/components/chat/use-voice-note';
import { dropNote } from '@/lib/voice-files';
import { lastMineId, runOf } from '@/components/chat/runs';
import { DailyCallsSheet } from '@/components/chat/daily-calls-sheet';
import { AttachMenu, type AttachKey } from '@/components/chat/attach-menu';
import { MoreSheet } from '@/components/more-sheet';
import { CaptionText, ChatHeader, HEADER_ROOM, HeaderFade } from '@/components/chat/chat-header';
import { ChatGroundProvider, PictureEdge, PictureGround, PICTURE_EDGE, usePictureListTop } from '@/components/chat/chat-ground';
import { DayChip } from '@/components/chat/day-chip';
import type { BubbleAnchor } from '@/components/chat/message-bubble';
import { MessageMenu, useBackToClose } from '@/components/chat/message-menu';
import { playSend, useReceiveSound } from '@/components/chat/chat-sounds';
import { SwipeToReply } from '@/components/chat/reply-quote';
import { canReplyTo, replySnapshot } from '@/lib/reply-quote';
import { ReplyControls } from '@/components/chat/reply-controls';
import { ReportSheet } from '@/components/chat/report-sheet';
import { TimeSkipSheet } from '@/components/chat/time-skip-sheet';
import { TruthOrDareSheet } from '@/components/chat/truth-or-dare-sheet';
import { GroupAvatar } from '@/components/group-avatar';
import { useFreeOutGate } from '@/components/chat/free-used-sheet';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { CharacterAvatar, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { usePickPhoto } from '@/components/chat/use-pick-photo';
import { takeFocus } from '@/lib/chat-focus';
import { steerBlock } from '@/lib/chat-steer';
import { shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { freeMessagesLeftNow } from '@/lib/use-free-messages';
import { backgroundsById, chatArtBackgroundsById, CREAM_BG, shellCosts } from '@/mock';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, nightColors, space } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import { InkChip } from '@/components/ink';
import { BEAT_TURNS } from '@/lib/group-stories';
import type { Character, Message, ReplyTo, TimeSkip } from '@/types';

/** Secret notes, quizzes, dates and daily calls are for two: they open with one member. */
type WithOne = 'secretNote' | 'quiz' | 'date' | 'dailyCalls';

const ROW_AVATAR = 36;

/**
 * A group chat (approved prototype): the user and 2-3 friends. Each member's run of
 * bubbles carries their name; "typing" says who. Text, voice, photos and truth or dare
 * happen here; the two-person things open with the member the user picks.
 */
export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const messages = useAppStore((s) => (groupId ? s.messages[groupId] : undefined));
  const typingIds = useAppStore((s) => (groupId ? s.groupTyping[groupId] : undefined)) ?? NO_ONE;
  const shells = useAppStore((s) => s.wallet.shells);
  const withCalls = useAppStore((s) => callsIncluded(s.wallet));
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);
  const animations = useAppStore((s) => s.settings.chatAnimation);

  const sendGroupText = useAppStore((s) => s.sendGroupText);
  const sendGroupVoice = useAppStore((s) => s.sendGroupVoice);
  const sendGroupImage = useAppStore((s) => s.sendGroupImage);
  const pickPhoto = usePickPhoto();
  const continueGroup = useAppStore((s) => s.continueGroup);
  const nextGroupScene = useAppStore((s) => s.nextGroupScene);
  const retryGroupReply = useAppStore((s) => s.retryGroupReply);
  const invokeGroupMember = useAppStore((s) => s.invokeGroupMember);
  const skipGroupTime = useAppStore((s) => s.skipGroupTime);
  const playGroupTruthOrDare = useAppStore((s) => s.playGroupTruthOrDare);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const reportMessage = useAppStore((s) => s.reportMessage);

  const [attachOpen, setAttachOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const blurTarget = useRef<ViewInstance>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  /** The member on the wheel's other half; a new one each game. */
  const [truthWith, setTruthWith] = useState<Character | null>(null);
  const [withOne, setWithOne] = useState<WithOne | null>(null);
  const [callsWith, setCallsWith] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<number | null>(null);
  // The paywall opened for a message (not a photo): it then speaks of today's free messages.
  const [paywallForMessage, setPaywallForMessage] = useState(false);
  // Today's first paid message asks once (owner, 2026-11-16), as in a one-to-one chat.
  const freeOut = useFreeOutGate();
  const [callGate, setCallGate] = useState<'paywall' | 'out' | null>(null);
  const [menu, setMenu] = useState<Message | null>(null);
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reported, setReported] = useState(false);
  /** The message a search result pointed at, tinted for a moment. */
  const [flash, setFlash] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<BubbleAnchor>();
  /** The line your next message answers (swipe left on it, or Reply in the menu). */
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const cancelReply = useCallback(() => setReplyTo(null), []);
  useBackToClose(!!replyTo, cancelReply);
  const startReply = useCallback((message: Message) => setReplyTo(replySnapshot(message)), []);
  const openMenu = useCallback((message: Message, anchor?: BubbleAnchor) => {
    setMenuAnchor(anchor);
    haptic.lift();
    setMenu(message);
  }, []);
  // A double tap loves a line, a second one takes it back (Instagram), as in a one-to-one chat.
  const toggleLove = useCallback(
    (message: Message) => {
      if (!groupId) return;
      haptic.tap();
      reactToMessage(groupId, message.id, message.reaction === 'love' ? undefined : 'love');
    },
    [groupId, reactToMessage],
  );

  /** Scrolls to a line and tints it for a moment (a search result, a reply's quote). */
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const goToMessage = useCallback(
    (id: string) => {
      if (!groupId) return;
      const lines = useAppStore.getState().messages[groupId] ?? [];
      const at = lines.findIndex((m) => m.id === id);
      if (at < 0) return;
      // The list runs newest first.
      listRef.current?.scrollToIndex({ index: lines.length - 1 - at, animated: true, viewPosition: 0.5 });
      setFlash(id);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1600);
    },
    [groupId],
  );

  // Replies that land while the group is on screen are read, not unread.
  useFocusEffect(
    useCallback(() => {
      if (!groupId) return;
      setActiveConversation(groupId);
      // Back from a search result: scroll to that message and tint it (iOS Messages).
      const target = takeFocus(groupId);
      const timer = target ? setTimeout(() => goToMessage(target), 350) : undefined;
      return () => {
        clearTimeout(timer);
        setActiveConversation(null);
      };
    }, [groupId, setActiveConversation, goToMessage]),
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
  }, [messages?.length, typingIds.length]);

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const members = useMemo(
    () => (group?.memberIds ?? []).flatMap((m) => byId.get(m) ?? []),
    [group?.memberIds, byId],
  );
  const nameOf = useCallback(
    (character: Character) => shortName(displayName(character, relationships[character.id])),
    [relationships],
  );
  const names = groupTitle(members.map(nameOf));
  const title = group?.name || names;
  const data = useMemo(() => messages ?? [], [messages]);
  // Newest first for the inverted list: the group opens on its latest line with nothing to scroll (iOS Messages).
  const rows = useMemo(() => [...data].reverse(), [data]);
  const lastMine = useMemo(() => lastMineId(data), [data]);
  // » under the members' newest lines: they go on without the user (the one-to-one chat's rules).
  const block = useMemo(() => steerBlock(data, typingIds.length > 0), [data, typingIds.length]);
  // Everyone typing now, each once, in the order they started (members who left are skipped).
  const typers = useMemo(
    () => [...new Set(typingIds)].flatMap((id) => (group?.memberIds.includes(id) ? (byId.get(id) ?? []) : [])),
    [typingIds, group?.memberIds, byId],
  );
  const typingLabel =
    typers.length === 0
      ? undefined
      : typers.length === 1
        ? t('group.typing', { name: nameOf(typers[0]) })
        : typers.length === 2
          ? t('group.typingTwo', { a: nameOf(typers[0]), b: nameOf(typers[1]) })
          : t('group.typingMany', { a: nameOf(typers[0]), b: nameOf(typers[1]), c: nameOf(typers[2]) });
  // The group's own background (info → Chat background). Default swaps legacy brown ground for Ink obsidian.
  const backgroundId = group?.backgroundId ?? CREAM_BG;
  const artWallpaper = chatArtBackgroundsById[backgroundId];
  const wallpaper = backgroundsById[backgroundId] ?? backgroundsById.bg_plain;
  // An Art wallpaper is a picture: the one-to-one chat's picture look (`chat-ground.tsx`).
  const onPicture = !!artWallpaper;
  const onDefaultInk = !onPicture && (backgroundId === CREAM_BG || backgroundId === 'bg_plain');
  const screenGround = (onPicture ? [colors.black, colors.black] : onDefaultInk ? [ink.ground, ink.ground] : wallpaper.colors) as readonly [string, string];
  const headerFadeColor = onDefaultInk ? ink.ground : wallpaper.colors[0];
  const pictureTop = usePictureListTop(onPicture, insets.top + HEADER_ROOM);

  // Only messages that arrive while the group is open animate in.
  const [openedAt] = useState(() => Date.now());
  const fallback = members[0];
  // The title's "&" as it is: an English "and" read wrong in every other language.
  const noticeText = t('group.aiNotice', { names });
  // Whose line a quote is: "You" or the member's name.
  const you = t('search.you');
  const quoteTitle = useCallback(
    (quote: ReplyTo) => {
      if (quote.author === 'me') return you;
      const member = quote.characterId ? byId.get(quote.characterId) : undefined;
      return member ? nameOf(member) : '';
    },
    [you, byId, nameOf],
  );

  // A tap on a member's avatar: they speak now.
  const invoke = useCallback(
    (member: Character) => {
      if (!groupId) return;
      if (invokeGroupMember(groupId, member.id) === 'noShells') outOfShells(shellCosts.textMessage);
    },
    [groupId, invokeGroupMember],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => {
      const author = item.characterId ? byId.get(item.characterId) : undefined;
      const character = author ?? fallback;
      if (!character) return null;
      const run = runOf(data, data.length - 1 - index);
      const bubble = (
        <MessageBubble
          message={item}
          character={character}
          animate={animations && Date.parse(item.createdAt) > openedAt}
          showAvatar={run.runStart}
          runEnd={run.runEnd}
          receipt={item.id === lastMine}
          showTime={run.showTime}
          senderName={author ? nameOf(author) : undefined}
          accentColor={author ? friendAccent(author.id).strong : undefined}
          aiNoticeText={noticeText}
          onLongPress={openMenu}
          onDoubleTap={toggleLove}
          onRetry={item.failed && groupId ? () => retryGroupReply(groupId) : undefined}
          onAvatarPress={author ? invoke : undefined}
          quoteTitle={item.replyTo ? quoteTitle(item.replyTo) : undefined}
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
            {canReplyTo(item) ? <SwipeToReply onReply={() => startReply(item)}>{bubble}</SwipeToReply> : bubble}
          </View>
        </View>
      );
    },
    [data, byId, fallback, lastMine, flash, animations, openedAt, nameOf, noticeText, openMenu, toggleLove, groupId, retryGroupReply, invoke, quoteTitle, goToMessage, startReply],
  );

  if (!group || !groupId || members.length < 2) {
    return (
      <Screen background={colors.bgPlain}>
        <Txt style={styles.missing}>{t('group.notFound')}</Txt>
      </Screen>
    );
  }

  const outOfShells = (cost: number, message = true) => {
    setPaywallForMessage(message);
    setPaywall(cost);
    return false;
  };

  const sendNote = (note: VoiceNote) => {
    const result = sendGroupVoice(groupId, note.seconds, note.transcript, note.audioFile, note.levels);
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

  const send = (text: string) => {
    if (!freeOut.allow(shellCosts.textMessage)) return false;
    const result = sendGroupText(groupId, text, replyTo ?? undefined);
    if (result === 'sent') {
      setReplyTo(null);
      playSend();
    }
    if (result === 'noShells') return outOfShells(shellCosts.textMessage);
    return result === 'sent';
  };

  const goOn = () => {
    if (!freeOut.allow(shellCosts.textMessage)) return;
    if (continueGroup(groupId) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  // A group story: the user calls the cut (docs/group-stories.md); the chip lights up once the scene has run its course.
  const playing = group.story && !group.story.done ? group.story : undefined;
  const nextScene = () => {
    if (!freeOut.allow(shellCosts.textMessage)) return;
    if (nextGroupScene(groupId) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const skipTo = (skip: TimeSkip, to?: string) => {
    setSkipOpen(false);
    if (!freeOut.allow(shellCosts.textMessage)) return;
    if (skipGroupTime(groupId, skip, to) === 'noShells') outOfShells(shellCosts.textMessage);
  };

  const attach = (key: AttachKey) => {
    setAttachOpen(false);
    switch (key) {
      case 'photo':
        return pickPhoto((uri, aspect) => {
          if (sendGroupImage(groupId, uri, aspect) === 'noShells') outOfShells(shellCosts.textMessage, false);
        });
      case 'truthOrDare':
        return setTruthWith(members[Math.floor(Math.random() * members.length)]);
      case 'diary':
        return router.push('/diary/write');
      case 'timeSkip':
        return setSkipOpen(true);
      case 'scene':
      case 'twist':
      case 'branches':
        // Hidden in groups (`hide` on More): scenes, twists and branches are one-to-one chats' (0z286, 0z287).
        return;
      case 'more':
        return setMoreOpen(true);
      default:
        return setWithOne(key);
    }
  };

  /** The member picked for a two-person thing: their own flow, as from their chat. */
  const openWith = (kind: WithOne, character: Character) => {
    setWithOne(null);
    switch (kind) {
      case 'secretNote':
        return router.push(`/secret-note/${character.id}`);
      case 'quiz':
        return router.push({ pathname: '/quiz/[characterId]', params: { characterId: character.id } });
      case 'date':
        return router.push({ pathname: '/dating', params: { partner: character.id } });
      case 'dailyCalls':
        return setCallsWith(character.id);
    }
  };

  const startCall = () => {
    if (callMinutes > 0) return router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
    setCallGate(withCalls ? 'out' : 'paywall');
  };
  const openStore = (route: '/store/shell?tab=shells' | '/store/shell?tab=plans&plan=pro') => {
    setCallGate(null);
    router.push(route);
  };
  const openInfo = () => router.push({ pathname: '/group/[id]/info', params: { id: groupId } });
  // The list scrolls under the glass header; this much room keeps its first line clear.
  const headerRoom = insets.top + HEADER_ROOM;

  return (
    <Screen background={screenGround} statusBarStyle="light" edgeToEdge>
      {/* Always dark (appearance B, owner 2026-11-11): every ground takes the on-picture look. */}
      <ChatGroundProvider value>
      {/* What the menus blur on Android (expo-blur needs a target there). */}
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        {artWallpaper ? (
          <PictureGround picture={{ source: artWallpaper.image }} />
        ) : onDefaultInk ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(168,147,240,0.14)', 'rgba(9,9,13,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.ambient}
          />
        ) : null}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <View style={styles.flex}>
            <FlatList
              ref={listRef}
              data={rows}
              inverted
              keyExtractor={(item) => item.id}
              onScroll={onScroll}
              scrollEventThrottle={100}
              // The keyboard goes with a drag of the chat (iOS follows the finger).
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              // Inverted: the bottom padding is the room under the header at the top of the screen.
              contentContainerStyle={[styles.list, { paddingBottom: onPicture ? space.md : headerRoom }]}
              style={onPicture ? { marginTop: pictureTop } : undefined}
              fadingEdgeLength={onPicture ? { start: 0, end: PICTURE_EDGE } : undefined}
              showsVerticalScrollIndicator={false}
              renderItem={renderItem}
              // The header of an inverted list sits under the newest line.
              ListHeaderComponent={
                <>
                  {block ? null : <ReplyControls count={1} index={0} onStep={() => {}} onContinue={goOn} />}
                  {typers.length ? (
                    <TypingRow
                      characters={typers}
                      label={typingLabel}
                      accentColor={typers.length === 1 ? friendAccent(typers[0].id).strong : undefined}
                    />
                  ) : null}
                </>
              }
              // A row far up is not measured yet: jump near it, then aim again.
              onScrollToIndexFailed={(info) => {
                listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
                setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }), 120);
              }}
            />
            {onPicture ? <PictureEdge top={pictureTop} /> : null}
            <JumpToNewest visible={away} unseen={unseen} onPress={jump} />
            {!artWallpaper ? <HeaderFade color={headerFadeColor} room={headerRoom} /> : null}
          </View>

          {playing ? (
            <View style={styles.sceneRow}>
              <InkChip
                label={t('group.nextScene')}
                on={playing.turns >= BEAT_TURNS}
                onPress={nextScene}
              />
            </View>
          ) : null}
          <ChatInput
            key={groupId}
            draftId={groupId}
            placeholder={t('group.inputPlaceholder', { names })}
            onSend={send}
            onAttach={() => {
              if (!attachOpen) Keyboard.dismiss();
              setAttachOpen(!attachOpen);
            }}
            attachOpen={attachOpen}
            onFieldFocus={() => setAttachOpen(false)}
            onVoice={() => setVoiceOpen(true)}
            onVoiceNote={sendNote}
            canRecord={canRecord}
            replying={replyTo ? { quote: replyTo, title: quoteTitle(replyTo), onCancel: cancelReply } : undefined}
          />
          <AttachMenu visible={attachOpen} onClose={() => setAttachOpen(false)} onPick={attach} />
        </KeyboardAvoidingView>

        <ChatHeader
          avatar={<GroupAvatar members={members} size={46} ringColor={headerFadeColor} />}
          title={title}
          identityLabel={`${t('group.rowLabel', { name: title })}, ${t('group.members', { count: members.length })}, ${t('group.info')}`}
          onIdentity={openInfo}
          caption={
            // "2 AI characters": says what they are, as the one-to-one header does.
            <CaptionText>{t('group.members', { count: members.length })}</CaptionText>
          }
          callLabel={t('group.call')}
          onCall={startCall}
        />
      </BlurTargetView>

      <TimeSkipSheet visible={skipOpen} block={block} onClose={() => setSkipOpen(false)} onPick={skipTo} />
      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} onChatPick={attach} hide={['scene', 'twist', 'branches']} />

      {/* Two-person things: pick the member, then their own flow opens. */}
      <Sheet visible={!!withOne} onClose={() => setWithOne(null)} title={t('group.pickMember')}>
        <View style={styles.ways}>
          {members.map((member, index) => (
            <PressableScale
              key={member.id}
              scaleTo={0.99}
              style={[styles.way, index < members.length - 1 && styles.wayLine]}
              accessibilityRole="button"
              accessibilityLabel={displayName(member, relationships[member.id])}
              onPress={() => withOne && openWith(withOne, member)}>
              <View style={[styles.wayAvatarRing, { borderColor: friendAccent(member.id).strong }]}>
                <CharacterAvatar character={member} size={ROW_AVATAR - 4} />
              </View>
              <Txt style={styles.wayName} lines={1}>
                {displayName(member, relationships[member.id])}
              </Txt>
              <Ionicons name="chevron-forward" size={15} color={ink.text3} />
            </PressableScale>
          ))}
        </View>
      </Sheet>

      {truthWith ? (
        <TruthOrDareSheet
          visible
          onClose={() => setTruthWith(null)}
          character={truthWith}
          name={displayName(truthWith, relationships[truthWith.id])}
          onPlay={(target, kind) => playGroupTruthOrDare(groupId, truthWith.id, target, kind)}
        />
      ) : null}
      {callsWith ? <DailyCallsSheet visible onClose={() => setCallsWith(null)} characterId={callsWith} /> : null}

      <VoiceSheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        chatId={groupId}
        canRecord={canRecord}
        onSend={(note) => {
          setVoiceOpen(false);
          sendNote(note);
        }}
      />

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} chat message={paywallForMessage} />
      {freeOut.sheet}

      <CallPaywallSheet
        visible={callGate === 'paywall'}
        character={members[0]}
        name={displayName(members[0], relationships[members[0].id])}
        onClose={() => setCallGate(null)}
        onStarted={() => {
          setCallGate(null);
          router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
        }}
      />
      <OutOfMinutesSheet
        visible={callGate === 'out'}
        onAdded={() => {
          setCallGate(null);
          router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
        }}
        onNoShells={() => openStore('/store/shell?tab=shells')}
        onGetPro={() => openStore('/store/shell?tab=plans&plan=pro')}
        onDone={() => setCallGate(null)}
      />

      <MessageMenu
        anchor={menuAnchor}
        message={menu}
        blurTarget={blurTarget}
        onClose={() => setMenu(null)}
        onReact={(message, reaction) => {
          reactToMessage(groupId, message.id, reaction);
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
        onReply={
          menu && canReplyTo(menu)
            ? (message) => {
                setMenu(null);
                startReply(message);
              }
            : undefined
        }
        onDelete={(message) => {
          deleteMessage(groupId, message.id);
          if (message.audioFile) void dropNote(message.audioFile);
          setMenu(null);
        }}
      />

      <ReportSheet
        visible={!!reporting}
        reported={reported}
        onClose={() => setReporting(null)}
        onReport={(reason) => {
          if (reporting) reportMessage(groupId, reporting.id, reason);
          setReported(true);
        }}
      />
      </ChatGroundProvider>
    </Screen>
  );
}


/** Nobody typing: one shared empty list, so the selector does not make a new one each time. */
const NO_ONE: string[] = [];

const styles = StyleSheet.create({
  sceneRow: { flexDirection: 'row', justifyContent: 'center', paddingBottom: space.xs },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  flex: { flex: 1 },
  // As the one-to-one chat's art veil: the picture stays, the bubbles stay easy to read.
  missing: { padding: space.xl },
  flash: { ...StyleSheet.absoluteFill, top: -3, bottom: -1, backgroundColor: nightColors.primarySoft },
  list: { paddingTop: space.sm },
  ways: {
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  way: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.lg },
  wayLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  wayAvatarRing: {
    width: ROW_AVATAR,
    height: ROW_AVATAR,
    borderRadius: ROW_AVATAR / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wayName: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: ink.text },
});
