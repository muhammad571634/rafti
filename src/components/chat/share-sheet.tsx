import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MessageBubble } from '@/components/chat/message-bubble';
import { ShareCardSheet, ShareLevelPill } from '@/components/share-card-sheet';
import { CharacterAvatar, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import type { ShareQuote } from '@/lib/chat-turns';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, radius, space } from '@/theme';
import type { Character, Message } from '@/types';

/** The line as the chat first drew it: no reaction, receipt or edit note, and its own reveal id so it shows whole. */
const plain = (m: Message): Message => ({ ...m, id: `share:${m.id}`, reaction: undefined, editedAt: undefined, failed: undefined });

/**
 * Share under their newest reply (owner's prototype, 2026-10-30, as direction): who they are
 * (closeness level, world, "AI character"), then your line and theirs in the chat's own bubbles on
 * a white panel, in the share card sheet.
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
  const about = [character.series ? phrase(character.series) : null, t('chat.aiCharacter')].filter(Boolean).join(' · ');
  const lines = [quote.mine?.text, `${character.name}: ${quote.theirs.text}`, t('app.name')];

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      hint={t('chat.shareHint', { name: character.name })}
      fallback={lines.filter(Boolean).join('\n\n')}>
      <View style={styles.head}>
        <CharacterAvatar character={character} size={52} />
        <View style={styles.who}>
          <Txt variant="title" lines={1}>
            {character.name}
          </Txt>
          {relationship ? <ShareLevelPill level={relationship.level} title={relationship.levelTitle} /> : null}
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
    </ShareCardSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  who: { flex: 1, alignItems: 'flex-start', gap: 3 },
  // Content on the aurora stays solid (design-style §1); the bubbles sit on it as on a plain chat.
  panel: {
    marginHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
});
