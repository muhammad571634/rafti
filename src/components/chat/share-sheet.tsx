import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MessageBubble } from '@/components/chat/message-bubble';
import { runOf } from '@/components/chat/runs';
import { AiTag, ShareCardPhoto, ShareCardSheet, ShareLevelPill } from '@/components/share-card-sheet';
import { CharacterAvatar, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Character, Message } from '@/types';

const PHOTO = 172;
const FACE = 44;

/** The line as the chat first drew it: no reaction, receipt or edit note, and its own reveal id so it shows whole. */
const plain = (m: Message): Message => ({ ...m, id: `share:${m.id}`, reaction: undefined, editedAt: undefined, failed: undefined });

/**
 * Share under their newest reply (owner's prototype, 2026-10-30, as direction): their photo with
 * who they are along its foot (face, name, "AI", closeness, world), then the thread up to their
 * newest line, as many as six lines in the chat's own bubbles and runs, on a white panel, in the
 * share card sheet (`shareLines` picks the lines).
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
  const relationship = useAppStore((s) => s.relationships[character.id]);
  const world = character.series ? phrase(character.series) : null;
  const fallback = [...lines.map((m) => (m.author === 'them' ? `${character.name}: ${m.text}` : m.text)), t('app.name')];
  const shown = lines.map(plain);

  const who = (
    <View style={styles.who}>
      <View style={styles.ring}>
        <CharacterAvatar character={character} size={FACE} />
      </View>
      <View style={styles.grow}>
        <View style={styles.nameRow}>
          <Txt style={styles.name} color={colors.onMedia} lines={1}>
            {character.name}
          </Txt>
          <AiTag />
        </View>
        <View style={styles.meta}>
          {relationship ? <ShareLevelPill level={relationship.level} title={relationship.levelTitle} /> : null}
          {world ? (
            <Txt variant="caption" color={colors.onMediaSoft} lines={1} style={styles.grow}>
              {world}
            </Txt>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      hint={t('chat.shareHint', { name: character.name })}
      fallback={fallback.join('\n\n')}>
      <ShareCardPhoto character={character} height={PHOTO}>
        {who}
      </ShareCardPhoto>

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
  grow: { flex: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  // A white ring lifts the face off the photo.
  ring: { padding: 2, borderRadius: radius.pill, backgroundColor: colors.onMedia },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flexShrink: 1, fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: 0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  panel: {
    marginHorizontal: space.md,
    marginTop: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
});
