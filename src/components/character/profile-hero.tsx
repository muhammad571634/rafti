import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { portraitPosition } from '@/components/chat/chat-ground';
import { InkText } from '@/components/ink';
import { CharacterAvatar, characterImage, portraitKey, PressableScale } from '@/components/ui';
import { friendAccent, friendColor, hitSlop, systemColors } from '@/theme';
import { SOLID_GLASS, useReduceTransparency } from '@/theme/a11y';
import { ink, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

const HERO_SCRIM = ['rgba(9,9,13,0.52)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.32)', ink.ground] as const;
const HERO_STOPS = [0, 0.24, 0.56, 1] as const;

export interface ProfileHeroProps {
  character: Character;
  name: string;
  eyebrow?: string;
  tagline?: string;
  voiceReady: boolean;
  topInset: number;
  onBack: () => void;
}

/**
 * Full-bleed Character Profile hero (approved Ink+ prototype): edge-to-edge portrait extending
 * under the status bar and melting cleanly into the `#09090D` obsidian ground, with floating
 * dark-glass back / Voice / AI pills on top and serif name + italic tagline below.
 */
export function ProfileHero({ character, name, eyebrow, tagline, voiceReady, topInset, onBack }: ProfileHeroProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [broken, setBroken] = useState(false);
  // Reduce Transparency (iOS): the back button and pills over the photo turn solid.
  const solid = useReduceTransparency();

  const accent = friendAccent(character.id);
  const hue = friendColor(character.id);
  const height = Math.round(Math.min(width * 1.0, 400)) + topInset;

  const key = portraitKey(character);
  const tall = key ? PORTRAITS[key] : undefined;
  const wide = HEROES[character.id];
  const rawSource = tall ?? wide ?? characterImage(character);
  const source = broken ? undefined : rawSource;

  return (
    <View style={[styles.wrap, { height }]}>
      {source != null ? (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          contentFit="cover"
          contentPosition={tall ? (portraitPosition(key ?? character.id, width / height) ?? { left: '50%', top: '16%' }) : { left: '50%', top: '18%' }}
          transition={150}
          style={StyleSheet.absoluteFill}
          onError={() => setBroken(true)}
          accessible={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: hue.fill }]}>
          <CharacterAvatar character={character} size={128} />
        </View>
      )}

      {/* Multi-stop scrim melting into ink.ground + subtle bottom-left friend glow (no live blur). */}
      <LinearGradient colors={HERO_SCRIM} locations={HERO_STOPS} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient
        colors={[`${accent.strong}38`, `${accent.strong}00`]}
        start={{ x: 0.12, y: 0.88 }}
        end={{ x: 0.72, y: 0.35 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Floating dark-glass top controls (Back on left; Voice ready + mandatory AI badge on right). */}
      <View style={[styles.topBar, { top: topInset + 6 }]}>
        <PressableScale
          onPress={onBack}
          scaleTo={0.88}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          style={[styles.backBtn, solid && styles.solid]}>
          <Ionicons name="chevron-back" size={22} color={ink.text} style={styles.backGlyph} />
        </PressableScale>

        <View style={styles.badges}>
          {voiceReady ? (
            <View style={[styles.pill, solid && styles.solid]} accessibilityLabel={t('find.voiceReady')}>
              <View style={styles.liveDot} />
              <InkText variant="caption" color={ink.text} lines={1}>
                {t('find.voiceReady')}
              </InkText>
            </View>
          ) : null}
          <View style={[styles.pill, solid && styles.solid]} accessibilityLabel={t('safety.ai')}>
            <InkText variant="caption" color={ink.text} lines={1}>
              {t('safety.ai')}
            </InkText>
          </View>
        </View>
      </View>

      <View style={styles.copy}>
        {eyebrow ? (
          <InkText variant="caption" color={accent.strong} lines={1} style={styles.eyebrow}>
            {eyebrow}
          </InkText>
        ) : null}
        <InkText variant="display" color={ink.text} lines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
          {name}
        </InkText>
        {tagline ? (
          <InkText variant="quote" color="rgba(255,255,255,0.82)" lines={2} style={styles.tagline}>
            {tagline}
          </InkText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', backgroundColor: ink.ground },
  fallback: { alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  solid: { backgroundColor: SOLID_GLASS },
  backGlyph: { marginLeft: -2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  liveDot: { width: 6, height: 6, borderRadius: inkRadius.pill, backgroundColor: systemColors.green },
  copy: { position: 'absolute', left: 20, right: 20, bottom: 14, gap: 4 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5 },
  tagline: { marginTop: 2 },
});
