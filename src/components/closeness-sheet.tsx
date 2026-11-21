import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Sheet, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { tierForLevel, TIERS } from '@/mock';
import { colors, space } from '@/theme';
import { ink, inkFace, inkRadius } from '@/theme/ink';

/**
 * "How closeness works": the five stages with their level ranges. Tapping a
 * stage shows the relationships it unlocks. With `level`, the user's stage is
 * marked and opened.
 */
export function ClosenessSheet({
  visible,
  onClose,
  level,
  accentColor,
}: {
  visible: boolean;
  onClose: () => void;
  level?: number;
  /** Optional friend accent to highlight the current closeness stage. */
  accentColor?: string;
}) {
  const { t } = useTranslation();
  const current = level != null ? tierForLevel(level).key : undefined;
  const [open, setOpen] = useState<string | undefined>(current);
  const tint = accentColor ?? colors.bond;
  const tintFill = accentColor ? `${accentColor}1E` : colors.bondSoft;
  const tintBorder = accentColor ? `${accentColor}66` : colors.bond;
  const tintText = accentColor ?? colors.bondText;

  useEffect(() => {
    if (visible) setOpen(current);
  }, [visible, current]);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('closeness.title')} scroll>
      <Txt style={styles.body} maxFontSizeMultiplier={1.25}>
        {t('closeness.body')}
      </Txt>

      {TIERS.map((tier) => {
        const expanded = open === tier.key;
        const here = current === tier.key;
        return (
          <PressableScale
            key={tier.key}
            scaleTo={0.98}
            style={[styles.tier, here && { backgroundColor: tintFill, borderColor: tintBorder }]}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setOpen(expanded ? undefined : tier.key)}>
            <View style={styles.head}>
              <View style={[styles.heart, here && { backgroundColor: `${tint}28` }]}>
                <Ionicons name={tier.from === 0 ? 'heart-outline' : 'heart'} size={17} color={tint} />
              </View>
              <View style={styles.flex}>
                <Txt style={styles.tierTitle} maxFontSizeMultiplier={1.3}>
                  {phrase(tier.title)}
                </Txt>
                {here ? (
                  <Txt style={[styles.hereLabel, { color: tintText }]} maxFontSizeMultiplier={1.25}>
                    {t('closeness.youAreHere')}
                  </Txt>
                ) : null}
              </View>
              <Txt style={[styles.levels, styles.tabular]} maxFontSizeMultiplier={1.25}>
                {tier.from === tier.to
                  ? t('closeness.level', { level: tier.from })
                  : t('closeness.levels', { from: tier.from, to: tier.to })}
              </Txt>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={ink.text3} />
            </View>

            {expanded ? (
              <View style={styles.detail}>
                {tier.labels.length ? (
                  <>
                    <Txt style={styles.unlocks} maxFontSizeMultiplier={1.2}>
                      {t('closeness.unlocks')}
                    </Txt>
                    <View style={styles.labels}>
                      {tier.labels.map((label) => (
                        <View key={label} style={[styles.labelChip, { backgroundColor: `${tint}20` }]}>
                          <Txt style={[styles.labelText, { color: tintText }]} maxFontSizeMultiplier={1.2}>
                            {phrase(label)}
                          </Txt>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <Txt style={styles.emptyDetail} maxFontSizeMultiplier={1.25}>
                    {t('closeness.nothing')}
                  </Txt>
                )}
              </View>
            ) : null}
          </PressableScale>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  body: { ...inkFace('footnote'), color: ink.text2, marginBottom: space.md },
  tier: {
    padding: 14,
    marginBottom: 9,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heart: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ink.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierTitle: { ...inkFace('body'), fontSize: 15.5, lineHeight: 20, fontWeight: '600', color: ink.text },
  hereLabel: { ...inkFace('caption'), fontSize: 12, lineHeight: 16, marginTop: 1 },
  levels: { ...inkFace('footnoteStrong'), fontSize: 13, lineHeight: 17, color: ink.text2 },
  detail: { marginTop: 12, marginLeft: 46, gap: 8 },
  unlocks: { ...inkFace('caption'), color: ink.text2 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  labelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  labelText: { ...inkFace('caption'), fontSize: 12.5, lineHeight: 16 },
  emptyDetail: { ...inkFace('footnote'), color: ink.text2 },
});
