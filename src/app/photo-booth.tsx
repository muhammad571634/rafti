import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { planDate } from '@/components/plans/copy';
import { ProPaywallSheet } from '@/components/plans/pro-paywall-sheet';
import { Anim, Button, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { photoQuota } from '@/economy/plans';
import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const STYLES = ['polaroid', 'film', 'studio', 'street'] as const;

interface Shot {
  id: number;
  characterId: string;
}

/**
 * A photo together with one friend: pick who and a style, then shoot. Pictures are Pro only
 * (30 a period, 3 on the trial) and never sold for shells (backend-plan §15.10); each adds
 * closeness and a moment on Us. Calm cards (docs/design-style.md): a preview card, two
 * pickers, and an action bar with pictures left.
 */
export default function PhotoBoothScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const subscription = useAppStore((s) => s.wallet.subscription);
  const takePhoto = useAppStore((s) => s.takePhoto);

  const known = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(known[0]?.id);
  const [style, setStyle] = useState<(typeof STYLES)[number]>('polaroid');
  const [shots, setShots] = useState<Shot[]>([]);
  const [shooting, setShooting] = useState(false);
  const [locked, setLocked] = useState(false);

  const partner = known.find((c) => c.id === partnerId);
  // Null without Pro or the trial.
  const quota = photoQuota(subscription, Date.now());
  const previewHeight = Math.round((width - space.lg * 2) * 0.82);
  const thumbWidth = (width - space.lg * 2 - space.sm * 3) / 4;

  const shoot = () => {
    if (!partner) return;
    const result = takePhoto(partner.id);
    if (result === 'locked') return setLocked(true);
    if (result === 'usedUp') return;

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
        right={
          quota ? (
            <View style={[styles.pill, styles.balance]}>
              <Ionicons name="camera-outline" size={14} color={colors.text} />
              <Txt variant="smallStrong" style={styles.figure} accessibilityLabel={t('photoBooth.picturesLeft', { count: quota.left })}>
                {quota.left}
              </Txt>
            </View>
          ) : (
            <View style={[styles.pill, styles.proPill, styles.balance]}>
              <Txt variant="smallStrong" color={colors.brandText}>
                {t('plans.name.pro')}
              </Txt>
            </View>
          )
        }
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

      {/* Action bar (docs/design-style.md §3): pictures left above the button, or the Pro lock. */}
      <View style={styles.actionBar}>
        {quota ? (
          <View style={styles.meter}>
            <View style={styles.meterHead}>
              <Txt variant="smallStrong" style={[styles.flex, styles.figure]}>
                {t('photoBooth.left', { left: quota.left, total: quota.total })}
              </Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('photoBooth.resets', { date: planDate(quota.resetsAt) })}
              </Txt>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((quota.left / quota.total) * 100)}%` }]} />
            </View>
          </View>
        ) : null}
        <Button
          label={
            quota && quota.left <= 0
              ? t('photoBooth.backOn', { date: planDate(quota.resetsAt) })
              : t('photoBooth.shoot')
          }
          size="lg"
          onPress={shoot}
          loading={shooting}
          disabled={!partner || (quota != null && quota.left <= 0)}
          full
          left={quota ? undefined : <Ionicons name="lock-closed" size={17} color={colors.textOnPrimary} />}
        />
        {quota ? null : (
          <Txt variant="caption" color={colors.textSecondary} center>
            {t('photoBooth.withPro')}
          </Txt>
        )}
      </View>

      <ProPaywallSheet
        visible={locked}
        kind="photo"
        onClose={() => setLocked(false)}
        onStarted={() => {
          setLocked(false);
          shoot();
        }}
      />
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  proPill: { borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primarySofter },
  figure: { fontVariant: ['tabular-nums'] },
  meter: { gap: space.xs + 2, marginBottom: space.xs },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.text },
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
