import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { InkChip, InkText, PillButton } from '@/components/ink';
import { Avatar, PressableScale, Sheet } from '@/components/ui';
import { useDiscoveryWeights } from '@/hooks/use-discovery-rank';
import { localTemplate } from '@/i18n/content';
import { type DiscoveryWeights, rankTemplatesForUser } from '@/lib/discovery-rank';
import { shortCount } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { allNew, NEW_BELOW, shelf, type StoryTemplate, type TemplateStats, trendingIds, TROPES, type Trope } from '@/lib/templates';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, CharacterGender } from '@/types';

import { GroupStoryGrid } from './group-stories';
import { StoryHookCard } from './story-hook-card';
import { useTemplateStats } from './use-template-stats';

export type StoryShelf = Trope | 'forYou' | 'groups';
export type TropeShelf = Trope | 'forYou';

/** Trope shelves excluding Groups (Find v3 surfaces Groups on its own lens and strip). */
export const TROPE_SHELVES: readonly TropeShelf[] = ['forYou', ...TROPES];
const SHELVES: readonly StoryShelf[] = ['forYou', 'groups', ...TROPES];
const GAP = 12;
const TAG_GAP = 4;

/** The templates a shelf shows for Find's Everyone / Him / Her switch; templates with no gender fit both. */
export function storiesFor(
  trope: StoryShelf,
  gender: CharacterGender | undefined,
  stats: Readonly<Record<string, TemplateStats>>,
  weights?: DiscoveryWeights,
) {
  // Group stories have their own grid (`GroupStoryGrid`).
  if (trope === 'groups') return [];
  const filtered = shelf(trope, stats).filter((t) => !gender || !t.card.gender || t.card.gender === gender);
  return weights ? rankTemplatesForUser(filtered, stats, weights) : filtered;
}

/** The trope chips: For you first, then every trope shelf. Pass `shelves={TROPE_SHELVES}` to omit Groups. */
export function StoryChips({
  value,
  onChange,
  shelves = SHELVES,
}: {
  value: StoryShelf;
  onChange: (value: StoryShelf) => void;
  shelves?: readonly StoryShelf[];
}) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {shelves.map((s) => (
        <InkChip key={s} label={t(`stories.tropes.${s}`)} on={s === value} onPress={() => onChange(s)} />
      ))}
    </ScrollView>
  );
}

/**
 * Legacy shelf wrapper kept for reuse: renders trope chips, the top grid, and "See all".
 */
export function StoriesShelf({ gender, title }: { gender?: CharacterGender; title: (text: string, onAll: () => void) => React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const stats = useTemplateStats();
  const weights = useDiscoveryWeights();
  const [trope, setTrope] = useState<StoryShelf>('forYou');
  const [open, setOpen] = useState<StoryTemplate | null>(null);
  const list = storiesFor(trope, gender, stats, weights);
  const trending = trendingIds(list, stats);
  const all = () => router.push(`/stories?trope=${trope}${gender ? `&who=${gender}` : ''}` as Href);
  return (
    <>
      {title(t('stories.title'), all)}
      <StoryChips value={trope} onChange={setTrope} />
      {trope === 'groups' ? <GroupStoryGrid gender={gender} /> : <StoryGrid items={list.slice(0, 8)} stats={stats} trending={trending} onOpen={setOpen} />}
      {trope === 'groups' ? null : (
        <View style={styles.more}>
          <PillButton label={t('stories.seeAll')} kind="quiet" onPress={all} />
        </View>
      )}
      <StorySheet template={open} stats={open ? stats[open.id] : undefined} onClose={() => setOpen(null)} />
    </>
  );
}

/** Say hi to a story: the private copy (made once per template) and its chat, opened at once. */
export function useStartStory() {
  const router = useRouter();
  const addTemplateCharacter = useAppStore((s) => s.addTemplateCharacter);
  return (template: StoryTemplate) => {
    haptic.success();
    const { conversationId } = addTemplateCharacter(localTemplate(template));
    router.push(`/chat/${conversationId}`);
  };
}

/** Story cards: pictured creations keep the 2-column 3:4 photo grid; pictureless templates use DM Hook Cards. */
export function StoryGrid({
  items,
  stats,
  trending,
  onOpen,
}: {
  items: readonly StoryTemplate[];
  stats: Readonly<Record<string, TemplateStats>>;
  trending: ReadonlySet<string>;
  onOpen: (template: StoryTemplate) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - inkGutter * 2 - GAP) / 2;
  const start = useStartStory();
  const characters = useAppStore((s) => s.characters);
  // Made their own in Create: the card shows their friend (picture and name), as a tap opens that one.
  const ownOf = (id: string) => characters.filter((c) => c.fromTemplate === id && c.handle !== '@stories' && !c.isOfficial).at(-1);
  const pictured = items.filter((item) => !!ownOf(item.id)?.avatarUri);
  const plain = items.filter((item) => !ownOf(item.id)?.avatarUri);
  const quiet = allNew(items, stats, trending);
  return (
    <>
      {pictured.length ? (
        <View style={styles.grid}>
          {pictured.map((item) => (
            <StoryCard
              key={item.id}
              item={item}
              own={ownOf(item.id)}
              width={cardWidth}
              stats={stats[item.id]}
              trending={trending.has(item.id)}
              quiet={quiet}
              onPress={() => start(item)}
              onStory={() => onOpen(item)}
            />
          ))}
        </View>
      ) : null}
      {plain.length ? (
        <View style={[styles.hookList, pictured.length > 0 && styles.listAfterGrid]}>
          {plain.map((item) => (
            <StoryHookCard
              key={item.id}
              item={item}
              own={ownOf(item.id)}
              stats={stats[item.id]}
              trending={trending.has(item.id)}
              quiet={quiet}
              onPress={() => start(item)}
              onStory={() => onOpen(item)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

/** "12K chats" when there are enough people to say so, else "New" (never a made-up number). */
function CountBadge({ stats, trending, inline = false }: { stats?: TemplateStats; trending: boolean; inline?: boolean }) {
  const { t } = useTranslation();
  const chats = stats?.chats ?? 0;
  return (
    <View style={[styles.badge, inline && styles.badgeInline]}>
      {trending ? <Ionicons name="flame" size={12} color={ink.accent} /> : chats >= NEW_BELOW ? <Ionicons name="chatbubble" size={11} color={ink.text} /> : null}
      <InkText variant="caption" color={trending ? ink.accent : ink.text}>
        {trending ? t('stories.trending') : chats >= NEW_BELOW ? shortCount(chats) : t('stories.new')}
      </InkText>
    </View>
  );
}

function StoryCard({
  item: written,
  own,
  width,
  stats,
  trending,
  quiet,
  onPress,
  onStory,
}: {
  item: StoryTemplate;
  own?: Character;
  width: number;
  stats?: TemplateStats;
  trending: boolean;
  quiet: boolean;
  onPress: () => void;
  onStory: () => void;
}) {
  const { t } = useTranslation();
  const item = localTemplate(written);
  const { card } = item;
  const gradient = avatarGradients[(card.accentIndex ?? 0) % avatarGradients.length] as unknown as [string, string];
  const name = own?.name || card.name;
  return (
    <PressableScale
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}. ${item.hook}. ${card.tagline ?? ''}`}
      onPress={onPress}
      style={[styles.card, { width }]}>
      {own?.avatarUri ? (
        <View style={styles.photo}>
          <Image source={own.avatarUri} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', ink.scrim]} style={styles.scrim} />
          {quiet ? <View /> : <CountBadge stats={stats} trending={trending} />}
        </View>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
          <InkText variant="numeralSmall" color={ink.text} maxFontSizeMultiplier={1}>
            {name.slice(0, 1)}
          </InkText>
          {quiet ? <View /> : <CountBadge stats={stats} trending={trending} />}
        </LinearGradient>
      )}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <InkText variant="bodyStrong" lines={1} style={styles.grow}>
            {name}
          </InkText>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('stories.details')} hitSlop={12} onPress={onStory}>
            <Ionicons name="book-outline" size={18} color={ink.text2} />
          </PressableScale>
        </View>
        <InkText variant="footnote" color={ink.text}>
          {item.hook}
        </InkText>
        {card.tagline ? (
          <InkText variant="footnote" color={ink.text2}>
            {card.tagline}
          </InkText>
        ) : null}
        <View style={styles.tags}>
          {(card.tags ?? []).map((tag) => (
            <View key={tag} style={styles.tag}>
              <InkText variant="tag" color={ink.text2} lines={1}>
                {t(`createCharacter.traitNames.${tag}`)}
              </InkText>
            </View>
          ))}
        </View>
      </View>
    </PressableScale>
  );
}

/** One story (the card's book): who they are, how it starts, Reply now and Make it yours in Create. */
export function StorySheet({ template: written, stats, onClose }: { template: StoryTemplate | null; stats?: TemplateStats; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const start = useStartStory();
  const template = written ? localTemplate(written) : null;
  const card = template?.card;
  const fill = (text: string) => text.replace(/\{\{user\}\}/g, t('community.you')).replace(/\{\{char\}\}/g, card?.name ?? '');

  const makeOwn = () => {
    if (!template) return;
    onClose();
    router.push({ pathname: '/create-character', params: { template: template.id } });
  };
  const replyNow = () => {
    if (!written) return;
    onClose();
    start(written);
  };

  return (
    <Sheet visible={!!template} onClose={onClose} title={card?.name ?? ''} scroll>
      {card ? (
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Avatar name={card.name} accentIndex={card.accentIndex ?? 0} size={64} />
            <View style={styles.grow}>
              <InkText variant="bodyStrong">{template?.hook}</InkText>
              <InkText variant="footnote" color={ink.text3}>
                {(stats?.chats ?? 0) >= NEW_BELOW ? t('community.chats', { count: stats?.chats ?? 0 }) : t('stories.new')}
                {(stats?.owns ?? 0) >= NEW_BELOW ? ` · ${t('stories.owns', { count: stats?.owns ?? 0 })}` : ''}
              </InkText>
            </View>
          </View>
          {card.tagline ? <InkText variant="sub">{card.tagline}</InkText> : null}
          {card.bio ? (
            <InkText variant="sub" color={ink.text2}>
              {card.bio}
            </InkText>
          ) : null}
          {card.scenario ? (
            <View style={styles.block}>
              <InkText variant="footnote" color={ink.text3} style={styles.label}>
                {t('community.scene')}
              </InkText>
              <InkText variant="sub" style={styles.italic}>
                {fill(card.scenario)}
              </InkText>
            </View>
          ) : null}
          <View style={styles.block}>
            <InkText variant="footnote" color={ink.text3} style={styles.label}>
              {t('community.firstMessage')}
            </InkText>
            <InkText variant="sub">{fill(card.greeting)}</InkText>
          </View>
          <View style={styles.sheetActions}>
            <PillButton label={`${t('find.reply')} →`} onPress={replyNow} />
            <PillButton label={t('stories.makeOwn')} kind="secondary" onPress={makeOwn} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: inkGutter, paddingBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: inkGutter },
  card: { borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  face: { aspectRatio: 3 / 4, alignItems: 'flex-start', justifyContent: 'space-between', padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photo: { aspectRatio: 3 / 4, justifyContent: 'flex-end', alignItems: 'flex-start', padding: 12, backgroundColor: ink.raised },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: inkRadius.chip, backgroundColor: ink.photoBadge },
  badgeInline: { backgroundColor: ink.raised },
  hookList: { gap: 10, paddingHorizontal: inkGutter },
  listAfterGrid: { marginTop: GAP },
  body: { gap: 6, padding: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: TAG_GAP },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: inkRadius.chip, backgroundColor: ink.raised, maxWidth: '100%' },
  more: { alignItems: 'center', paddingTop: 12 },
  sheet: { gap: 14, paddingBottom: 8 },
  sheetActions: { gap: 10, paddingTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  block: { gap: 4 },
  label: { textTransform: 'uppercase' },
  italic: { fontStyle: 'italic' },
});
