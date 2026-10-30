import { Image } from 'expo-image';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type ViewInstance } from 'react-native';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { AuroraBackground, BrandArt, Button, SFIcon, Sheet, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { shareImage } from '@/lib/share';
import { aurora, colors, radius, space } from '@/theme';

const LOGO_HEIGHT = 22;
/** The mascot's width; its 720px art stays sharp well past this on a 3x screen. */
const PEEK_WIDTH = 92;
const PEEK_HEIGHT = PEEK_WIDTH / BRAND_ASPECT.peek;

/**
 * The sheet every share card sits in (a chat's newest reply, a bond on Us): a title and one line
 * saying what the card is for, then the card on the aurora, its own content over the Sigmazam
 * wordmark and tagline with the mascot peeking up from the bottom corner. Share sends the card as a
 * picture through the system sheet (Save Image lives there on iOS), or `fallback` as text where a
 * picture cannot be made; ×, the scrim or Back closes it. Sharing pays nothing (`src/lib/share.ts`).
 */
export function ShareCardSheet({
  visible,
  onClose,
  hint,
  fallback,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  hint: string;
  fallback: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const card = useRef<ViewInstance>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    const shared = await shareImage(card, fallback);
    setBusy(false);
    if (shared) onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('common.shareAsPicture')} scroll>
      <Txt variant="small" color={colors.textSecondary} center style={styles.hint}>
        {hint}
      </Txt>

      {/* Captured as the picture: collapsable={false} keeps the view real on Android. */}
      <View ref={card} collapsable={false} style={styles.card}>
        <AuroraBackground />
        {children}
        <View style={styles.foot}>
          <Image source={BRAND.logo} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
          <Txt variant="caption" color={aurora.textMuted} lines={1}>
            {t('app.tagline')}
          </Txt>
        </View>
        <BrandArt name="peek" width={PEEK_WIDTH} style={styles.peek} />
      </View>

      <Button
        label={t('common.share')}
        size="lg"
        full
        loading={busy}
        onPress={share}
        style={styles.button}
        left={<SFIcon ios="square.and.arrow.up" icon="share-outline" size={18} color={colors.textOnPrimary} />}
      />
    </Sheet>
  );
}

/** "Lv 33 · Beloved" in the bond's mint, as the cards show how close you are. */
export function ShareLevelPill({ level, title }: { level: number; title: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.level}>
      <SFIcon ios="heart.fill" icon="heart" size={11} color={colors.bond} />
      <Txt style={styles.levelText} lines={1}>
        {`${t('closeness.level', { level })} · ${phrase(title)}`}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: -space.sm, marginBottom: space.lg, paddingHorizontal: space.sm },
  // Concentric with the sheet: its 38pt corner less the 16pt inset.
  card: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  // As tall as the mascot, so it never reaches the content above.
  foot: { minHeight: PEEK_HEIGHT + space.md, justifyContent: 'center', gap: 2, paddingHorizontal: space.lg, paddingRight: PEEK_WIDTH + space.lg },
  logo: { width: LOGO_HEIGHT * BRAND_ASPECT.logo, height: LOGO_HEIGHT },
  // Its flat-cut body sits on the card's bottom edge, as if peeking up from under it.
  peek: { position: 'absolute', right: space.md, bottom: 0 },
  button: { marginTop: space.lg },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.bondSoft,
  },
  levelText: { fontSize: 12, fontWeight: '600', color: colors.bondText },
});
