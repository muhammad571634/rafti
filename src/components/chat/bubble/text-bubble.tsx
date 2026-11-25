import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { BubbleQuote } from '@/components/chat/reply-quote';
import { Txt } from '@/components/ui';
import { blockWords, bubbleBlocks, cutBlocks, plainText } from '@/lib/reply-engine';
import { useReveal } from '@/lib/reveal';
import { colors, space } from '@/theme';
import { ink, inkFace } from '@/theme/ink';
import type { Message } from '@/types';

import { bubbleStyles } from './styles';

export function TextBubble({
  message,
  mine,
  tail,
  accentColor,
  quoteTitle,
  onQuotePress,
}: {
  message: Message;
  mine: boolean;
  tail: boolean;
  accentColor?: string;
  quoteTitle?: string;
  onQuotePress?: (id: string) => void;
}) {
  const onPhoto = useOnPhoto();
  const muted = message.muted;
  const blocks = useMemo(() => bubbleBlocks(message), [message.parts, message.text]);
  const total = useMemo(() => blockWords(blocks), [blocks]);
  // A line that just arrived shows word by word (`src/lib/reveal.ts`); any other shows whole.
  const shown = useReveal(message.id, total);
  const revealing = shown < total;
  const visible = revealing ? cutBlocks(blocks, shown) : blocks;
  const hasActionBlock = blocks.some((b) => b.kind === 'action');
  const speechColor = muted ? colors.bubbleTranscriptText : mine ? colors.bubbleSelfText : onPhoto ? colors.onMedia : colors.bubbleOtherText;
  const actionStyle = mine ? styles.actionMine : onPhoto ? styles.photoAction : styles.actionTheirs;

  return (
    <View
      style={[
        bubbleStyles.bubble,
        styles.fill,
        mine ? bubbleStyles.bubbleMine : bubbleStyles.bubbleTheirs,
        tail && (mine ? bubbleStyles.tailMine : bubbleStyles.tailTheirs),
        !mine && onPhoto && bubbleStyles.photoBubble,
        muted && styles.bubbleMuted,
      ]}>
      {message.replyTo && quoteTitle ? <BubbleQuote quote={message.replyTo} title={quoteTitle} onPress={onQuotePress} mine={mine} /> : null}
      {hasActionBlock ? (
        <View
          style={styles.blockStack}
          // A screen reader hears the whole line at once, not each word as it lands.
          accessible={revealing}
          accessibilityLabel={revealing ? plainText(message.text ?? '') : undefined}>
          {/* Variant A (0z290): narration in its own quiet barred block inside the bubble, spoken lines below in full ink. */}
          {visible.map((block, i) =>
            block.kind === 'action' ? (
              <View key={i} style={styles.actionBlock}>
                <View style={[styles.actionBar, mine ? styles.actionBarMine : accentColor ? { backgroundColor: accentColor, opacity: 0.9 } : styles.actionBarTheirs]} />
                <Txt style={[styles.actionBlockText, actionStyle]}>
                  {block.text}
                  {revealing && !mine && i === visible.length - 1 ? <Txt color={accentColor ?? ink.accent}>{' ▍'}</Txt> : null}
                </Txt>
              </View>
            ) : (
              <Txt key={i} style={styles.text} color={speechColor}>
                {block.segments.map((part, j) =>
                  part.kind === 'action' ? (
                    <Txt key={j} style={[styles.text, styles.action, actionStyle]}>
                      {part.text}
                    </Txt>
                  ) : (
                    part.text
                  ),
                )}
                {revealing && !mine && i === visible.length - 1 ? <Txt color={accentColor ?? ink.accent}>{' ▍'}</Txt> : null}
              </Txt>
            ),
          )}
        </View>
      ) : (
        <Txt
          style={styles.text}
          color={speechColor}
          // A screen reader hears the whole line at once, not each word as it lands.
          accessibilityLabel={revealing ? plainText(message.text ?? '') : undefined}>
          {visible.flatMap((block, i) =>
            block.kind === 'speech'
              ? block.segments.map((part, j) =>
                  part.kind === 'action' ? (
                    <Txt key={`${i}-${j}`} style={[styles.text, styles.action, actionStyle]}>
                      {part.text}
                    </Txt>
                  ) : (
                    part.text
                  ),
                )
              : [],
          )}
          {revealing && !mine ? <Txt color={accentColor ?? ink.accent}>{' ▍'}</Txt> : null}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { maxWidth: '100%' },
  text: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  blockStack: { gap: space.sm },
  actionBlock: { flexDirection: 'row', alignItems: 'stretch', gap: space.sm },
  actionBar: { width: 2, borderRadius: 1, marginVertical: 2 },
  actionBarTheirs: { backgroundColor: ink.accent, opacity: 0.55 },
  actionBarMine: { backgroundColor: colors.bubbleSelfText, opacity: 0.4 },
  actionBlockText: { flexShrink: 1, ...inkFace('sub'), fontStyle: 'italic' },
  action: { fontStyle: 'italic' },
  actionTheirs: { color: ink.text2 },
  actionMine: { color: colors.bubbleSelfText, opacity: 0.8 },
  bubbleMuted: { backgroundColor: colors.bubbleTranscript },
  photoAction: { color: colors.onMediaMuted },
});
