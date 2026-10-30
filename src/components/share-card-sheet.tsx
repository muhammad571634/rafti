import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { HEROES } from '@/assets/heroes/registry';
import { AuroraBackground, BrandArt, Button, characterImage, ShellIcon, SFIcon, Sheet, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { shareImage } from '@/lib/share';
import { shareReward, useAppStore } from '@/store/use-app-store';
import { aurora, avatarGradients, colors, palette, radius, space } from '@/theme';
import type { Character } from '@/types';

const LOGO_HEIGHT = 22;
/** The mascot's width; its 720px art stays sharp well past this on a 3x screen. */
const PEEK_WIDTH = 92;
const PEEK_HEIGHT = PEEK_WIDTH / BRAND_ASPECT.peek;
/** The Today hero's scrim ink, top to bottom: the photo stays clear, its foot holds white words. */
const SCRIM = ['rgba(24,22,38,0)', 'rgba(24,22,38,0.25)', 'rgba(24,22,38,0.72)'] as const;
/** How long the ✓ shows after a paid share before the sheet closes. */
const PAID_MS = 800;

/**
 * The sheet every share card sits in (a chat's lines, a bond on Us): a title and one line saying
 * what the card is for, then the card on the aurora, its own content over the Sigmazam wordmark and
 * tagline with the mascot peeking up from the bottom corner. Share sends the card as a picture
 * through the system sheet (Save Image lives there on iOS), or `fallback` as text where a picture
 * cannot be made; ×, the scrim or Back closes it. The day's first shares pay a few shells
 * (`SHARE_REWARD`, owner 2026-10-30): the button shows "+5" while they do, and a ✓ when one paid.
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
  const reward = useAppStore((s) => shareReward(s.daily));
  const rewardShare = useAppStore((s) => s.rewardShare);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  const share = async () => {
    setBusy(true);
    const shared = await shareImage(card, fallback);
    const amount = shared ? await rewardShare() : 0;
    setBusy(false);
    if (!shared) return;
    if (!amount) return onClose();
    haptic.success();
    setPaid(true);
    setTimeout(() => {
      setPaid(false);
      onClose();
    }, PAID_MS);
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
        disabled={paid}
        onPress={share}
        style={styles.button}
        left={
          <SFIcon
            ios={paid ? 'checkmark.circle.fill' : 'square.and.arrow.up'}
            icon={paid ? 'checkmark-circle' : 'share-outline'}
            size={18}
            color={colors.textOnPrimary}
          />
        }
        right={reward > 0 || paid ? <RewardChip amount={reward || undefined} /> : null}
      />
    </Sheet>
  );
}

/** "+5 🐚" on a white pill: what a share pays today. Without `amount` it is just the shell, as paid. */
export function RewardChip({ amount, style }: { amount?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.chip, style]}>
      {amount ? <Txt style={styles.chipText}>{`+${amount}`}</Txt> : null}
      <ShellIcon size={14} />
    </View>
  );
}

/**
 * The card's top: their photo (the hero art, else their picture) under a scrim, with `children`
 * in white along its foot. A character with no picture yet gets their avatar's own gradient.
 */
export function ShareCardPhoto({ character, height, children }: { character: Character; height: number; children?: ReactNode }) {
  const photo = HEROES[character.id] ?? characterImage(character);
  return (
    <View style={{ height }}>
      {photo ? (
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      ) : (
        <LinearGradient colors={avatarGradients[character.accentIndex % avatarGradients.length]} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={SCRIM} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />
      {children ? <View style={styles.overPhoto}>{children}</View> : null}
    </View>
  );
}

/** "AI" on a clear glass tag, as on their intro card: an AI character is marked as one (store rule). */
export function AiTag() {
  const { t } = useTranslation();
  return (
    <View style={styles.aiTag}>
      <Txt style={styles.aiText} color={colors.onMedia}>
        {t('safety.ai')}
      </Txt>
    </View>
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: palette.shellText, fontVariant: ['tabular-nums'] },
  overPhoto: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md, gap: space.xs },
  // Clear glass on the photo (HIG Materials: the clear variant is for rich media).
  aiTag: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  aiText: { fontSize: 12, fontWeight: '600' },
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
