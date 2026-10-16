import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { FrameSwatch } from '@/components/photo-booth/frame-card';
import { SendPill } from '@/components/photo-booth/send-pill';
import { planDate } from '@/components/plans/copy';
import { ProPaywallSheet } from '@/components/plans/pro-paywall-sheet';
import { Anim, Button, CharacterAvatar, Header, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { photoQuota } from '@/economy/plans';
import { frameLook } from '@/lib/frames';
import { shortName } from '@/lib/format';
import { WORLDS, type World } from '@/mock/worlds';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { BoothStyle, PhotoFrame } from '@/types';

const STYLES: BoothStyle[] = ['polaroid', 'film', 'studio', 'street'];
const SWATCH = 56;

/** One choice in the frame row: plain, a world's frame (won in its quiz) or one the user made. */
interface FrameChoice {
  id: string;
  label: string;
  look?: PhotoFrame;
  world?: World;
  locked?: boolean;
  mine?: boolean;
}

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
  const wonFrames = useAppStore((s) => s.wonFrames);
  const userFrames = useAppStore((s) => s.frames);
  // A world quiz sends the user here with the frame it just won and its host.
  const params = useLocalSearchParams<{ frame?: string; partner?: string }>();

  const known = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [partnerId, setPartnerId] = useState(
    known.some((c) => c.id === params.partner) ? params.partner : known[0]?.id,
  );
  const [frameId, setFrameId] = useState(params.frame ?? 'none');
  const [lockedWorld, setLockedWorld] = useState<World | null>(null);
  const [style, setStyle] = useState<BoothStyle>('polaroid');
  // The picture just taken: the preview shows it (with Send) until the friend or style changes.
  const [freshId, setFreshId] = useState<string>();
  const [shooting, setShooting] = useState(false);
  const [locked, setLocked] = useState(false);

  const partner = known.find((c) => c.id === partnerId);
  const frames: FrameChoice[] = [
    { id: 'none', label: t('frames.plain') },
    ...WORLDS.map((w) => ({
      id: `w:${w.key}`,
      label: w.series,
      look: w.frame,
      world: w,
      locked: !wonFrames.includes(w.key),
    })),
    ...userFrames.map((f) => ({ id: f.id, label: f.name, look: frameLook(f), mine: true })),
  ];
  const chosen = frames.find((f) => f.id === frameId && !f.locked) ?? frames[0];
  // Street is a bare photo; frames dress the card styles.
  const look = style === 'street' ? undefined : chosen.look;
  const frameHint =
    style === 'street'
      ? t('frames.fit')
      : chosen.mine
        ? t('frames.mineHint')
        : chosen.world
          ? t('frames.worldHint', { world: chosen.world.series })
          : t('frames.plainHint');
  // Who would host a locked world's quiz: the partner if they live there, else any friend from it.
  const hostFor = (w: World) =>
    (partner?.series === w.series ? partner : undefined) ?? known.find((c) => c.series === w.series);

  const pickFrame = (f: FrameChoice) => {
    if (f.locked && f.world) return setLockedWorld(f.world);
    if (f.mine && f.id === chosen.id) return router.push({ pathname: '/frame/edit', params: { id: f.id } });
    setFrameId(f.id);
    setFreshId(undefined);
  };
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
    const result = takePhoto(partner.id, style, look);
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
                photo={{ style, seed: 0, createdAt: new Date().toISOString(), frame: look }}
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

        <View style={[styles.section, styles.sectionRow]}>
          <Txt variant="h3" style={styles.flex}>
            {t('frames.frame')}
          </Txt>
          <Txt variant="small" color={colors.textSecondary} lines={1}>
            {chosen.label}
          </Txt>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frames}>
          {frames.map((f) => {
            const on = f.id === chosen.id;
            return (
              <PressableScale
                key={f.id}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={f.locked ? `${f.label}, ${t('frames.lockedHint')}` : f.label}
                accessibilityState={{ selected: on }}
                style={[styles.frameChoice, f.locked && styles.dim]}
                onPress={() => pickFrame(f)}>
                <View style={[styles.frameBox, on && styles.frameBoxOn]}>
                  {f.look ? (
                    <FrameSwatch look={f.look} width={SWATCH} />
                  ) : (
                    <FrameSwatch
                      look={{
                        bg: colors.surface,
                        pattern: 'none',
                        patternColor: colors.surface,
                        ink: colors.text,
                        stickers: [],
                      }}
                      width={SWATCH}
                    />
                  )}
                  {f.locked ? (
                    <View style={styles.lock}>
                      <Ionicons name="lock-closed-outline" size={13} color={colors.text} />
                    </View>
                  ) : null}
                </View>
                <Txt
                  variant="caption"
                  center
                  lines={2}
                  color={on ? colors.text : colors.textSecondary}
                  style={on && styles.bold}>
                  {f.label}
                </Txt>
              </PressableScale>
            );
          })}
          <PressableScale
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('frames.titleNew')}
            style={styles.frameChoice}
            onPress={() => router.push('/frame/edit')}>
            <View style={[styles.frameBox, styles.frameNew]}>
              <Ionicons name="add" size={22} color={colors.text} />
            </View>
            <Txt variant="caption" center color={colors.textSecondary}>
              {t('frames.make')}
            </Txt>
          </PressableScale>
        </ScrollView>
        <Txt variant="small" color={colors.textSecondary} style={styles.frameHint}>
          {frameHint}
        </Txt>

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

      <Sheet visible={!!lockedWorld} onClose={() => setLockedWorld(null)}>
        {lockedWorld ? (
          <View style={styles.lockedSheet}>
            {partner ? (
              <BoothPicture
                photo={{ style: 'polaroid', seed: 0, createdAt: new Date().toISOString(), frame: lockedWorld.frame }}
                character={hostFor(lockedWorld) ?? partner}
                width={150}
                style={styles.tilt}
              />
            ) : null}
            <Txt variant="h2" center>
              {t('frames.lockedTitle', { world: lockedWorld.series })}
            </Txt>
            {hostFor(lockedWorld) ? (
              <>
                <Txt variant="body" color={colors.textSecondary} center>
                  {t('frames.lockedBody', {
                    name: shortName(hostFor(lockedWorld)!.name),
                    world: lockedWorld.series,
                  })}
                </Txt>
                <Button
                  label={t('frames.play')}
                  size="lg"
                  full
                  onPress={() => {
                    const w = lockedWorld;
                    setLockedWorld(null);
                    router.push({ pathname: '/quiz/world/[world]', params: { world: w.key, host: hostFor(w)!.id } });
                  }}
                />
              </>
            ) : (
              <>
                <Txt variant="body" color={colors.textSecondary} center>
                  {t('frames.nobodyBody', { world: lockedWorld.series })}
                </Txt>
                <Button
                  label={t('frames.find')}
                  variant="secondary"
                  size="lg"
                  full
                  onPress={() => {
                    setLockedWorld(null);
                    router.push('/(tabs)/find');
                  }}
                />
              </>
            )}
          </View>
        ) : null}
      </Sheet>

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
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  frames: { gap: space.sm + 2, paddingRight: space.lg },
  frameChoice: { width: 72, alignItems: 'center', gap: space.xs + 2 },
  frameBox: {
    width: 72,
    height: 88,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameBoxOn: { borderColor: colors.text },
  frameNew: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  frameHint: { marginTop: space.sm },
  dim: { opacity: 0.6 },
  lock: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedSheet: { alignItems: 'center', gap: space.md, paddingBottom: space.lg },
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
