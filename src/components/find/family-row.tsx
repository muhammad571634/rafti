import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AuroraGlass, CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { FAMILY_LABELS, type FamilyLabel } from '@/lib/kin';
import { aurora, colors, shadows, space } from '@/theme';
import type { Character } from '@/types';

export interface FamilySeat {
  role: FamilyLabel;
  /** Who holds the role, and what the user calls them ("Onam"). */
  who?: { character: Character; name: string };
}

/**
 * Find's "Who do you miss?" (approved prototype, 2026-10-26): the eight family roles as circles,
 * a little smaller than Talk now's faces. A filled one is their face and the name the user gave
 * and opens the chat; an empty one is a glass + under the role and asks who it will be.
 */
export function FamilyRow({
  seats,
  onOpen,
  onChoose,
}: {
  seats: FamilySeat[];
  onOpen: (character: Character) => void;
  onChoose: (role: FamilyLabel) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {seats.map(({ role, who }) => (
        <PressableScale
          key={role}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={who ? t('find.yourRole', { name: who.name, role: phrase(role) }) : t('find.chooseRole', { role: phrase(role) })}
          onPress={() => (who ? onOpen(who.character) : onChoose(role))}
          style={styles.seat}>
          {who ? (
            <CharacterAvatar character={who.character} size={64} style={shadows.card} />
          ) : (
            <AuroraGlass style={styles.empty}>
              <Ionicons name="add" size={26} color={aurora.tint} />
            </AuroraGlass>
          )}
          <Txt style={[styles.label, !who && styles.labelEmpty]} lines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {who ? who.name : phrase(role)}
          </Txt>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/** The eight roles in order, each with whoever holds it. */
export const familySeats = (holder: (role: FamilyLabel) => FamilySeat['who']): FamilySeat[] =>
  FAMILY_LABELS.map((role) => ({ role, who: holder(role) }));

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg, gap: 12 },
  seat: { width: 70, alignItems: 'center', gap: space.sm },
  empty: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600', textAlign: 'center', color: colors.text },
  labelEmpty: { color: aurora.textMuted },
});
