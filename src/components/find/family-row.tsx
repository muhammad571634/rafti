import { FAMILY_LABELS, type FamilyLabel } from '@/lib/kin';
import type { Character } from '@/types';

export interface FamilySeat {
  role: FamilyLabel;
  /** Who holds the role, and what the user calls them ("Onam"). */
  who?: { character: Character; name: string };
}

/**
 * The eight family roles of Find's "Who do you miss?", each with whoever holds it. The row of dashed
 * circles that drew them (2026-10-26) gave way to one living card (`miss-card.tsx`, owner's pick, 0z271).
 */
export const familySeats = (holder: (role: FamilyLabel) => FamilySeat['who']): FamilySeat[] =>
  FAMILY_LABELS.map((role) => ({ role, who: holder(role) }));
