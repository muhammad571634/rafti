import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { InkText } from '@/components/ink';
import { Avatar, PressableScale, Sheet } from '@/components/ui';
import { localGroupStory } from '@/i18n/content';
import { haptic } from '@/lib/haptics';
import { GROUP_STORIES, type GroupStory, storyFits } from '@/lib/group-stories';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { CharacterGender } from '@/types';

const GAP = 12;
const FACE = 52;

/**
 * Find's Groups shelf (docs/group-stories.md): a card per group story, its members' faces side by side.
 * A tap starts the story's group chat; the book opens who is in it and how it starts.
 */
export function GroupStoryGrid({ gender }: { gender?: CharacterGender }) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const startGroupStory = useAppStore((s) => s.startGroupStory);
  const [open, setOpen] = useState<GroupStory | null>(null);
  const cardWidth = (width - inkGutter * 2 - GAP) / 2;
  const start = (story: GroupStory) => {
    const id = startGroupStory(story.id);
    if (!id) return;
    haptic.success();
    router.push(`/group/${id}`);
  };
  return (
    <>
      <View style={styles.grid}>
        {GROUP_STORIES.filter((s) => storyFits(s, gender)).map((story) => (
          <GroupStoryCard key={story.id} story={story} width={cardWidth} onPress={() => start(story)} onStory={() => setOpen(story)} />
        ))}
      </View>
      <GroupStorySheet story={open} onClose={() => setOpen(null)} />
    </>
  );
}

function GroupStoryCard({ story: written, width, onPress, onStory }: { story: GroupStory; width: number; onPress: () => void; onStory: () => void }) {
  const { t } = useTranslation();
  const story = localGroupStory(written);
  const tint = avatarGradients[story.members[0].accentIndex % avatarGradients.length][1];
  return (
    <PressableScale scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${story.name}. ${story.hook}. ${story.knot}`} onPress={onPress} style={[styles.card, { width }]}>
      <LinearGradient colors={[`${tint}55`, ink.card]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.face}>
        <View style={styles.faces}>
          {story.members.map((m, i) => (
            <View key={m.id} style={[styles.ring, i > 0 && styles.overlap]}>
              <Avatar name={m.name} accentIndex={m.accentIndex} size={FACE} />
            </View>
          ))}
        </View>
        <View style={styles.badge}>
          <Ionicons name="people" size={12} color={ink.text} />
          <InkText variant="caption" color={ink.text}>
            {story.members.length}
          </InkText>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          {/* A long name wraps to a second line, never "…" (HIG text rule, 2026-11-16). */}
          <InkText variant="bodyStrong" lines={2} style={styles.grow}>
            {story.name}
          </InkText>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('stories.details')} hitSlop={12} onPress={onStory}>
            <Ionicons name="book-outline" size={18} color={ink.text2} />
          </PressableScale>
        </View>
        <InkText variant="footnote" color={ink.text2} lines={4}>
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

/** The book: who is in the story and how it starts. The card itself starts it. */
function GroupStorySheet({ story: written, onClose }: { story: GroupStory | null; onClose: () => void }) {
  const { t } = useTranslation();
  const story = written ? localGroupStory(written) : null;
  const first = story?.beats[0];
  return (
    <Sheet visible={!!story} onClose={onClose} title={story?.name ?? ''} scroll>
      {story && first ? (
        <View style={styles.sheet}>
          <View style={styles.block}>
            <InkText variant="bodyStrong">{story.hook}</InkText>
            <InkText variant="sub">{story.knot}</InkText>
          </View>
          <View style={styles.members}>
            {story.members.map((m) => (
              <View key={m.id} style={styles.member}>
                <Avatar name={m.name} accentIndex={m.accentIndex} size={44} />
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
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: inkGutter },
  card: { borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  face: { aspectRatio: 3 / 4, justifyContent: 'space-between', alignItems: 'flex-start', padding: 12 },
  faces: { flexDirection: 'row', paddingTop: 6 },
  ring: { borderRadius: FACE, borderWidth: 2.5, borderColor: ink.card },
  overlap: { marginLeft: -16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: inkRadius.chip, backgroundColor: ink.photoBadge },
  body: { gap: 6, padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  sheet: { gap: 18, paddingBottom: 8 },
  block: { gap: 4 },
  members: { gap: 12 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { textTransform: 'uppercase' },
  italic: { fontStyle: 'italic' },
});
