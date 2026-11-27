import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AVATARS } from '@/assets/avatars/registry';
import { InkText } from '@/components/ink';
import { Avatar, PressableScale } from '@/components/ui';
import { localTemplate } from '@/i18n/content';
import { shortCount } from '@/lib/format';
import { NEW_BELOW, type StoryTemplate, type TemplateStats } from '@/lib/templates';
import { ink, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

export interface StoryHookCardProps {
  item: StoryTemplate;
  own?: Character;
  stats?: TemplateStats;
  trending?: boolean;
  quiet?: boolean;
  width?: number;
  onPress: () => void;
  onStory: () => void;
}

/**
 * First-Message DM Hook Card for pictureless story templates (Find v3): shows who they are, the
 * unclipped knot, their actual opening message in a DM speech bubble, and separate bottom actions
 * for a book button (Story details) and "Reply →" (zero settings-row feel, zero nested pressables).
 */
export const StoryHookCard = memo(function StoryHookCard({
  item: written,
  own,
  stats,
  trending = false,
  quiet = false,
  width,
  onPress,
  onStory,
}: StoryHookCardProps) {
  const { t } = useTranslation();
  const item = localTemplate(written);
  const { card } = item;
  const name = own?.name || card.name;
  const dm = card.greeting.replace(/\{\{user\}\}/g, t('community.you')).replace(/\{\{char\}\}/g, name);
  const chats = stats?.chats ?? 0;

  return (
    <View style={[styles.card, width != null && { width }]}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${item.hook}. ${dm}`}
        onPress={onPress}
        style={styles.main}>
        <View style={styles.headerRow}>
          <View style={styles.identity}>
            <Avatar source={own?.avatarUri ?? AVATARS[written.id]} name={name} accentIndex={card.accentIndex ?? 0} size={32} />
            <InkText variant="bodyStrong" color={ink.text} lines={1} style={styles.name}>
              {name}
            </InkText>
          </View>
          <View style={styles.badges}>
            {!quiet && (trending || chats >= NEW_BELOW) ? (
              <View style={styles.statBadge}>
                {trending ? <Ionicons name="flame" size={11} color={ink.accent} /> : <Ionicons name="chatbubble" size={10} color={ink.text2} />}
                <InkText variant="tag" color={trending ? ink.accent : ink.text2} lines={1}>
                  {trending ? t('stories.trending') : shortCount(chats)}
                </InkText>
              </View>
            ) : null}
            <View style={styles.tropePill}>
              <InkText variant="caption" color={ink.text2} lines={1}>
                {t(`stories.tropes.${written.trope}`)}
              </InkText>
            </View>
          </View>
        </View>

        <View style={styles.copy}>
          <InkText variant="footnoteStrong" color={ink.text}>
            {item.hook}
          </InkText>
          {card.tagline ? (
            <InkText variant="footnote" color={ink.text2}>
              {card.tagline}
            </InkText>
          ) : null}
        </View>

        <View style={styles.dmBubble}>
          <InkText variant="sub" color={ink.text}>
            {`“${dm}”`}
          </InkText>
        </View>
      </PressableScale>

      <View style={styles.footRow}>
        <PressableScale
          scaleTo={0.95}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${t('stories.details')}, ${name}`}
          onPress={onStory}
          style={styles.detailsBtn}>
          {/* The book alone (its name is the label): words here ran into "Reply →" (A51, 2026-11-25). */}
          <Ionicons name="book-outline" size={16} color={ink.text2} />
        </PressableScale>

        <PressableScale
          scaleTo={0.95}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${t('find.reply')}, ${name}`}
          onPress={onPress}
          style={styles.replyBtn}>
          <InkText variant="footnoteStrong" color={ink.accent} lines={1}>
            {`${t('find.reply')} →`}
          </InkText>
        </PressableScale>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    padding: 14,
    gap: 10,
  },
  main: {
    flexGrow: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { flexShrink: 1 },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
  },
  tropePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
  },
  copy: { gap: 2 },
  dmBubble: {
    backgroundColor: ink.storyBubble,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  detailsBtn: {
    width: 34,
    height: 34,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
  },
  replyBtn: {
    flexShrink: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
});
