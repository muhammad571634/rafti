import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { InkText } from '@/components/ink';
import { moduleTile, PressableScale, Sheet, SymbolTile, type ModuleKey } from '@/components/ui';
import { colors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/** Every module Today reaches, in the order the More sheet lists them. */
export const TODAY_MODULES: { key: ModuleKey; route: string; label: string }[] = [
  { key: 'calls', route: '/call-history', label: 'home.short.calls' },
  { key: 'diary', route: '/diary', label: 'home.short.diary' },
  { key: 'store', route: '/store/shell', label: 'home.short.store' },
  { key: 'photo', route: '/photo-booth', label: 'home.short.photo' },
  { key: 'contacts', route: '/contacts', label: 'home.short.contacts' },
  { key: 'gifts', route: '/gifts', label: 'home.short.gifts' },
  { key: 'radio', route: '/radio', label: 'home.short.radio' },
  { key: 'board', route: '/board', label: 'home.short.board' },
  { key: 'date', route: '/dating', label: 'home.short.dating' },
  { key: 'sleep', route: '/bedtime', label: 'home.short.bedtime' },
];

/** The modules the More sheet lists: those no widget on Today stands in for. */
export const moreModules = (covered: ReadonlySet<ModuleKey>) => TODAY_MODULES.filter((m) => !covered.has(m.key));

/** Four to a row, as on the iPhone Home Screen; the tile is 58 pt where the phone allows it. */
const COLUMNS = 4;
const TILE_MAX = 58;

/**
 * Today's More (audit 2026-11-15 §6.1, approved prototype `docs/prototypes/today-calm.html`): every module
 * no widget stands in for, as a deep-tinted icon in a four-column grid, and "Choose widgets" under them.
 * It appears at once and scrolls inside, never taller than the screen. `badge` marks the module with
 * something waiting (a gift).
 */
export function TodayMoreSheet({
  visible,
  onClose,
  covered,
  badge,
  onChooseWidgets,
}: {
  visible: boolean;
  onClose: () => void;
  /** Modules a widget on Today already stands in for. */
  covered: ReadonlySet<ModuleKey>;
  badge?: ModuleKey;
  onChooseWidgets: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  // The sheet's own gutters take ~40 pt; a cell keeps 6 pt each side for its label.
  const tile = Math.min(TILE_MAX, Math.floor((width - 40) / COLUMNS) - 22);
  const shown = moreModules(covered);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('more.title')} scroll>
      <View style={styles.grid}>
        {shown.map((m) => {
          const waiting = m.key === badge;
          return (
            <PressableScale
              key={m.key}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={waiting ? t('a11y.unreadTab', { label: t(m.label), count: 1 }) : t(m.label)}
              onPress={() => {
                onClose();
                router.push(m.route as never);
              }}
              style={styles.cell}>
              <View>
                <SymbolTile {...moduleTile(m.key)} size={tile} deep />
                {waiting ? (
                  <View style={styles.badge}>
                    <InkText variant="caption" color={colors.white}>
                      1
                    </InkText>
                  </View>
                ) : null}
              </View>
              {/* Two lines at most: a long name wraps under its icon instead of being cut. */}
              <InkText variant="caption" color={ink.text} lines={2} style={styles.label}>
                {t(m.label)}
              </InkText>
            </PressableScale>
          );
        })}
      </View>
      <PressableScale
        scaleTo={0.97}
        accessibilityRole="button"
        onPress={() => {
          onClose();
          onChooseWidgets();
        }}
        style={styles.choose}>
        <InkText variant="subStrong" lines={1}>
          {t('home.chooseWidgets')}
        </InkText>
      </PressableScale>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, paddingTop: 4 },
  cell: { width: `${100 / COLUMNS}%`, minHeight: 44, alignItems: 'center', gap: 6, paddingHorizontal: 3 },
  label: { textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: inkRadius.pill,
    borderWidth: 2,
    borderColor: ink.card,
    backgroundColor: ink.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choose: {
    marginTop: 22,
    minHeight: 44,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: ink.raised,
  },
});
