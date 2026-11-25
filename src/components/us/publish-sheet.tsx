import type { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InkText } from '@/components/ink';
import { PressableScale, SFIcon, Sheet, ShellIcon } from '@/components/ui';
import { shellCosts } from '@/mock';
import { ink, inkRadius, inkTints } from '@/theme/ink';

export type PublishKind = 'plan' | 'alarm' | 'diary' | 'board';

/** What each costs, on its tile, before the tap (wake-ups and diary pages are free). */
const COST: Record<PublishKind, number> = { plan: shellCosts.planSetup, alarm: 0, diary: 0, board: shellCosts.boardNote };

/**
 * Four tiles in deep Ink tints: a plan in slate, a wake-up call in sleep indigo, a diary
 * page in dusk, and a board note in sea; white words on each.
 */
const OPTIONS: { kind: PublishKind; ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }[] = [
  { kind: 'plan', ios: 'calendar', icon: 'calendar', fill: inkTints[2][0] },
  { kind: 'alarm', ios: 'alarm.fill', icon: 'alarm', fill: inkTints[4][0] },
  { kind: 'diary', ios: 'book.closed.fill', icon: 'book', fill: inkTints[3][0] },
  { kind: 'board', ios: 'pin.fill', icon: 'pin', fill: inkTints[1][0] },
];

/** The [Us] "+": add a plan, set a wake-up call, write a diary page or pin a note on the board. */
export function PublishSheet({
  visible,
  onClose,
  onPick,
  name,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (kind: PublishKind) => void;
  /** The friend picked on Us, named in the hints. */
  name: string;
}) {
  const { t } = useTranslation();
  // The diary page from here goes to this friend, so its hint says so (the diary's own words).
  const hint = (kind: PublishKind) => (kind === 'diary' ? t('diary.shareWith', { name }) : t(`us.publishHint.${kind}`, { name }));
  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.add')} scroll>
      <View style={styles.tiles}>
        {OPTIONS.map(({ kind, ios, icon, fill }) => (
          <PressableScale
            key={kind}
            scaleTo={0.97}
            onPress={() => onPick(kind)}
            accessibilityRole="button"
            accessibilityLabel={[t(`us.publishKind.${kind}`), hint(kind), COST[kind] ? `${COST[kind]} ${t('common.shells')}` : ''].filter(Boolean).join(', ')}
            style={[styles.tile, { backgroundColor: fill }]}>
            <View style={styles.icon}>
              <SFIcon ios={ios} icon={icon} size={22} color={ink.text} />
            </View>
            <View style={styles.text}>
              <InkText variant="bodyStrong">{t(`us.publishKind.${kind}`)}</InkText>
              <InkText variant="footnote">{hint(kind)}</InkText>
            </View>
            {COST[kind] ? (
              <View style={styles.cost}>
                <ShellIcon size={14} />
                <InkText variant="subStrong" style={styles.tabular}>
                  {COST[kind]}
                </InkText>
              </View>
            ) : null}
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: inkRadius.field, borderCurve: 'continuous' },
  icon: {
    width: 48,
    height: 48,
    borderRadius: inkRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
  },
  text: { flex: 1, gap: 2 },
  cost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
