import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale, Sheet, Txt } from '@/components/ui';
import { tierForLevel, TIERS } from '@/mock';
import { colors, radius, space } from '@/theme';

/**
 * "How closeness works": the five stages with their level ranges. Tapping a
 * stage shows the relationships it unlocks. With `level`, the user's stage is
 * marked and opened.
 */
export function ClosenessSheet({
  visible,
  onClose,
  level,
}: {
  visible: boolean;
  onClose: () => void;
  level?: number;
}) {
  const { t } = useTranslation();
  const current = level != null ? tierForLevel(level).key : undefined;
  const [open, setOpen] = useState<string | undefined>(current);

  useEffect(() => {
    if (visible) setOpen(current);
  }, [visible, current]);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('closeness.title')}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Txt variant="small" color={colors.textSecondary} style={styles.body}>
          {t('closeness.body')}
        </Txt>

        {TIERS.map((tier) => {
          const expanded = open === tier.key;
          const here = current === tier.key;
          return (
            <PressableScale
              key={tier.key}
              scaleTo={0.98}
              style={[styles.tier, here && styles.tierHere]}
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? undefined : tier.key)}>
              <View style={styles.head}>
                <View style={[styles.heart, here && styles.heartHere]}>
                  <Ionicons name={tier.from === 0 ? 'heart-outline' : 'heart'} size={18} color={colors.bond} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{tier.title}</Txt>
                  {here ? (
                    <Txt variant="caption" color={colors.bondText}>
                      {t('closeness.youAreHere')}
                    </Txt>
                  ) : null}
                </View>
                <Txt variant="smallStrong" color={colors.textMuted}>
                  {tier.from === tier.to
                    ? t('closeness.level', { level: tier.from })
                    : t('closeness.levels', { from: tier.from, to: tier.to })}
                </Txt>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </View>

              {expanded ? (
                <View style={styles.detail}>
                  {tier.labels.length ? (
                    <>
                      <Txt variant="caption" color={colors.textMuted}>
                        {t('closeness.unlocks')}
                      </Txt>
                      <View style={styles.labels}>
                        {tier.labels.map((label) => (
                          <View key={label} style={styles.label}>
                            <Txt variant="chip" color={colors.bondText}>
                              {label}
                            </Txt>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <Txt variant="small" color={colors.textSecondary}>
                      {t('closeness.nothing')}
                    </Txt>
                  )}
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 520 },
  body: { marginBottom: space.lg },
  tier: {
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierHere: { backgroundColor: colors.bondSoft, borderColor: colors.bond },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heart: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartHere: { backgroundColor: colors.surface },
  detail: { marginTop: space.md, marginLeft: 34 + space.md, gap: space.sm },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  label: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
});
