import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type ViewInstance } from 'react-native';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { MessageBubble } from '@/components/chat/message-bubble';
import { AuroraBackground, BrandArt, Button, CharacterAvatar, SFIcon, Sheet, Txt } from '@/components/ui';
import type { ShareQuote } from '@/lib/chat-turns';
import { shareImage } from '@/lib/share';
import { aurora, colors, radius, space } from '@/theme';
import type { Character, Message } from '@/types';

const LOGO_HEIGHT = 20;
const PEEK_WIDTH = 60;

/** The line as the chat first drew it: no reaction, receipt or edit note, and its own reveal id so it shows whole. */
const plain = (m: Message): Message => ({ ...m, id: `share:${m.id}`, reaction: undefined, editedAt: undefined, failed: undefined });

/**
 * Share under their newest reply: a card on the aurora with who they are, your line and theirs in
 * the chat's own bubbles, and the Sigmazam wordmark with the mascot peeking over the bottom edge.
 * Share sends the card as a picture through the system sheet (Save Image lives there on iOS);
 * Cancel, the scrim or Back closes it.
 */
export function ShareSheet({
  visible,
  onClose,
  character,
  quote,
}: {
  visible: boolean;
  onClose: () => void;
  character: Character;
  quote: ShareQuote;
}) {
  const { t } = useTranslation();
  const card = useRef<ViewInstance>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    const lines = [quote.mine?.text, `${character.name}: ${quote.theirs.text}`, t('app.name')];
    const shared = await shareImage(card, lines.filter(Boolean).join('\n\n'));
    setBusy(false);
    if (shared) onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} scroll>
      {/* Captured as the picture: collapsable={false} keeps the view real on Android. */}
      <View ref={card} collapsable={false} style={styles.card}>
        <AuroraBackground />
        <View style={styles.head}>
          <CharacterAvatar character={character} size={44} />
          <View style={styles.who}>
            <Txt variant="title" lines={1}>
              {character.name}
            </Txt>
            <Txt variant="caption" color={aurora.textMuted}>
              {t('chat.aiCharacter')}
            </Txt>
          </View>
        </View>
        <View style={styles.lines}>
          {quote.mine ? (
            <MessageBubble message={plain(quote.mine)} character={character} showAvatar runEnd animate={false} />
          ) : null}
          <MessageBubble message={plain(quote.theirs)} character={character} showAvatar runEnd animate={false} />
        </View>
        <View style={styles.foot}>
          <Image source={BRAND.logo} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
        </View>
        <BrandArt name="peek" width={PEEK_WIDTH} style={styles.peek} />
      </View>
      <View style={styles.actions}>
        <Button
          label={t('chat.share')}
          size="lg"
          full
          loading={busy}
          onPress={share}
          left={<SFIcon ios="square.and.arrow.up" icon="share-outline" size={18} color={colors.textOnPrimary} />}
        />
        <Button label={t('common.cancel')} variant="ghost" full onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Concentric with the sheet: its 38pt corner less the 16pt inset.
  card: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', marginTop: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingBottom: space.md },
  who: { flex: 1, gap: 2 },
  lines: { paddingBottom: space.xs },
  foot: { height: 52, justifyContent: 'center', paddingHorizontal: space.lg },
  logo: { width: LOGO_HEIGHT * BRAND_ASPECT.logo, height: LOGO_HEIGHT },
  // Its flat-cut body sits on the card's bottom edge, as if peeking up from under it.
  peek: { position: 'absolute', right: space.lg, bottom: 0 },
  actions: { gap: space.xs, marginTop: space.lg },
});
