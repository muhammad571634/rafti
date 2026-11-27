import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AVATARS } from '@/assets/avatars/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { InkText, PillButton } from '@/components/ink';
import { Avatar, PressableScale, Sheet } from '@/components/ui';
import { useDiscoveryWeights } from '@/hooks/use-discovery-rank';
import { localGroupStory } from '@/i18n/content';
import { rankGroupStoriesForUser } from '@/lib/discovery-rank';
import { groupStoryFitsGender } from '@/lib/find-discovery';
import { GROUP_STORIES, type GroupStory, memberMark } from '@/lib/group-stories';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { CharacterGender } from '@/types';

const GAP = 12;
const FACE = 52;
const OVERLAP_FACE = 26;
const STRIP_CARD_W = 192;

/** Starts a group story chat and navigates to it. Shared by Strip, Grid, and GroupStorySheet. */
export function useStartGroupStory() {
  const router = useRouter();
  const startGroupStory = useAppStore((s) => s.startGroupStory);
  return (story: GroupStory) => {
    const id = startGroupStory(story.id);
    if (!id) return;
    haptic.success();
    router.push(`/group/${id}`);
  };
}

/** Horizontal strip of painted 3:4 group story cards for Find's "For you" lens (no longer hidden behind a chip). */
export function GroupStoryStrip({
  gender,
  onSelect,
}: {
  gender?: CharacterGender;
  onSelect?: (story: GroupStory) => void;
}) {
  const weights = useDiscoveryWeights();
  const [open, setOpen] = useState<GroupStory | null>(null);
  const start = useStartGroupStory();
  const stories = rankGroupStoriesForUser(
    GROUP_STORIES.filter((s) => groupStoryFitsGender(s, gender)),
    weights,
  );

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {stories.map((story) => (
          <GroupStoryCard
            key={story.id}
            story={story}
            width={STRIP_CARD_W}
            onPress={() => (onSelect ? onSelect(story) : setOpen(story))}
            onStory={() => (onSelect ? onSelect(story) : setOpen(story))}
          />
        ))}
      </ScrollView>
      {onSelect ? null : <GroupStorySheet story={open} onClose={() => setOpen(null)} onStart={start} />}
    </>
  );
}

/**
 * Find's 2-column Groups grid: 3:4 painted scene posters with overlapping member avatars, scene
 * count, hook, and knot. A tap starts or previews the group story.
 */
export function GroupStoryGrid({
  gender,
  onSelect,
}: {
  gender?: CharacterGender;
  onSelect?: (story: GroupStory) => void;
}) {
  const { width } = useWindowDimensions();
  const start = useStartGroupStory();
  const weights = useDiscoveryWeights();
  const [open, setOpen] = useState<GroupStory | null>(null);
  const cardWidth = (width - inkGutter * 2 - GAP) / 2;
  const stories = rankGroupStoriesForUser(
    GROUP_STORIES.filter((s) => groupStoryFitsGender(s, gender)),
    weights,
  );

  return (
    <>
      <View style={styles.grid}>
        {stories.map((story) => (
          <GroupStoryCard
            key={story.id}
            story={story}
            width={cardWidth}
            showAvatars
            onPress={() => (onSelect ? onSelect(story) : start(story))}
            onStory={() => (onSelect ? onSelect(story) : setOpen(story))}
          />
        ))}
      </View>
      {onSelect ? null : <GroupStorySheet story={open} onClose={() => setOpen(null)} onStart={start} />}
    </>
  );
}

function GroupStoryCard({
  story: written,
  width,
  showAvatars = false,
  onPress,
  onStory,
}: {
  story: GroupStory;
  width: number;
  showAvatars?: boolean;
  onPress: () => void;
  onStory: () => void;
}) {
  const { t } = useTranslation();
  const story = localGroupStory(written);
  const cover = PORTRAITS[story.id];
  const tint = avatarGradients[story.members[0].accentIndex % avatarGradients.length][1];
  const badgeText = `${story.members.length} · ${t('find.scenesCount', { count: story.beats.length })}`;

  return (
    <PressableScale
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${story.name}. ${story.hook}. ${story.knot}`}
      onPress={onPress}
      style={[styles.card, { width }]}>
      {cover ? (
        <View style={styles.photo}>
          <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={ink.photoScrim} locations={ink.photoScrimStops} style={StyleSheet.absoluteFill} />
          <View style={styles.badge}>
            <Ionicons name="people" size={11} color={ink.text} />
            <InkText variant="tag" color={ink.text} lines={1}>
              {badgeText}
            </InkText>
          </View>
          {showAvatars ? (
            <View style={styles.coverAvatars}>
              {story.members.map((m, i) => (
                <View key={m.id} style={[styles.smallRing, i > 0 && styles.smallOverlap]}>
                  <Avatar source={AVATARS[memberMark(story.id, m.id)]} name={m.name} accentIndex={m.accentIndex} size={OVERLAP_FACE} />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <LinearGradient colors={[`${tint}55`, ink.card]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.face}>
          <View style={styles.faces}>
            {story.members.map((m, i) => (
              <View key={m.id} style={[styles.ring, i > 0 && styles.overlap]}>
                <Avatar source={AVATARS[memberMark(story.id, m.id)]} name={m.name} accentIndex={m.accentIndex} size={FACE} />
              </View>
            ))}
          </View>
          <View style={styles.badge}>
            <Ionicons name="people" size={11} color={ink.text} />
            <InkText variant="tag" color={ink.text} lines={1}>
              {badgeText}
            </InkText>
          </View>
        </LinearGradient>
      )}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <InkText variant="bodyStrong" lines={2} style={styles.grow}>
            {story.name}
          </InkText>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('stories.details')} hitSlop={12} onPress={onStory}>
            <Ionicons name="book-outline" size={18} color={ink.text2} />
          </PressableScale>
        </View>
        <InkText variant="footnote" color={ink.text2}>
          <InkText variant="footnote" color={ink.text}>
            {story.hook}
          </InkText>
          {` — ${story.knot}`}
        </InkText>
        <InkText variant="tag" color={ink.text3} lines={1}>
          {story.members.map((m) => m.name).join(' · ')}
        </InkText>
      </View>
    </PressableScale>
  );
}

/** The group story preview sheet: painted cover, members, first scene setup, and a primary CTA to start. */
export function GroupStorySheet({
  story: written,
  onClose,
  onStart,
}: {
  story: GroupStory | null;
  onClose: () => void;
  onStart?: (story: GroupStory) => void;
}) {
  const { t } = useTranslation();
  const story = written ? localGroupStory(written) : null;
  const first = story?.beats[0];
  const cover = story ? PORTRAITS[story.id] : undefined;
  const fallbackStart = useStartGroupStory();
  const handleStart = () => {
    if (!written) return;
    onClose();
    if (onStart) onStart(written);
    else fallbackStart(written);
  };

  return (
    <Sheet visible={!!story} onClose={onClose} title={story?.name ?? ''} scroll>
      {story && first ? (
        <View style={styles.sheet}>
          {cover ? (
            <View style={styles.sheetCoverWrap}>
              <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
              <LinearGradient colors={ink.photoScrim} locations={ink.photoScrimStops} style={StyleSheet.absoluteFill} />
              <View style={styles.sheetCoverText}>
                <InkText variant="bodyStrong" color={ink.text}>
                  {story.hook}
                </InkText>
                <InkText variant="tag" color={ink.photoMuted}>
                  {t('find.scenesCount', { count: story.beats.length })}
                </InkText>
              </View>
            </View>
          ) : (
            <InkText variant="bodyStrong">{story.hook}</InkText>
          )}
          <InkText variant="sub">{story.knot}</InkText>
          <View style={styles.members}>
            {story.members.map((m) => (
              <View key={m.id} style={styles.member}>
                <Avatar source={AVATARS[memberMark(story.id, m.id)]} name={m.name} accentIndex={m.accentIndex} size={44} />
                <View style={styles.grow}>
                  <InkText variant="subStrong">{m.name}</InkText>
                  <InkText variant="footnote">{m.who}</InkText>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.block}>
            <InkText variant="footnote" color={ink.text3} style={styles.label}>
              {t('community.scene')}
            </InkText>
            <InkText variant="subStrong">{first.title}</InkText>
            <InkText variant="sub" style={styles.italic}>
              {first.setting}
            </InkText>
            <InkText variant="footnote">{story.userRole}</InkText>
          </View>
          <PillButton label={`${t('find.sayHi')} →`} onPress={handleStart} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  strip: { gap: GAP, paddingHorizontal: inkGutter },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: inkGutter },
  card: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  photo: { aspectRatio: 3 / 4, justifyContent: 'space-between', alignItems: 'flex-start', padding: 10 },
  face: { aspectRatio: 3 / 4, justifyContent: 'space-between', alignItems: 'flex-start', padding: 12 },
  faces: { flexDirection: 'row', paddingTop: 6 },
  ring: { borderRadius: FACE, borderWidth: 2.5, borderColor: ink.card },
  overlap: { marginLeft: -16 },
  coverAvatars: { flexDirection: 'row', alignItems: 'center' },
  smallRing: { borderRadius: OVERLAP_FACE, borderWidth: 2, borderColor: ink.card, overflow: 'hidden' },
  smallOverlap: { marginLeft: -8 },
  badge: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
  body: { gap: 6, padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  sheet: { gap: 16, paddingBottom: 8 },
  sheetCoverWrap: {
    height: 196,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheetCoverText: { gap: 3 },
  block: { gap: 4 },
  members: { gap: 12 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { textTransform: 'uppercase' },
  italic: { fontStyle: 'italic' },
});
