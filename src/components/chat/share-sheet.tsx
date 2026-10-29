import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type ViewInstance } from 'react-native';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { MessageBubble } from '@/components/chat/message-bubble';
import { AuroraBackground, BrandArt, Button, CharacterAvatar, SFIcon, Sheet, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import type { ShareQuote } from '@/lib/chat-turns';
import { shareImage } from '@/lib/share';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, radius, space } from '@/theme';
import type { Character, Message } from '@/types';

const LOGO_HEIGHT = 22;
/** The mascot's width; its 720px art stays sharp well past this on a 3x screen. */
const PEEK_WIDTH = 92;
const PEEK_HEIGHT = PEEK_WIDTH / BRAND_ASPECT.peek;

/** The line as the chat first drew it: no reaction, receipt or edit note, and its own reveal id so it shows whole. */
const plain = (m: Message): Message => ({ ...m, id: `share:${m.id}`, reaction: undefined, editedAt: undefined, failed: undefined });

/**
 * Share under their newest reply (owner's prototype, 2026-10-30, as direction): a title and one line
 * saying what the card is for, then the card on the aurora: who they are (closeness level, world, "AI
 * character"), your line and theirs in the chat's own bubbles on a white panel, and the Sigmazam
 * wordmark and tagline with the mascot peeking up from the bottom corner. Share sends the card as a
 * picture through the system sheet (Save Image lives there on iOS); ×, the scrim or Back closes it.
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
  const relationship = useAppStore((s) => s.relationships[character.id]);
  const card = useRef<ViewInstance>(null);
  const [busy, setBusy] = useState(false);
  const about = [character.series ? phrase(character.series) : null, t('chat.aiCharacter')].filter(Boolean).join(' · ');

  const share = async () => {
    setBusy(true);
    const lines = [quote.mine?.text, `${character.name}: ${quote.theirs.text}`, t('app.name')];
    const shared = await shareImage(card, lines.filter(Boolean).join('\n\n'));
    setBusy(false);
    if (shared) onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.shareTitle')} scroll>
      <Txt variant="small" color={colors.textSecondary} center style={styles.hint}>
        {t('chat.shareHint', { name: character.name })}
      </Txt>

      {/* Captured as the picture: collapsable={false} keeps the view real on Android. */}
      <View ref={card} collapsable={false} style={styles.card}>
        <AuroraBackground />
        <View style={styles.head}>
          <CharacterAvatar character={character} size={52} />
          <View style={styles.who}>
            <Txt variant="title" lines={1}>
              {character.name}
            </Txt>
            {relationship ? (
              <View style={styles.level}>
                <SFIcon ios="heart.fill" icon="heart" size={11} color={colors.bond} />
                <Txt style={styles.levelText} lines={1}>
                  {`${t('closeness.level', { level: relationship.level })} · ${phrase(relationship.levelTitle)}`}
                </Txt>
              </View>
            ) : null}
            <Txt variant="caption" color={aurora.textMuted} lines={1}>
              {about}
            </Txt>
          </View>
        </View>

        <View style={styles.panel}>
          {quote.mine ? (
            <MessageBubble message={plain(quote.mine)} character={character} showAvatar runEnd animate={false} />
          ) : null}
          <MessageBubble message={plain(quote.theirs)} character={character} showAvatar runEnd animate={false} />
        </View>

        <View style={styles.foot}>
          <Image source={BRAND.logo} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
          <Txt variant="caption" color={aurora.textMuted} lines={1}>
            {t('app.tagline')}
          </Txt>
        </View>
        <BrandArt name="peek" width={PEEK_WIDTH} style={styles.peek} />
      </View>

      <Button
        label={t('chat.share')}
        size="lg"
        full
        loading={busy}
        onPress={share}
        style={styles.button}
        left={<SFIcon ios="square.and.arrow.up" icon="share-outline" size={18} color={colors.textOnPrimary} />}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: -space.sm, marginBottom: space.lg, paddingHorizontal: space.sm },
  // Concentric with the sheet: its 38pt corner less the 16pt inset.
  card: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  who: { flex: 1, alignItems: 'flex-start', gap: 3 },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.bondSoft,
  },
  levelText: { fontSize: 12, fontWeight: '600', color: colors.bondText },
  // Content on the aurora stays solid (design-style §1); the bubbles sit on it as on a plain chat.
  panel: {
    marginHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  // As tall as the mascot, so it never reaches the panel.
  foot: { minHeight: PEEK_HEIGHT + space.md, justifyContent: 'center', gap: 2, paddingHorizontal: space.lg, paddingRight: PEEK_WIDTH + space.lg },
  logo: { width: LOGO_HEIGHT * BRAND_ASPECT.logo, height: LOGO_HEIGHT },
  // Its flat-cut body sits on the card's bottom edge, as if peeking up from under it.
  peek: { position: 'absolute', right: space.md, bottom: 0 },
  button: { marginTop: space.lg },
});
