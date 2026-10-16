import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClips, type ClipView } from '@/components/radio/use-clips';
import { Anim, CharacterAvatar, Header, IconTile, PressableScale, Screen, Segmented, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { radioTracks } from '@/mock';
import { colors, radius, space } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Tab = 'clips' | 'sounds';

/** Line icons for the calm-cards rows (docs/design-style.md); the clay art stays for other screens. */
const LINE_ICON: Record<string, IoniconName> = {
  r_rain: 'rainy-outline',
  r_fire: 'flame-outline',
  r_waves: 'water-outline',
  r_cafe: 'cafe-outline',
  r_lullaby: 'moon-outline',
};

/**
 * Radio (F27, approved prototype 2026-10-15). Clips: friends say things for the user in their
 * voice, and the user writes lines for a friend to say. Sounds: the background tracks.
 * One thing plays at a time; the bar at the bottom shows it and opens a clip's player.
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
  // The bar stays while something is loaded; a sound that ran out leaves it.
  const showBar = !!nowClip || (!!nowSound && player.playing);

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('radio.title')} />
      <Segmented<Tab>
        options={[
          { value: 'clips', label: t('radio.tabClips') },
          { value: 'sounds', label: t('radio.tabSounds') },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tab === 'clips' ? (
          <>
            <PressableScale
              scaleTo={0.985}
              onPress={() => router.push('/radio/make')}
              accessibilityRole="button"
              accessibilityLabel={t('radio.make')}
              style={styles.makeCard}>
              <IconTile icon="mic-outline" size={44} radius={13} glyphSize={21} />
              <View style={styles.flex}>
                <Txt variant="title">{t('radio.make')}</Txt>
                <Txt variant="small" color={colors.textSecondary}>
                  {t('radio.makeHint')}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </PressableScale>

            {gifts.length ? (
              <View style={styles.section}>
                <Txt variant="h3">{t('radio.fromFriends')}</Txt>
                {gifts.map((clip) => (
                  <ClipRow key={clip.id} clip={clip} />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Txt variant="h3">{t('radio.yours')}</Txt>
              {mine.length ? (
                mine.map((clip) => <ClipRow key={clip.id} clip={clip} />)
              ) : (
                <Txt variant="small" color={colors.textSecondary}>
                  {t('radio.emptyYours')}
                </Txt>
              )}
            </View>
          </>
        ) : (
          <View style={styles.sounds}>
            {radioTracks.map((item) => {
              const active = player.kind === 'sound' && player.id === item.id && player.playing;
              const title = t(`radio.tracks.${item.titleKey}`);
              return (
                <PressableScale
                  key={item.id}
                  scaleTo={0.985}
                  onPress={() => (active ? player.stop() : player.play('sound', item.id, item.minutes * 60))}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                  accessibilityState={{ selected: active }}
                  style={[styles.row, active && styles.rowActive]}>
                  <IconTile icon={LINE_ICON[item.id] ?? 'musical-notes-outline'} size={44} radius={13} glyphSize={21} />
                  <View style={styles.flex}>
                    <Txt variant="title">{title}</Txt>
                    <Txt variant="small" color={colors.textSecondary}>
                      {t('radio.minutes', { count: item.minutes })}
                    </Txt>
                  </View>
                  <PlayDot on={active} />
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>

      {showBar ? (
        <PressableScale
          scaleTo={0.99}
          dimOnPress={false}
          disabled={!nowClip}
          onPress={() => nowClip && router.push({ pathname: '/radio/[id]', params: { id: nowClip.id } })}
          accessibilityRole={nowClip ? 'button' : undefined}
          accessibilityLabel={nowClip ? t('radio.openPlayer') : undefined}
          style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) + space.sm }]}>
          <View style={styles.barHead}>
            {nowClip ? (
              <CharacterAvatar character={nowClip.character} size={36} />
            ) : (
              <Anim name="voiceWave" size={26} tint={colors.text} />
            )}
            <View style={styles.flex}>
              <Txt variant="bodyStrong" lines={1}>
                {nowClip ? nowClip.title : nowSound ? t(`radio.tracks.${nowSound.titleKey}`) : ''}
              </Txt>
              {nowClip ? (
                <Txt variant="small" color={colors.textSecondary} lines={1}>
                  {nowClip.name}
                </Txt>
              ) : null}
            </View>
            {nowClip && player.playing ? <Anim name="voiceWave" size={26} tint={colors.text} /> : null}
            {nowSound ? (
              <Txt variant="small" color={colors.textSecondary} style={styles.clock}>
                {t('radio.left', {
                  time: duration(Math.max(0, player.total - player.elapsed)),
                })}
              </Txt>
            ) : null}
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${player.total ? Math.min(100, (player.elapsed / player.total) * 100) : 0}%`,
                },
              ]}
            />
          </View>
        </PressableScale>
      ) : null}
    </Screen>
  );
}

/** A clip: the friend's face, its title, who and how long, and play. A locked gift says its level. */
function ClipRow({ clip }: { clip: ClipView }) {
  const { t } = useTranslation();
  const router = useRouter();
  const on = useRadioPlayer((s) => s.kind === 'clip' && s.id === clip.id && s.playing);
  const toggle = useRadioPlayer((s) => s.toggle);
  const time = duration(clip.durationSec);

  if (clip.locked) {
    return (
      <View
        style={[styles.clip, styles.locked]}
        accessible
        accessibilityLabel={t('radio.lockedA11y', {
          title: clip.title,
          level: clip.unlockLevel,
          name: clip.name,
        })}>
        <CharacterAvatar character={clip.character} size={44} />
        <View style={styles.flex}>
          <Txt variant="bodyStrong" lines={1}>
            {clip.title}
          </Txt>
          <Txt variant="small" color={colors.textSecondary} lines={1}>
            {t('radio.opensAt', { name: clip.name, level: clip.unlockLevel })}
          </Txt>
        </View>
        <View style={styles.play}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.text} />
        </View>
      </View>
    );
  }

  return (
    // Two buttons side by side, not one inside the other: the row opens the player, the dot plays.
    <View style={styles.clip}>
      <PressableScale
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/radio/[id]', params: { id: clip.id } })}
        accessibilityRole="button"
        accessibilityLabel={clip.title}
        style={styles.clipOpen}>
        <CharacterAvatar character={clip.character} size={44} />
        <View style={styles.flex}>
          <Txt variant="bodyStrong" lines={1}>
            {clip.title}
          </Txt>
          <Txt variant="small" color={colors.textSecondary} lines={1}>
            {clip.mine ? t('radio.byYou', { name: clip.name, time }) : t('radio.byFriend', { name: clip.name, time })}
          </Txt>
        </View>
      </PressableScale>
      <PressableScale
        onPress={() => toggle('clip', clip.id, clip.durationSec)}
        hitSlop={8}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={t(on ? 'radio.pause' : 'radio.play', {
          title: clip.title,
        })}>
        <PlayDot on={on} />
      </PressableScale>
    </View>
  );
}

function PlayDot({ on }: { on: boolean }) {
  return (
    <View style={[styles.play, on && styles.playActive]}>
      <Ionicons name={on ? 'pause' : 'play'} size={16} color={on ? colors.textOnInk : colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { marginHorizontal: space.lg, marginTop: space.xs },
  scroll: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.huge,
    gap: space.xl,
  },
  makeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 72,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  section: { gap: space.xs },
  sounds: { gap: space.xs + 2 },
  clip: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 },
  clipOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 },
  locked: { opacity: 0.55 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    minHeight: 72,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowActive: { backgroundColor: colors.surface, borderColor: colors.text },
  play: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playActive: { backgroundColor: colors.text },
  bar: {
    gap: space.sm + 2,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  clock: { fontVariant: ['tabular-nums'] },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
});
