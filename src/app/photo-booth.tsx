import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { ShellIcon, Anim, Button, CharacterAvatar, Chip, ClayIcon, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, radius, space } from '@/theme';

const STYLES = ['polaroid', 'film', 'studio', 'street'] as const;

export default function PhotoBoothScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const wallet = useAppStore((s) => s.wallet);
  const takePhoto = useAppStore((s) => s.takePhoto);

  const known = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(known[0]?.id);
  const [style, setStyle] = useState<(typeof STYLES)[number]>('polaroid');
  const [shots, setShots] = useState<number[]>([]);
  const [shooting, setShooting] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);

  const partner = known.find((c) => c.id === partnerId);
  const frameWidth = width - space.lg * 2;

  const shoot = () => {
    if (!partner) return;
    if (takePhoto(partner.id) === 'noShells') return setPaywall(shellCosts.photoBooth);

    setShooting(true);
    // The generated image lands here once the image model returns.
    setTimeout(() => {
      setShots((prev) => [Date.now(), ...prev]);
      setShooting(false);
    }, 1600);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('photoBooth.title')}
        subtitle={t('photoBooth.subtitle')}
        right={
          <View style={styles.film}>
            <ClayIcon name="film" size={20} tile={false} />
            <Txt variant="caption" color={colors.text}>
              {wallet.film}
            </Txt>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.frame, { height: frameWidth * 1.15 }]}>
          {shooting ? (
            <Anim name="typing" size={48} tint={colors.textMuted} />
          ) : partner ? (
            <LinearGradient
              colors={avatarGradients[partner.accentIndex % avatarGradients.length]}
              style={styles.frameFill}>
              <CharacterAvatar character={partner}
                size={frameWidth * 0.36}
              />
              <Txt variant="title" color={colors.white} style={styles.frameName}>
                {partner.name}
              </Txt>
            </LinearGradient>
          ) : (
            <Txt variant="small" color={colors.textMuted}>
              {t('photoBooth.empty')}
            </Txt>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.partnerRow}
          contentContainerStyle={styles.partners}>
          {known.map((character) => (
            <PressableScale
              key={character.id}
              style={styles.partner}
              scaleTo={0.93}
              accessibilityLabel={character.name}
              accessibilityState={{ selected: character.id === partnerId }}
              onPress={() => setPartnerId(character.id)}>
              <CharacterAvatar character={character}
                size={46}
                ring={character.id === partnerId}
                ringColor={colors.text}
              />
            </PressableScale>
          ))}
        </ScrollView>

        <View style={styles.styles}>
          <Txt variant="smallStrong">{t('photoBooth.styles')}</Txt>
          <View style={styles.chips}>
            {STYLES.map((key) => (
              <Chip key={key} label={key} active={style === key} onPress={() => setStyle(key)} />
            ))}
          </View>
        </View>

        <Button
          label={t('photoBooth.shoot')}
          onPress={shoot}
          loading={shooting}
          disabled={!partner}
          full
          right={
            <View style={styles.cost}>
              <ShellIcon size={16} />
              <Txt variant="smallStrong" color={colors.white}>
                {shellCosts.photoBooth}
              </Txt>
            </View>
          }
        />

        {shots.length > 0 ? (
          <View style={styles.gallery}>
            {shots.map((shot, index) => (
              <View key={shot} style={styles.thumb}>
                <LinearGradient
                  colors={avatarGradients[index % avatarGradients.length]}
                  style={styles.thumbFill}
                />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: space.xs },
  film: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: space.sm,
  },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },
  frame: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frameFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frameName: { marginTop: space.md },
  partnerRow: { flexGrow: 0 },
  partners: { gap: space.md },
  partner: { alignItems: 'center' },
  styles: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  thumb: {
    width: 84,
    height: 110,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbFill: { flex: 1 },
});
