import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import {
  Anim,
  Button,
  CharacterAvatar,
  Header,
  PressableScale,
  Screen,
  ShellBadge,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { shortName } from '@/lib/format';
import { shellCosts } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const STYLES = ['polaroid', 'film', 'studio', 'street'] as const;

interface Shot {
  id: number;
  characterId: string;
}

/**
 * A photo together with one friend: pick who and a style, then shoot. Each photo costs
 * shells, adds closeness and a moment on Us. Calm cards (docs/design-style.md): a preview
 * card, two pickers, and an action bar with the price.
 */
export default function PhotoBoothScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const shells = useAppStore((s) => s.wallet.shells);
  const takePhoto = useAppStore((s) => s.takePhoto);

  const known = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(known[0]?.id);
  const [style, setStyle] = useState<(typeof STYLES)[number]>('polaroid');
  const [shots, setShots] = useState<Shot[]>([]);
  const [shooting, setShooting] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);

  const partner = known.find((c) => c.id === partnerId);
  const previewHeight = Math.round((width - space.lg * 2) * 0.82);
  const thumbWidth = (width - space.lg * 2 - space.sm * 3) / 4;

  const shoot = () => {
    if (!partner) return;
    if (takePhoto(partner.id) === 'noShells') return setPaywall(shellCosts.photoBooth);

    setShooting(true);
    // The generated image lands here once the image model returns.
    setTimeout(() => {
      setShots((prev) => [{ id: Date.now(), characterId: partner.id }, ...prev]);
      setShooting(false);
    }, 1600);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('photoBooth.title')}
        right={<ShellBadge count={shells} tone="neutral" style={styles.balance} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={[styles.preview, { height: previewHeight }]}>
            {shooting ? (
              <Anim name="typing" size={48} tint={colors.textMuted} />
            ) : partner ? (
              <CharacterAvatar character={partner} size={150} style={styles.portrait} />
            ) : (
              <Txt variant="small" color={colors.textMuted}>
                {t('photoBooth.empty')}
              </Txt>
            )}
          </View>
          {partner ? (
            <View style={styles.caption}>
              <Txt variant="title" lines={1} style={styles.flex}>
                {t('photoBooth.together', { name: shortName(partner.name) })}
              </Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t(`photoBooth.styleNames.${style}`)}
              </Txt>
            </View>
          ) : null}
        </View>

        {known.length > 0 ? (
          <>
            <Txt variant="h3" style={styles.section}>
              {t('photoBooth.with')}
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partners}>
              {known.map((character) => {
                const on = character.id === partnerId;
                return (
                  <PressableScale
                    key={character.id}
                    style={styles.partner}
                    scaleTo={0.93}
                    accessibilityLabel={character.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => setPartnerId(character.id)}>
                    <View style={[styles.ring, on && styles.ringOn]}>
                      <CharacterAvatar character={character} size={52} />
                    </View>
                    <Txt variant="caption" lines={1} color={on ? colors.text : colors.textSecondary} style={on && styles.bold}>
                      {shortName(character.name)}
                    </Txt>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Txt variant="h3" style={styles.section}>
          {t('photoBooth.styles')}
        </Txt>
        <View style={styles.looks}>
          {STYLES.map((key) => {
            const on = style === key;
            return (
              <PressableScale
                key={key}
                scaleTo={0.97}
                dimOnPress={false}
                accessibilityState={{ selected: on }}
                onPress={() => setStyle(key)}
                style={[styles.look, on && styles.lookOn]}>
                <Txt variant="bodyStrong" color={on ? colors.text : colors.textSecondary}>
                  {t(`photoBooth.styleNames.${key}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </View>

        {shots.length > 0 ? (
          <>
            <Txt variant="h3" style={styles.section}>
              {t('photoBooth.yourPhotos')}
            </Txt>
            <View style={styles.gallery}>
              {shots.map((shot) => {
                const who = characters.find((c) => c.id === shot.characterId);
                return (
                  <View key={shot.id} style={[styles.thumb, { width: thumbWidth, height: thumbWidth * 1.25 }]}>
                    <View style={styles.thumbFill}>
                      {who ? <CharacterAvatar character={who} size={thumbWidth * 0.6} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Action bar (docs/design-style.md §3): the price is in the button. */}
      <View style={styles.actionBar}>
        <Button
          label={t('photoBooth.shoot')}
          size="lg"
          onPress={shoot}
          loading={shooting}
          disabled={!partner}
          full
          right={
            <View style={styles.cost}>
              <ShellIcon size={18} />
              <Txt variant="bodyStrong" color={colors.textOnPrimary}>
                {shellCosts.photoBooth}
              </Txt>
            </View>
          }
        />
        {partner ? (
          <Txt variant="caption" color={colors.textSecondary} center>
            {t('photoBooth.closer', { name: shortName(partner.name) })}
          </Txt>
        ) : null}
      </View>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  balance: { marginRight: space.sm },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xxl },
  card: {
    gap: space.md,
    padding: space.md + 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  portrait: { borderWidth: 4, borderColor: colors.surface, borderRadius: radius.pill },
  caption: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  section: { marginTop: space.xl, marginBottom: space.md },
  partners: { gap: space.md + 2 },
  partner: { width: 60, alignItems: 'center', gap: space.xs + 2 },
  ring: { padding: 2, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.text },
  looks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  look: {
    width: '48.8%',
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookOn: { backgroundColor: colors.surface, borderColor: colors.text },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumb: {
    padding: 4,
    paddingBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumbFill: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: space.xs },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
