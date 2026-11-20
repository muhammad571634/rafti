import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkNavBar, InkSegmented, InkText, PillButton } from '@/components/ink';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { FrameSwatch } from '@/components/photo-booth/frame-card';
import { SendPill } from '@/components/photo-booth/send-pill';
import { useTakeSelfie } from '@/components/photo-booth/take-selfie';
import { planDate } from '@/components/plans/copy';
import { ProPaywallSheet } from '@/components/plans/pro-paywall-sheet';
import {
  Button,
  CharacterAvatar,
  PressableScale,
  Screen,
  Sheet,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { photoQuota } from '@/economy/plans';
import { useFriendName } from '@/hooks/use-friend-name';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { dropSelfie } from '@/lib/booth-selfies';
import { shortName } from '@/lib/format';
import { frameLook } from '@/lib/frames';
import { WORLDS, type World } from '@/mock/worlds';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, friendAccent, paperRoom, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { BoothStyle, PhotoFrame } from '@/types';

const STYLES: BoothStyle[] = ['polaroid', 'film', 'studio', 'street'];
const SWATCH = 52;
const CARD_PAD = 12;
const DOCK_SPACE = 132;
const METER_SPACE = 38;
/** Long enough for the Pro sheet to finish closing before the camera opens. */
const SHEET_GONE_MS = 450;

const GLASS_RIM = 'rgba(255,255,255,0.11)';
const PRO_BG = 'rgba(217,166,245,0.16)';
const PRO_RIM = 'rgba(217,166,245,0.34)';
const PRO_INK = '#D9A6F5';
const DOCK_BG = 'rgba(14,14,20,0.95)';

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
 * Photo Booth (approved Ink Night+ prototype): warm paper prints set in the dark studio room
 * (`paperRoom`), sticky Apple HIG nav bar, friend-accent portrait rings, warm brand-peach frame
 * selection & quota bar, and a crisp white shutter dock — zero cold blue anywhere.
 */
export default function PhotoBoothScreen() {
  const insets = useSafeAreaInsets();
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { scrolled, onScroll } = useScrolledPast(34);

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
  // The camera is open (or its picture is being kept): one shot at a time.
  const [shooting, setShooting] = useState(false);
  const [locked, setLocked] = useState(false);
  const takeSelfie = useTakeSelfie();

  const partner = known.find((c) => c.id === partnerId);
  const partnerAccent = partner ? friendAccent(partner.id).strong : ink.accent;

  const frames: FrameChoice[] = [
    { id: 'none', label: t('frames.plain') },
    ...localized('worlds', WORLDS).map((w) => ({
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
  const cardInner = width - inkGutter * 2 - CARD_PAD * 2;
  const previewHeight = Math.round(cardInner * 0.84);
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

  const shoot = async () => {
    if (!partner || shooting) return;
    const allowance = photoQuota(useAppStore.getState().wallet.subscription, Date.now());
    if (!allowance) return setLocked(true);
    if (allowance.left <= 0) return;
    setShooting(true);
    try {
      const selfie = await takeSelfie();
      if (!selfie) return;
      const result = takePhoto(partner.id, style, look, selfie);
      if (result === 'locked' || result === 'usedUp') {
        void dropSelfie(selfie);
        if (result === 'locked') setLocked(true);
        return;
      }
      setFreshId(result.id);
    } finally {
      setShooting(false);
    }
  };

  const shootAfterSheet = useRef(false);
  useEffect(() => {
    if (locked || !shootAfterSheet.current) return;
    shootAfterSheet.current = false;
    const timer = setTimeout(() => void shoot(), SHEET_GONE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const shootDisabled = !partner || shooting || (quota != null && quota.left <= 0);
  const shootLabel = quota && quota.left <= 0 ? t('photoBooth.backOn', { date: planDate(quota.resetsAt) }) : t('photoBooth.shoot');
  const shootIcon = quota ? (quota.left > 0 ? 'camera' : undefined) : 'lock-closed';

  return (
    <Screen background={paperRoom}>
      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('photoBooth.title')}
        scrolled={scrolled}
        right={
          quota ? (
            <View style={styles.quotaPill} accessible accessibilityLabel={t('photoBooth.picturesLeft', { count: quota.left })}>
              <Ionicons name="camera" size={14} color={ink.accent} />
              <InkText variant="footnoteStrong" color={ink.text} style={styles.tabular}>
                {quota.left}
              </InkText>
            </View>
          ) : (
            <View style={styles.proPill}>
              <InkText variant="caption" color={PRO_INK}>
                {t('plans.name.pro')}
              </InkText>
            </View>
          )
        }
      />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: DOCK_SPACE + insets.bottom + (quota ? METER_SPACE : 0) }}>
        <InkText variant="display" accessibilityRole="header" style={styles.title}>
          {t('photoBooth.title')}
        </InkText>

        {/* Tactile Print Stage Card — warm paper prints pop cleanly against deep obsidian */}
        <View style={[styles.card, styles.previewCard]}>
          <View style={[styles.preview, { height: previewHeight }]}>
            <LinearGradient
              pointerEvents="none"
              colors={[`${partnerAccent}22`, `${partnerAccent}00`]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {fresh && partner ? (
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
              <BoothPicture
                photo={{ style, seed: 0, createdAt: new Date().toISOString(), frame: look }}
                character={partner}
                width={fitWidth(style, stage)}
                withYou
                style={style === 'polaroid' ? styles.tilt : undefined}
              />
            ) : (
              <InkText variant="sub">{t('photoBooth.empty')}</InkText>
            )}
          </View>
          {partner ? (
            <View style={styles.caption}>
              <InkText variant="subStrong" color={ink.text} lines={1} style={styles.grow}>
                {t('photoBooth.together', { name: friendName(partner, true) })}
              </InkText>
              <InkText variant="footnote" color={ink.text2}>
                {t(`photoBooth.styleNames.${fresh?.style ?? style}`)}
              </InkText>
            </View>
          ) : null}
        </View>

        {known.length > 0 ? (
          <>
            <Txt style={styles.sectionLabel}>{t('photoBooth.with')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partners}>
              {known.map((character) => {
                const on = character.id === partnerId;
                const cAccent = friendAccent(character.id).strong;
                return (
                  <PressableScale
                    key={character.id}
                    style={styles.partner}
                    scaleTo={0.93}
                    accessibilityLabel={friendName(character)}
                    accessibilityState={{ selected: on }}
                    onPress={() => pickPartner(character.id)}>
                    <View style={[styles.ring, { borderColor: on ? cAccent : 'transparent' }]}>
                      <CharacterAvatar character={character} size={50} />
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

        <Txt style={styles.sectionLabel}>{t('photoBooth.styles')}</Txt>
        <InkSegmented
          options={STYLES.map((key) => ({ value: key, label: t(`photoBooth.styleNames.${key}`) }))}
          value={style}
          onChange={pickStyle}
          style={styles.styles}
        />

        <View style={styles.labelRow}>
          <Txt style={styles.sectionLabel}>{t('frames.frame')}</Txt>
          <InkText variant="footnote" color={ink.text3} lines={1} style={styles.labelValue}>
            {chosen.label}
          </InkText>
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
                        bg: '#F4F1EA',
                        pattern: 'none',
                        patternColor: '#F4F1EA',
                        ink: '#2C2621',
                        stickers: [],
                      }}
                      width={SWATCH}
                    />
                  )}
                  {f.locked ? (
                    <View style={styles.lock}>
                      <Ionicons name="lock-closed" size={13} color={ink.text} />
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
              <Ionicons name="add" size={22} color={ink.accent} />
            </View>
            <Txt style={styles.choiceLabel} center>
              {t('frames.make')}
            </Txt>
          </PressableScale>
        </ScrollView>
        <InkText variant="footnote" color={ink.text3} style={styles.footnote}>
          {frameHint}
        </InkText>

        {photos.length > 0 ? (
          <>
            <Txt style={styles.sectionLabel}>{t('photoBooth.yourPhotos')}</Txt>
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

      {/* Anchored Shutter Dock — warm peach meter + crisp white PillButton (zero cold blue) */}
      <View style={[styles.dock, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>
        {quota ? (
          <View style={styles.meter}>
            <View style={styles.meterHead}>
              <InkText variant="caption" color={ink.text} style={[styles.grow, styles.tabular]}>
                {t('photoBooth.left', { left: quota.left, total: quota.total })}
              </InkText>
              <InkText variant="caption" color={ink.text2} style={styles.tabular}>
                {t('photoBooth.resets', { date: planDate(quota.resetsAt) })}
              </InkText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((quota.left / Math.max(1, quota.total)) * 100)}%` }]} />
            </View>
          </View>
        ) : null}
        <PillButton label={shootLabel} icon={shootIcon} disabled={shootDisabled} onPress={shoot} />
        {!quota ? (
          <InkText variant="footnote" color={ink.text2} style={styles.dockCaption}>
            {t('photoBooth.withPro')}
          </InkText>
        ) : null}
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
          shootAfterSheet.current = true;
          setLocked(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  title: { marginTop: 2, marginHorizontal: inkGutter },
  quotaPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proPill: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: PRO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PRO_RIM,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  previewCard: { marginTop: 14, padding: CARD_PAD, gap: 11 },
  preview: {
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: ink.ground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tilt: { transform: [{ rotate: '-2.5deg' }] },
  send: { position: 'absolute', top: space.sm, left: space.sm },
  caption: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, paddingHorizontal: 4 },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: inkGutter + 4,
    ...inkFace('footnoteStrong'),
    color: ink.text2,
  },
  partners: { gap: 14, paddingHorizontal: inkGutter },
  partner: { width: 58, alignItems: 'center', gap: 6 },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  choiceLabel: { ...inkFace('caption'), fontWeight: '500', color: ink.text2 },
  choiceLabelOn: { fontWeight: '600', color: ink.text },
  styles: { marginHorizontal: inkGutter },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: inkGutter + 4 },
  labelValue: { marginBottom: 8, maxWidth: '45%' },
  frames: { gap: 10, paddingHorizontal: inkGutter },
  frameChoice: { width: 68, alignItems: 'center', gap: 6 },
  frameBox: {
    width: 68,
    height: 82,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: ink.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameBoxOn: { borderWidth: 1.8, borderColor: ink.accent },
  frameNew: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(235,173,132,0.48)',
    backgroundColor: 'transparent',
  },
  dim: { opacity: 0.56 },
  lock: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(9,9,13,0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { marginTop: 8, marginHorizontal: inkGutter + 4 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: CARD_PAD },
  thumb: {
    borderRadius: 12,
    backgroundColor: ink.ground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: inkGutter,
    gap: 8,
    backgroundColor: DOCK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  dockCaption: { textAlign: 'center' },
  meter: { gap: 5, marginBottom: 2 },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { height: 5, borderRadius: inkRadius.pill, overflow: 'hidden', backgroundColor: ink.hairlineFill },
  fill: { height: '100%', borderRadius: inkRadius.pill, backgroundColor: ink.accent },
  lockedSheet: { alignItems: 'center', gap: space.md, paddingBottom: space.lg },
});
