import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { FrameSwatch } from '@/components/photo-booth/frame-card';
import { SendPill } from '@/components/photo-booth/send-pill';
import { planDate } from '@/components/plans/copy';
import { ProPaywallSheet } from '@/components/plans/pro-paywall-sheet';
import { BUY_BAR_SPACE, CARD_SHADOW, GroupLabel, STORE, StoreBuyBar } from '@/components/plans/store-look';
import {
  Anim,
  AuroraGlass,
  Button,
  CharacterAvatar,
  LargeTitle,
  PressableScale,
  Screen,
  Segmented,
  SFIcon,
  Sheet,
  Txt,
} from '@/components/ui';
import { photoQuota } from '@/economy/plans';
import { useFriendName } from '@/hooks/use-friend-name';
import { frameLook } from '@/lib/frames';
import { shortName } from '@/lib/format';
import { phrase } from '@/i18n';
import { WORLDS, type World } from '@/mock/worlds';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, space } from '@/theme';
import type { BoothStyle, PhotoFrame } from '@/types';

const STYLES: BoothStyle[] = ['polaroid', 'film', 'studio', 'street'];
const SWATCH = 56;
const GUTTER = space.lg;
const CARD_PAD = 14;
/** The preview's and the thumbnails' backing: iOS secondary fill on the white card. */
const WELL = colors.well;
/** Room under the content for the meter above the shoot button. */
const METER_SPACE = 44;

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
 * (`BoothPicture`), kept in "Your photos", and goes to their chat only with Send. iOS look on
 * the aurora (2026-10-22, coded at the owner's word): a preview card, friends, frames, styles as
 * a segmented control, and the Store's bar with pictures left above the shoot button.
 */
export default function PhotoBoothScreen() {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

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
      label: phrase(w.series),
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
          ? t('frames.worldHint', { world: phrase(chosen.world.series) })
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
  const cardInner = width - GUTTER * 2 - CARD_PAD * 2;
  const previewHeight = Math.round(cardInner * 0.86);
  // The preview's inner box, less a margin so the picture's edge and shadow show.
  const stage = { width: cardInner - space.xl * 2, height: previewHeight - space.xl * 2 };
  const thumbWidth = (cardInner - space.sm * 3) / 4;
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
    <Screen background="aurora">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + (quota ? METER_SPACE : 0) }}>
        <View style={styles.bar}>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
          {quota ? (
            <AuroraGlass style={styles.capsule}>
              <View style={styles.capsuleInner} accessible accessibilityLabel={t('photoBooth.picturesLeft', { count: quota.left })}>
                <SFIcon ios="camera.fill" icon="camera" size={16} color={colors.text} />
                <Txt style={styles.capsuleText}>{quota.left}</Txt>
              </View>
            </AuroraGlass>
          ) : (
            <View style={styles.proPill}>
              <Txt style={styles.proPillText}>{t('plans.name.pro')}</Txt>
            </View>
          )}
        </View>
        <LargeTitle>{t('photoBooth.title')}</LargeTitle>

        <View style={[styles.card, styles.previewCard]}>
          <View style={[styles.preview, { height: previewHeight }]}>
            {shooting ? (
              <Anim name="typing" size={48} tint={aurora.textMuted} />
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
              <Txt style={styles.muted15}>{t('photoBooth.empty')}</Txt>
            )}
          </View>
          {partner ? (
            <View style={styles.caption}>
              <Txt style={styles.captionTitle} lines={1}>
                {t('photoBooth.together', { name: friendName(partner, true) })}
              </Txt>
              <Txt style={styles.muted15}>{t(`photoBooth.styleNames.${fresh?.style ?? style}`)}</Txt>
            </View>
          ) : null}
        </View>

        {known.length > 0 ? (
          <>
            <GroupLabel>{t('photoBooth.with')}</GroupLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partners}>
              {known.map((character) => {
                const on = character.id === partnerId;
                return (
                  <PressableScale
                    key={character.id}
                    style={styles.partner}
                    scaleTo={0.93}
                    accessibilityLabel={friendName(character)}
                    accessibilityState={{ selected: on }}
                    onPress={() => pickPartner(character.id)}>
                    <View style={[styles.ring, on && styles.ringOn]}>
                      <CharacterAvatar character={character} size={52} />
                    </View>
                    <Txt style={[styles.choiceLabel, on && styles.choiceLabelOn]} lines={1}>
                      {friendName(character, true)}
                    </Txt>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.labelRow}>
          <GroupLabel>{t('frames.frame')}</GroupLabel>
          <Txt style={styles.labelValue} lines={1}>
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
                      <Ionicons name="lock-closed" size={13} color={colors.text} />
                    </View>
                  ) : null}
                </View>
                <Txt style={[styles.choiceLabel, on && styles.choiceLabelOn]} center lines={2}>
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
              <Ionicons name="add" size={24} color={aurora.tint} />
            </View>
            <Txt style={styles.choiceLabel} center>
              {t('frames.make')}
            </Txt>
          </PressableScale>
        </ScrollView>
        <Txt style={styles.footnote}>{frameHint}</Txt>

        <GroupLabel>{t('photoBooth.styles')}</GroupLabel>
        <Segmented
          tone="aurora"
          options={STYLES.map((key) => ({ value: key, label: t(`photoBooth.styleNames.${key}`) }))}
          value={style}
          onChange={pickStyle}
          style={styles.styles}
        />

        {photos.length > 0 ? (
          <>
            <GroupLabel>{t('photoBooth.yourPhotos')}</GroupLabel>
            <View style={[styles.card, styles.gallery]}>
              {photos.map((photo) => {
                const who = characters.find((c) => c.id === photo.characterId);
                if (!who) return null;
                return (
                  <PressableScale
                    key={photo.id}
                    scaleTo={0.95}
                    accessibilityLabel={t('photoBooth.openPhoto', { name: friendName(who, true), date: planDate(Date.parse(photo.createdAt)) })}
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

      {/* The Store's bar: pictures left above the button, or the Pro lock in it. */}
      <StoreBuyBar
        label={quota && quota.left <= 0 ? t('photoBooth.backOn', { date: planDate(quota.resetsAt) }) : t('photoBooth.shoot')}
        caption={quota ? undefined : t('photoBooth.withPro')}
        disabled={!partner || shooting || (quota != null && quota.left <= 0)}
        onPress={shoot}
        left={quota ? undefined : <Ionicons name="lock-closed" size={17} color={STORE.ctaInk} />}>
        {quota ? (
          <View style={styles.meter}>
            <View style={styles.meterHead}>
              <Txt style={styles.meterLeft}>{t('photoBooth.left', { left: quota.left, total: quota.total })}</Txt>
              <Txt style={styles.meterReset}>{t('photoBooth.resets', { date: planDate(quota.resetsAt) })}</Txt>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((quota.left / quota.total) * 100)}%` }]} />
            </View>
          </View>
        ) : null}
      </StoreBuyBar>

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
              {t('frames.lockedTitle', { world: phrase(lockedWorld.series) })}
            </Txt>
            {hostFor(lockedWorld) ? (
              <>
                <Txt variant="body" color={colors.textSecondary} center>
                  {t('frames.lockedBody', {
                    name: shortName(hostFor(lockedWorld)!.name),
                    world: phrase(lockedWorld.series),
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
                  {t('frames.nobodyBody', { world: phrase(lockedWorld.series) })}
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
  bar: {
    height: 44,
    paddingHorizontal: GUTTER,
    paddingTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  capsule: { height: 40, borderRadius: 20 },
  capsuleInner: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 14 },
  capsuleText: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  proPill: { height: 28, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center', backgroundColor: STORE.violetSoft },
  proPillText: { fontSize: 15, fontWeight: '700', color: STORE.violetInk },
  card: { marginHorizontal: GUTTER, borderRadius: 24, backgroundColor: aurora.card, ...CARD_SHADOW },
  previewCard: { marginTop: 18, padding: CARD_PAD, gap: 12 },
  preview: { borderRadius: 16, backgroundColor: WELL, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tilt: { transform: [{ rotate: '-2.5deg' }] },
  send: { position: 'absolute', top: space.sm, left: space.sm },
  caption: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, paddingHorizontal: 2 },
  captionTitle: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  muted15: { fontSize: 15, color: aurora.textMuted },
  partners: { gap: 14, paddingHorizontal: GUTTER },
  partner: { width: 60, alignItems: 'center', gap: 6 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: aurora.tint },
  choiceLabel: { fontSize: 13, color: aurora.textMuted },
  choiceLabelOn: { fontWeight: '700', color: colors.text },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  labelValue: { marginBottom: 6, marginRight: space.lg * 2, maxWidth: '45%', fontSize: 13, color: aurora.textMuted },
  frames: { gap: 10, paddingHorizontal: GUTTER },
  frameChoice: { width: 72, alignItems: 'center', gap: 6 },
  frameBox: {
    width: 72,
    height: 88,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: aurora.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  frameBoxOn: { borderColor: aurora.tint },
  frameNew: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: aurora.tint, backgroundColor: 'transparent', shadowOpacity: 0 },
  dim: { opacity: 0.6 },
  lock: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: aurora.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { marginTop: 8, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  styles: { marginHorizontal: GUTTER },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: CARD_PAD },
  thumb: { borderRadius: 12, backgroundColor: WELL, alignItems: 'center', justifyContent: 'center' },
  lockedSheet: { alignItems: 'center', gap: space.md, paddingBottom: space.lg },
  meter: { gap: 6, marginBottom: 4 },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meterLeft: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  meterReset: { fontSize: 13, color: aurora.textMuted },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.track },
  fill: { height: '100%', borderRadius: 3, backgroundColor: aurora.tint },
});
