import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { SendPill } from '@/components/photo-booth/send-pill';
import { planDate } from '@/components/plans/copy';
import { ProPaywallSheet } from '@/components/plans/pro-paywall-sheet';
import { Anim, Button, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { photoQuota } from '@/economy/plans';
import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { BoothStyle } from '@/types';

const STYLES: BoothStyle[] = ['polaroid', 'film', 'studio', 'street'];

/**
 * A photo together with one friend: pick who and a style, then shoot. Pictures are Pro only
 * (30 a period, 3 on the trial) and never sold for shells (backend-plan §15.10); each adds
 * closeness and a moment on Us. The picture is drawn on the phone from the friend's art
 * (`BoothPicture`), kept in "Your photos", and goes to their chat only with Send. Calm cards
 * (docs/design-style.md): a preview card, two pickers, and an action bar with pictures left.
 */
export default function PhotoBoothScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  // The action bar sits above the phone's navigation bar.
  const insets = useSafeAreaInsets();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const subscription = useAppStore((s) => s.wallet.subscription);
  const photos = useAppStore((s) => s.photos);
  const takePhoto = useAppStore((s) => s.takePhoto);

  const known = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(known[0]?.id);
  const [style, setStyle] = useState<BoothStyle>('polaroid');
  // The picture just taken: the preview shows it (with Send) until the friend or style changes.
  const [freshId, setFreshId] = useState<string>();
  const [shooting, setShooting] = useState(false);
  const [locked, setLocked] = useState(false);

  const partner = known.find((c) => c.id === partnerId);
  const fresh = photos.find((p) => p.id === freshId);
  // Null without Pro or the trial.
  const quota = photoQuota(subscription, Date.now());
  const previewHeight = Math.round((width - space.lg * 2) * 0.82);
  // The preview's inner box, less a margin so the picture's edge and shadow show.
  const stage = { width: width - space.lg * 2 - (space.md + 3) * 2 - space.xl * 2, height: previewHeight - space.xl * 2 };
  const thumbWidth = (width - space.lg * 2 - space.sm * 3) / 4;
  const thumbHeight = thumbWidth * 1.25;

  const pickPartner = (id: string) => {
    setPartnerId(id);
    setFreshId(undefined);
  };
  const pickStyle = (key: BoothStyle) => {
    setStyle(key);
    setFreshId(undefined);
  };

  const shoot = () => {
    if (!partner) return;
    const result = takePhoto(partner.id, style);
    if (result === 'locked') return setLocked(true);
    if (result === 'usedUp') return;

    setShooting(true);
    setTimeout(() => {
      setFreshId(result.id);
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
            ) : fresh && partner ? (
              <>
                <BoothPicture
                  key={fresh.id}
                  photo={fresh}
                  character={partner}
                  width={fitWidth(fresh.style, stage)}
                  develop
                  style={fresh.style === 'polaroid' ? styles.tilt : undefined}
                />
                <SendPill photo={fresh} style={styles.send} />
              </>
            ) : partner ? (
              // What this style makes with this friend, before the shot.
              <BoothPicture
                photo={{ style, seed: 0, createdAt: new Date().toISOString() }}
                character={partner}
                width={fitWidth(style, stage)}
                style={style === 'polaroid' ? styles.tilt : undefined}
              />
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
                {t(`photoBooth.styleNames.${fresh?.style ?? style}`)}
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
                    onPress={() => pickPartner(character.id)}>
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
                onPress={() => pickStyle(key)}
                style={[styles.look, on && styles.lookOn]}>
                <Txt variant="bodyStrong" color={on ? colors.text : colors.textSecondary}>
                  {t(`photoBooth.styleNames.${key}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </View>

        {photos.length > 0 ? (
          <>
            <Txt variant="h3" style={styles.section}>
              {t('photoBooth.yourPhotos')}
            </Txt>
            <View style={styles.gallery}>
              {photos.map((photo) => {
                const who = characters.find((c) => c.id === photo.characterId);
                if (!who) return null;
                return (
                  <PressableScale
                    key={photo.id}
                    scaleTo={0.95}
                    accessibilityLabel={t('photoBooth.openPhoto', { name: shortName(who.name), date: planDate(Date.parse(photo.createdAt)) })}
                    onPress={() => router.push({ pathname: '/photo/[id]', params: { id: photo.id } })}
                    style={[styles.thumb, { width: thumbWidth, height: thumbHeight }]}>
                    <BoothPicture
                      photo={photo}
                      character={who}
                      width={fitWidth(photo.style, { width: thumbWidth - space.md, height: thumbHeight - space.md })}
                    />
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Action bar (docs/design-style.md §3): pictures left above the button, or the Pro lock. */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
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
  tilt: { transform: [{ rotate: '-2.5deg' }] },
  send: { position: 'absolute', top: space.sm, left: space.sm },
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
    borderRadius: 10,
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
