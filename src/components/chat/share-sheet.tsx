import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MessageBubble } from '@/components/chat/message-bubble';
import { runOf } from '@/components/chat/runs';
import { ShareCardSheet } from '@/components/share-card-sheet';
import { CharacterAvatar, Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';
import type { Character, Message } from '@/types';

const FACE = 44;

/** The line as the chat first drew it: no reaction, receipt or edit note, and its own reveal id so it shows whole. */
const plain = (m: Message): Message => ({ ...m, id: `share:${m.id}`, reaction: undefined, editedAt: undefined, failed: undefined });

/**
 * Share under their newest reply: the card is the chat and nothing else (owner, 2026-10-30): their
 * round face and name, then the thread up to their newest line, as many as six lines in the chat's
 * own bubbles and runs on a white panel (`shareLines` picks them), over the Sigmazam foot.
 */
export function ShareSheet({
  visible,
  onClose,
  character,
  lines,
}: {
  visible: boolean;
  onClose: () => void;
  character: Character;
  lines: Message[];
}) {
  const { t } = useTranslation();
  const said = lines.map((m) => (m.kind !== 'text' ? null : m.author === 'them' ? `${character.name}: ${m.text}` : m.text));
  const shown = lines.map(plain);

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      hint={t('chat.shareHint', { name: character.name })}
      fallback={[...said.filter(Boolean), t('app.name')].join('\n\n')}>
      <View style={styles.head}>
        <CharacterAvatar character={character} size={FACE} />
        <Txt variant="h3" lines={1} style={styles.name}>
          {character.name}
        </Txt>
      </View>

      {/* Content on the aurora stays solid (design-style §1): the bubbles sit on it as in a plain chat. */}
      <View style={styles.panel}>
        {shown.map((m, i) => {
          const run = runOf(shown, i);
          return (
            <MessageBubble key={m.id} message={m} character={character} showAvatar={run.runStart} runEnd={run.runEnd} animate={false} />
          );
        })}
      </View>
    </ShareCardSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  name: { flex: 1 },
  panel: {
    marginHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
});
