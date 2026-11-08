import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { FAMILY_LABELS, type FamilyLabel } from '@/lib/kin';
import { colors, fonts, friendColor, space, systemGround } from '@/theme';
import type { Character } from '@/types';

export interface FamilySeat {
  role: FamilyLabel;
  /** Who holds the role, and what the user calls them ("Onam"). */
  who?: { character: Character; name: string };
}

/**
 * Find's "Who do you miss?" (approved prototype, 2026-10-26; playful skin 2026-11-07): the eight
 * family roles as circles. A filled one is their face in a ring of their own hue and the name the
 * user gave, and opens the chat; an empty one is a dashed circle with a + and asks who it will be.
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
            <View style={[styles.ring, { borderColor: friendColor(who.character.id).fill }]}>
              <CharacterAvatar character={who.character} size={FACE} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="add" size={26} color={systemGround.label} />
            </View>
          )}
          <Txt
            style={[styles.label, !who && styles.labelEmpty]}
            lines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.3}>
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

/** The face inside a filled seat; ring and gap bring the seat to SEAT across, as an empty one. */
const FACE = 54;
const RING = 3;
const GAP = 2;
const SEAT = FACE + (RING + GAP) * 2;

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg, gap: 12 },
  seat: { width: 70, alignItems: 'center', gap: 6 },
  ring: { padding: GAP, borderWidth: RING, borderRadius: SEAT / 2 },
  empty: {
    width: SEAT,
    height: SEAT,
    borderRadius: SEAT / 2,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: systemGround.dash,
    backgroundColor: systemGround.well,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.playfulBold, fontSize: 12, lineHeight: 15, textAlign: 'center', color: systemGround.label },
  labelEmpty: { color: colors.textSecondary },
});
