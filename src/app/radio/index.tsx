import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CARD_SHADOW, GroupLabel, IconTile, STORE } from '@/components/plans/store-look';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClips, type ClipView } from '@/components/radio/use-clips';
import { Anim, AuroraGlass, CharacterAvatar, LargeTitle, PressableScale, Screen, Segmented, SFIcon, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { radioTracks } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, aurora, colors, isDark, space, systemColors } from '@/theme';

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

const MINI_HEIGHT = 64;

/**
 * Radio (F27). Clips: friends say things for the user in their voice, and the user writes lines
 * for a friend to say. Sounds: the background tracks. One thing plays at a time; a floating mini
 * player (as in Music) shows it and opens a clip's player. iOS look on the aurora (2026-10-22,
 * coded at the owner's word).
 */
export default function RadioScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('clips');
  const { gifts, mine } = useRadioClips();
  const player = useRadioPlayer();

  const nowClip = player.kind === 'clip' ? [...mine, ...gifts].find((c) => c.id === player.id) : undefined;
  const nowSound = player.kind === 'sound' ? radioTracks.find((r) => r.id === player.id) : undefined;
  // The mini player stays while something is loaded; a sound that ran out leaves it.
  const showBar = !!nowClip || (!!nowSound && player.playing);
  const progress = player.total ? Math.min(1, player.elapsed / player.total) : 0;

  return (
    <Screen background="aurora">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl + (showBar ? MINI_HEIGHT + space.md : 0) }}>
        <View style={styles.bar}>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
        </View>
        <LargeTitle>{t('radio.title')}</LargeTitle>
        <Segmented<Tab>
          tone="aurora"
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
            <PressableScale
              scaleTo={0.985}
              onPress={() => router.push('/radio/make')}
              accessibilityRole="button"
              accessibilityLabel={t('radio.make')}
              style={[styles.card, styles.make]}>
              <IconTile fill={systemColors.pink} size={44}>
                <SFIcon ios="mic.fill" icon="mic" size={22} color={colors.white} />
              </IconTile>
              <View style={styles.body}>
                <Txt style={styles.title}>{t('radio.make')}</Txt>
                <Txt style={styles.sub}>{t('radio.makeHint')}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={15} color={STORE.faint} />
            </PressableScale>

            {gifts.length ? (
              <>
                <GroupLabel>{t('radio.fromFriends')}</GroupLabel>
                <View style={styles.card}>
                  {gifts.map((clip, i) => (
                    <ClipRow key={clip.id} clip={clip} line={i < gifts.length - 1} />
                  ))}
                </View>
              </>
            ) : null}

            <GroupLabel>{t('radio.yours')}</GroupLabel>
            {mine.length ? (
              <View style={styles.card}>
                {mine.map((clip, i) => (
                  <ClipRow key={clip.id} clip={clip} line={i < mine.length - 1} />
                ))}
              </View>
            ) : (
              <Txt style={styles.footnote}>{t('radio.emptyYours')}</Txt>
            )}
          </>
        ) : (
          <View style={[styles.card, styles.soundsCard]}>
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
                  <IconTile fill={tile.fill} size={44}>
                    <SFIcon ios={tile.ios} icon={tile.icon} size={22} color={colors.white} />
                  </IconTile>
                  <View style={styles.body}>
                    <Txt style={[styles.title, active && styles.titleOn]}>{title}</Txt>
                    <Txt style={styles.sub}>{t('radio.minutes', { count: item.minutes })}</Txt>
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
        <PressableScale
          scaleTo={0.98}
          dimOnPress={false}
          disabled={!nowClip}
          onPress={() => nowClip && router.push({ pathname: '/radio/[id]', params: { id: nowClip.id } })}
          accessibilityRole={nowClip ? 'button' : undefined}
          accessibilityLabel={nowClip ? t('radio.openPlayer') : undefined}
          style={[styles.mini, { bottom: bottomRoom(insets.bottom, space.md) + space.xs }]}>
          {Platform.OS === 'ios' ? <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? STORE.bar : STORE.barSolid }]} />
          <View style={styles.miniHead}>
            {nowClip ? (
              <CharacterAvatar character={nowClip.character} size={40} />
            ) : (
              <View style={styles.miniWave}>
                <Anim name="voiceWave" size={26} tint={aurora.tint} />
              </View>
            )}
            <View style={styles.body}>
              <Txt style={styles.miniTitle} lines={1}>
                {nowClip ? nowClip.title : nowSound ? t(`radio.tracks.${nowSound.titleKey}`) : ''}
              </Txt>
              <Txt style={styles.sub} lines={1}>
                {nowClip ? nowClip.name : t('radio.left', { time: duration(Math.max(0, player.total - player.elapsed)) })}
              </Txt>
            </View>
            {nowClip && player.playing ? <Anim name="voiceWave" size={26} tint={aurora.tint} /> : null}
          </View>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </PressableScale>
      ) : null}
    </Screen>
  );
}

/** A clip: the friend's face, its title, who and how long, and play. A locked gift says its level. */
function ClipRow({ clip, line }: { clip: ClipView; line: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const on = useRadioPlayer((s) => s.kind === 'clip' && s.id === clip.id && s.playing);
  const toggle = useRadioPlayer((s) => s.toggle);
  const markHeard = useAppStore((s) => s.markRadioGiftHeard);
  const time = duration(clip.durationSec);

  if (clip.locked) {
    return (
      <View
        style={[styles.row, styles.locked]}
        accessible
        accessibilityLabel={t('radio.lockedA11y', { title: clip.title, level: clip.unlockLevel, name: clip.name })}>
        <CharacterAvatar character={clip.character} size={44} />
        <View style={styles.body}>
          <Txt style={styles.title} lines={2}>
            {clip.title}
          </Txt>
          {/* Two lines: in Russian or French one cut off the level it opens at. */}
          <Txt style={styles.sub} lines={2}>
            {t('radio.opensAt', { name: clip.name, level: clip.unlockLevel })}
          </Txt>
        </View>
        <View style={styles.lockDot}>
          <Ionicons name="lock-closed" size={15} color={aurora.textMuted} />
        </View>
        {line ? <View style={styles.line} /> : null}
      </View>
    );
  }

  return (
    // Two buttons side by side, not one inside the other: the row opens the player, the dot plays.
    <View style={styles.row}>
      <PressableScale
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/radio/[id]', params: { id: clip.id } })}
        accessibilityRole="button"
        accessibilityLabel={clip.isNew ? `${clip.title}, ${t('radio.new')}` : clip.title}
        style={styles.clipOpen}>
        <CharacterAvatar character={clip.character} size={44} />
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
          <Txt style={styles.sub} lines={1}>
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

/** Play in a soft peach circle; while playing, pause on the solid tint. */
function PlayDot({ on }: { on: boolean }) {
  return (
    <View style={[styles.play, on && styles.playOn]}>
      <Ionicons name={on ? 'pause' : 'play'} size={16} color={on ? colors.white : STORE.peachInk} style={!on && styles.playNudge} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 44, paddingHorizontal: space.lg, paddingTop: space.xs, flexDirection: 'row', alignItems: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  tabs: { marginHorizontal: space.lg, marginTop: 12 },
  card: { marginHorizontal: space.lg, borderRadius: 20, backgroundColor: aurora.card, ...CARD_SHADOW },
  make: { marginTop: 22, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  soundsCard: { marginTop: 22 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  clipOpen: { flex: 1, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  locked: { opacity: 0.55 },
  line: {
    position: 'absolute',
    left: 14 + 44 + 12,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: aurora.separator,
  },
  body: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleShrink: { flexShrink: 1 },
  newPill: { height: 20, paddingHorizontal: 7, borderRadius: 10, justifyContent: 'center', backgroundColor: STORE.peachSoft },
  newText: { fontSize: 12, fontWeight: '700', color: STORE.peachInk },
  titleOn: { color: STORE.tint },
  sub: { fontSize: 13, color: aurora.textMuted },
  footnote: { marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: STORE.peachSoft },
  playOn: { backgroundColor: aurora.tint },
  // The play triangle sits a touch right of centre, as SF's play.fill does.
  playNudge: { marginLeft: 2 },
  lockDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mini: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    height: MINI_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.glassEdge,
    ...CARD_SHADOW,
  },
  miniHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  miniWave: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: STORE.peachSoft },
  miniTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.text },
  miniTrack: { position: 'absolute', left: 16, right: 16, bottom: 6, height: 3, borderRadius: 2, backgroundColor: aurora.separator },
  miniFill: { height: '100%', borderRadius: 2, backgroundColor: aurora.tint },
});
