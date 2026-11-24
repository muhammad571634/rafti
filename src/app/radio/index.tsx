import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InkNavBar, InkSegmented, InkText } from '@/components/ink';
import { IconTile } from '@/components/plans/store-look';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClips, type ClipView } from '@/components/radio/use-clips';
import { Anim, CharacterAvatar, PressableScale, Screen, SFIcon, Txt, useScrolledPast } from '@/components/ui';
import { duration } from '@/lib/format';
import { radioTracks } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, friendAccent, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Tab = 'clips' | 'sounds';

/** Each sound as a Settings-style tile: an SF Symbol on an iOS system colour. */
const SOUND_TILE: Record<string, { fill: string; ios: SFSymbol; icon: IoniconName }> = {
  r_rain: { fill: systemColors.cyan, ios: 'cloud.rain.fill', icon: 'rainy' },
  r_fire: { fill: systemColors.red, ios: 'flame.fill', icon: 'flame' },
  r_waves: { fill: systemColors.teal, ios: 'water.waves', icon: 'water' },
  r_cafe: { fill: systemColors.brown, ios: 'cup.and.saucer.fill', icon: 'cafe' },
  r_lullaby: { fill: systemColors.indigo, ios: 'moon.stars.fill', icon: 'moon' },
};
const SOUND_DEFAULT = { fill: systemColors.pink, ios: 'music.note' as SFSymbol, icon: 'musical-notes' as IoniconName };

const MINI_HEIGHT = 66;
const RADIO_VIOLET = '#BF5AF2';
const RADIO_TINT = '#DA8FFF';
const RADIO_SOFT = 'rgba(191,90,242,0.18)';
const RADIO_RIM = 'rgba(218,143,255,0.28)';
const NEW_FILL = ink.tintFill;
const NEW_RIM = 'rgba(235,173,132,0.40)';

/**
 * Radio (approved Ink Night+ prototype): soft violet horizon glow, pinned Apple HIG nav bar,
 * stained-glass "Make a clip" hero, friend-ringed Clips & colored-tile Sounds in hairline-rimmed
 * Ink cards, and a sleek Apple Music-style obsidian floating mini-player (no live BlurView).
 */
export default function RadioScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll } = useScrolledPast(34);
  const [tab, setTab] = useState<Tab>('clips');
  const { gifts, mine } = useRadioClips();
  const player = useRadioPlayer();

  const nowClip = player.kind === 'clip' ? [...mine, ...gifts].find((c) => c.id === player.id) : undefined;
  const nowSound = player.kind === 'sound' ? radioTracks.find((r) => r.id === player.id) : undefined;
  const showBar = !!nowClip || (!!nowSound && player.playing);
  const progress = player.total ? Math.min(1, player.elapsed / player.total) : 0;
  const nowSoundTile = nowSound ? (SOUND_TILE[nowSound.id] ?? SOUND_DEFAULT) : SOUND_DEFAULT;

  const toggleMini = () => {
    if (nowClip) {
      player.toggle('clip', nowClip.id, nowClip.durationSec);
    } else if (nowSound) {
      if (player.playing) player.stop();
      else player.play('sound', nowSound.id, nowSound.minutes * 60);
    }
  };

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(191,90,242,0.20)', 'rgba(9,9,13,0)']}
        start={{ x: 0.75, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('radio.title')}
        scrolled={scrolled}
      />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl + (showBar ? MINI_HEIGHT + space.lg : 0) }}>
        <InkText variant="display" accessibilityRole="header" style={styles.screenTitle}>
          {t('radio.title')}
        </InkText>

        <InkSegmented<Tab>
          options={[
            { value: 'clips', label: t('radio.tabClips') },
            { value: 'sounds', label: t('radio.tabSounds') },
          ]}
          value={tab}
          onChange={setTab}
          style={styles.tabs}
        />

        {tab === 'clips' ? (
          <>
            {/* Calm stained-glass Make a clip hero */}
            <PressableScale
              scaleTo={0.985}
              onPress={() => router.push('/radio/make')}
              accessibilityRole="button"
              accessibilityLabel={t('radio.make')}
              style={styles.makeCard}>
              <LinearGradient
                colors={['rgba(191,90,242,0.24)', 'rgba(106,43,176,0.11)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.makeIcon}>
                <SFIcon ios="mic.fill" icon="mic" size={20} color="#E5B3FF" />
              </View>
              <View style={styles.body}>
                <InkText variant="bodyStrong" color={ink.text}>
                  {t('radio.make')}
                </InkText>
                <InkText variant="footnote" color="rgba(255,255,255,0.68)">
                  {t('radio.makeHint')}
                </InkText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.65)" />
            </PressableScale>

            {gifts.length ? (
              <>
                <Txt style={styles.sectionLabel}>{t('radio.fromFriends')}</Txt>
                <View style={styles.inkCard}>
                  {gifts.map((clip, i) => (
                    <ClipRow key={clip.id} clip={clip} line={i < gifts.length - 1} />
                  ))}
                </View>
              </>
            ) : null}

            <Txt style={styles.sectionLabel}>{t('radio.yours')}</Txt>
            {mine.length ? (
              <View style={styles.inkCard}>
                {mine.map((clip, i) => (
                  <ClipRow key={clip.id} clip={clip} line={i < mine.length - 1} />
                ))}
              </View>
            ) : (
              <InkText variant="footnote" color={ink.text2} style={styles.footnote}>
                {t('radio.emptyYours')}
              </InkText>
            )}
          </>
        ) : (
          <View style={[styles.inkCard, styles.soundsCard]}>
            {radioTracks.map((item, i) => {
              const active = player.kind === 'sound' && player.id === item.id && player.playing;
              const title = t(`radio.tracks.${item.titleKey}`);
              const tile = SOUND_TILE[item.id] ?? SOUND_DEFAULT;
              return (
                <PressableScale
                  key={item.id}
                  scaleTo={0.985}
                  onPress={() => (active ? player.stop() : player.play('sound', item.id, item.minutes * 60))}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                  accessibilityState={{ selected: active }}
                  style={styles.row}>
                  <IconTile fill={tile.fill} size={40}>
                    <SFIcon ios={tile.ios} icon={tile.icon} size={20} color={colors.white} />
                  </IconTile>
                  <View style={styles.body}>
                    <Txt style={[styles.title, active && styles.titleOn]}>{title}</Txt>
                    <Txt style={[styles.sub, styles.tabular]}>{t('radio.minutes', { count: item.minutes })}</Txt>
                  </View>
                  <PlayDot on={active} />
                  {i < radioTracks.length - 1 ? <View style={styles.line} /> : null}
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>

      {showBar ? (
        <View style={[styles.mini, { bottom: bottomRoom(insets.bottom, space.md) + space.xs }]}>
          <LinearGradient
            colors={['rgba(44,44,54,0.96)', 'rgba(22,22,28,0.98)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.miniHead}>
            <PressableScale
              scaleTo={0.98}
              disabled={!nowClip}
              onPress={() => nowClip && router.push({ pathname: '/radio/[id]', params: { id: nowClip.id } })}
              accessibilityRole={nowClip ? 'button' : undefined}
              accessibilityLabel={nowClip ? t('radio.openPlayer') : undefined}
              style={styles.miniOpen}>
              {nowClip ? (
                <View style={[styles.miniRing, { borderColor: friendAccent(nowClip.character.id).strong }]}>
                  <CharacterAvatar character={nowClip.character} size={36} />
                </View>
              ) : (
                <IconTile fill={nowSoundTile.fill} size={38}>
                  <SFIcon ios={nowSoundTile.ios} icon={nowSoundTile.icon} size={18} color={colors.white} />
                </IconTile>
              )}
              <View style={styles.body}>
                <Txt style={styles.miniTitle} lines={1}>
                  {nowClip ? nowClip.title : nowSound ? t(`radio.tracks.${nowSound.titleKey}`) : ''}
                </Txt>
                <Txt style={[styles.sub, styles.tabular]} lines={1}>
                  {nowClip ? nowClip.name : t('radio.left', { time: duration(Math.max(0, player.total - player.elapsed)) })}
                </Txt>
              </View>
              {player.playing ? <Anim name="voiceWave" size={24} tint={RADIO_TINT} /> : null}
            </PressableScale>
            <PressableScale
              scaleTo={0.9}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t(player.playing ? 'radio.pause' : 'radio.play', {
                title: nowClip?.title ?? (nowSound ? t(`radio.tracks.${nowSound.titleKey}`) : ''),
              })}
              onPress={toggleMini}
              style={styles.miniBtn}>
              <Ionicons name={player.playing ? 'pause' : 'play'} size={15} color={ink.text} style={!player.playing && styles.playNudge} />
            </PressableScale>
          </View>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** A clip: ringed friend avatar, title + calm peach New badge, who/length, and play dot. */
function ClipRow({ clip, line }: { clip: ClipView; line: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const on = useRadioPlayer((s) => s.kind === 'clip' && s.id === clip.id && s.playing);
  const toggle = useRadioPlayer((s) => s.toggle);
  const markHeard = useAppStore((s) => s.markRadioGiftHeard);
  const time = duration(clip.durationSec);
  const cAccent = friendAccent(clip.character.id).strong;

  if (clip.locked) {
    return (
      <View
        style={[styles.row, styles.locked]}
        accessible
        accessibilityLabel={t('radio.lockedA11y', { title: clip.title, level: clip.unlockLevel, name: clip.name })}>
        <CharacterAvatar character={clip.character} size={42} />
        <View style={styles.body}>
          <Txt style={styles.title} lines={2}>
            {clip.title}
          </Txt>
          <Txt style={styles.sub} lines={2}>
            {t('radio.opensAt', { name: clip.name, level: clip.unlockLevel })}
          </Txt>
        </View>
        <View style={styles.lockDot}>
          <Ionicons name="lock-closed" size={14} color={ink.text2} />
        </View>
        {line ? <View style={styles.line} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <PressableScale
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/radio/[id]', params: { id: clip.id } })}
        accessibilityRole="button"
        accessibilityLabel={clip.isNew ? `${clip.title}, ${t('radio.new')}` : clip.title}
        style={styles.clipOpen}>
        <View style={[styles.clipRing, { borderColor: cAccent }]}>
          <CharacterAvatar character={clip.character} size={38} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Txt style={[styles.title, styles.titleShrink, on && styles.titleOn]} lines={2}>
              {clip.title}
            </Txt>
            {clip.isNew ? (
              <View style={styles.newPill}>
                <Txt style={styles.newText}>{t('radio.new')}</Txt>
              </View>
            ) : null}
          </View>
          <Txt style={[styles.sub, styles.tabular]} lines={1}>
            {clip.mine ? t('radio.byYou', { name: clip.name, time }) : t('radio.byFriend', { name: clip.name, time })}
          </Txt>
        </View>
      </PressableScale>
      <PressableScale
        onPress={() => {
          markHeard(clip.id);
          toggle('clip', clip.id, clip.durationSec);
        }}
        hitSlop={8}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={t(on ? 'radio.pause' : 'radio.play', { title: clip.title })}>
        <PlayDot on={on} />
      </PressableScale>
      {line ? <View style={styles.line} /> : null}
    </View>
  );
}

function PlayDot({ on }: { on: boolean }) {
  return (
    <View style={[styles.play, on && styles.playOn]}>
      <Ionicons name={on ? 'pause' : 'play'} size={15} color={on ? colors.white : RADIO_TINT} style={!on && styles.playNudge} />
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  tabular: { fontVariant: ['tabular-nums'] },
  screenTitle: { marginTop: 2, marginHorizontal: inkGutter },
  tabs: { marginHorizontal: inkGutter, marginTop: 14 },
  makeCard: {
    marginTop: 16,
    marginHorizontal: inkGutter,
    minHeight: 74,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RADIO_RIM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  makeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(191,90,242,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(218,143,255,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: inkGutter + 6,
    ...inkFace('footnoteStrong'),
    color: ink.text2,
  },
  inkCard: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  soundsCard: { marginTop: 16 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  clipOpen: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clipRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  locked: { opacity: 0.52 },
  line: {
    position: 'absolute',
    left: 68,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: ink.edge,
  },
  body: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 },
  title: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleShrink: { flexShrink: 1 },
  newPill: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: inkRadius.pill,
    justifyContent: 'center',
    backgroundColor: NEW_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NEW_RIM,
  },
  newText: { ...inkFace('caption'), fontSize: 10.5, color: ink.accent },
  titleOn: { color: RADIO_TINT },
  sub: { ...inkFace('footnote'), color: ink.text2 },
  footnote: { marginHorizontal: inkGutter + 6 },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RADIO_SOFT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RADIO_RIM,
  },
  playOn: { backgroundColor: RADIO_VIOLET, borderColor: RADIO_VIOLET },
  playNudge: { marginLeft: 2 },
  lockDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(118,118,128,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mini: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: MINI_HEIGHT,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  miniHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  miniOpen: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  miniRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniTitle: { ...inkFace('footnoteStrong'), fontSize: 14, color: ink.text },
  miniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTrack: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  miniFill: { height: '100%', borderRadius: 2, backgroundColor: RADIO_TINT },
});
