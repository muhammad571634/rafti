import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, type SharedValue } from 'react-native-reanimated';

import { MessageBubble } from '@/components/chat';
import { DayChip } from '@/components/chat/day-chip';
import type { BubbleAnchor } from '@/components/chat/message-bubble';
import { NextChip } from '@/components/chat/next-chip';
import { QuickReplies } from '@/components/chat/quick-replies';
import { SwipeToReply } from '@/components/chat/reply-quote';
import { VersionSwipe } from '@/components/chat/reply-controls';
import { NotedChip } from '@/components/mind/noted-chip';
import { canReplyTo } from '@/lib/reply-quote';
import { nightColors as colors } from '@/theme';
import type { Character, Message, ReplyIdea } from '@/types';

/**
 * One line of the chat room's list, out of `src/app/chat/[id].tsx` (0z359): the day chip, the bubble
 * with its swipe (versions on their newest reply, reply-to on any other line), the noted chip, the
 * invitation chip and "May I text you?"'s answers. Behaviour and look unchanged.
 */
export interface ChatRowProps {
  item: Message;
  character: Character;
  run: { runStart: boolean; runEnd: boolean; showTime: boolean; dayBreak: boolean };
  animate: boolean;
  receipt: boolean;
  flashing: boolean;
  pinned: boolean;
  /** Their newest reply swipes through its versions; set only for its lines while there are some. */
  versionSwipe?: { offset: SharedValue<number>; onStep: (delta: 1 | -1) => void };
  quoteTitle?: string;
  /** The invitation under their newest line (0z283), until the user writes again. */
  next?: () => void;
  /** "May I text you?"'s answers: its Yes is the only way to allow their pushes. */
  ideas?: { list: ReplyIdea[]; onPick: (idea: ReplyIdea) => void };
  onCallBack: () => void;
  onLongPress: (message: Message, anchor?: BubbleAnchor) => void;
  onDoubleTap: (message: Message) => void;
  onRetry?: () => void;
  onQuotePress: (id: string) => void;
  onReply: (message: Message) => void;
  onNoted: (threadId: string) => void;
}

export function ChatRow({
  item,
  character,
  run,
  animate,
  receipt,
  flashing,
  pinned,
  versionSwipe,
  quoteTitle,
  next,
  ideas,
  onCallBack,
  onLongPress,
  onDoubleTap,
  onRetry,
  onQuotePress,
  onReply,
  onNoted,
}: ChatRowProps) {
  const bubble = (
    <MessageBubble
      message={item}
      character={character}
      animate={animate}
      showAvatar={run.runStart}
      runEnd={run.runEnd}
      receipt={receipt}
      readFace
      showTime={run.showTime}
      onCallBack={onCallBack}
      onLongPress={onLongPress}
      onDoubleTap={onDoubleTap}
      pinned={pinned}
      onRetry={onRetry}
      quoteTitle={quoteTitle}
      onQuotePress={onQuotePress}
    />
  );
  return (
    // One View: an inverted list lays each cell out column-reverse, so a Fragment's
    // children would draw bottom to top (the day chip under its line).
    <View>
      {run.dayBreak ? <DayChip iso={item.createdAt} /> : null}
      <View>
        {flashing ? <Animated.View exiting={FadeOut.duration(600)} pointerEvents="none" style={styles.flash} /> : null}
        {/* Their newest reply swipes both ways through its versions; any other line swipes left to answer it. */}
        {versionSwipe ? (
          <VersionSwipe offset={versionSwipe.offset} onStep={versionSwipe.onStep}>
            {bubble}
          </VersionSwipe>
        ) : canReplyTo(item) ? (
          <SwipeToReply onReply={() => onReply(item)}>{bubble}</SwipeToReply>
        ) : (
          bubble
        )}
      </View>
      {item.noted && item.author === 'me' ? <NotedChip noted={item.noted} onPress={onNoted} /> : null}
      {/* No ready replies in the chat (owner, 2026-11-17: the user writes, a live conversation). The
          one exception is "May I text you?": its Yes is the only way to allow their pushes. */}
      {/* A call, a date, a game their reply invited to (0z283): until the user writes again. */}
      {next && item.next ? <NextChip kind={item.next} onOpen={next} /> : null}
      {ideas ? <QuickReplies ideas={ideas.list} onPick={ideas.onPick} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flash: { ...StyleSheet.absoluteFill, top: -3, bottom: -1, backgroundColor: colors.primarySoft },
});
