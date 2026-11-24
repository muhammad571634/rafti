import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { InkChip, InkText, PillButton } from '@/components/ink';
import { useDiscoveryWeights } from '@/hooks/use-discovery-rank';
import { localTemplate } from '@/i18n/content';
import { Avatar, PressableScale, Sheet } from '@/components/ui';
import { type DiscoveryWeights, rankTemplatesForUser } from '@/lib/discovery-rank';
import { haptic } from '@/lib/haptics';
import { shortCount } from '@/lib/format';
import { allNew, NEW_BELOW, shelf, type StoryTemplate, TROPES, type Trope, trendingIds, type TemplateStats } from '@/lib/templates';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, CharacterGender } from '@/types';

import { GroupStoryGrid } from './group-stories';
import { useTemplateStats } from './use-template-stats';

export type StoryShelf = Trope | 'forYou' | 'groups';
const SHELVES: readonly StoryShelf[] = ['forYou', 'groups', ...TROPES];
const GAP = 12;
const TAG_GAP = 4;
/** The round initial of a story row: the list's face size. */
const ROW_FACE = 48;

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

/** The trope chips: For you first, then the ten shelves (template-library.md §2). */
export function StoryChips({ value, onChange }: { value: StoryShelf; onChange: (value: StoryShelf) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {SHELVES.map((s) => (
        <InkChip key={s} label={t(`stories.tropes.${s}`)} on={s === value} onPress={() => onChange(s)} />
      ))}
    </ScrollView>
  );
}

/**
 * Find's story shelf (template-library.md): trope chips and a two-column grid of the first cards, with
 * See all opening the whole shelf. The numbers are real; a quiet card says New.
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
  // The route is new to the typed-routes list until Metro writes it again.
  const all = () => router.push(`/stories?trope=${trope}` as Href);
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
function useStartStory() {
  const router = useRouter();
  const addTemplateCharacter = useAppStore((s) => s.addTemplateCharacter);
  return (template: StoryTemplate) => {
    haptic.success();
    const { conversationId } = addTemplateCharacter(template);
    router.push(`/chat/${conversationId}`);
  };
}

/** Two columns of story cards: a tap opens the chat (PolyBuzz's one tap), the book opens the story. */
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
  // A story with a picture keeps PolyBuzz's tall photo card; one without is a compact row until its
  // portrait comes (audit #2: half of Find was flat 3:4 gradients with one letter).
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
              onPress={() => start(localTemplate(item))}
              onStory={() => onOpen(item)}
            />
          ))}
        </View>
      ) : null}
      {plain.length ? (
        <View style={[styles.list, pictured.length > 0 && styles.listAfterGrid]}>
          {plain.map((item, i) => (
            <StoryRow
              key={item.id}
              item={item}
              own={ownOf(item.id)}
              stats={stats[item.id]}
              trending={trending.has(item.id)}
              quiet={quiet}
              last={i === plain.length - 1}
              onPress={() => start(localTemplate(item))}
              onStory={() => onOpen(item)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

/**
 * A story without a picture, as one row of an iOS list: a round initial in the story's hue, the name
 * and the book, who they are to you and the knot in full (short lines, never cut), the tags. A tap
 * says hi (as the photo card), the book opens the story.
 */
function StoryRow({
  item: written,
  own,
  stats,
  trending,
  quiet,
  last,
  onPress,
  onStory,
}: {
  item: StoryTemplate;
  own?: Character;
  stats?: TemplateStats;
  trending: boolean;
  quiet: boolean;
  last: boolean;
  onPress: () => void;
  onStory: () => void;
}) {
  const { t } = useTranslation();
  const item = localTemplate(written);
  const { card } = item;
  const name = own?.name || card.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${item.hook}. ${card.tagline ?? ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Avatar name={name} accentIndex={card.accentIndex ?? 0} size={ROW_FACE} />
      <View style={[styles.rowBody, !last && styles.rowLine]}>
        <View style={styles.nameRow}>
          <InkText variant="bodyStrong" lines={1} style={styles.grow}>
            {name}
          </InkText>
          {quiet ? null : <CountBadge stats={stats} trending={trending} inline />}
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
        {card.tags?.length ? (
          <View style={styles.tags}>
            {card.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <InkText variant="tag" color={ink.text2} lines={1}>
                  {t(`createCharacter.traitNames.${tag}`)}
                </InkText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
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
      style={[styles.card, { width }]}
    >
      {own?.avatarUri ? (
        // A picture: PolyBuzz's tall 3:4 photo with a scrim under the count.
        <View style={styles.photo}>
          <Image source={own.avatarUri} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', ink.scrim]} style={styles.scrim} />
          {quiet ? <View /> : <CountBadge stats={stats} trending={trending} />}
        </View>
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
          <InkText variant="numeralSmall" color="rgba(255,255,255,0.92)" maxFontSizeMultiplier={1}>
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
        {/* Who they are to you, then the knot, each in full: short lines, never cut with "…" (audit #6). */}
        <InkText variant="footnote" color={ink.text}>
          {item.hook}
        </InkText>
        {card.tagline ? (
          <InkText variant="footnote" color={ink.text2}>
            {card.tagline}
          </InkText>
        ) : null}
        {/* Every tag, small and side by side (PolyBuzz), wrapping only when a row is full. */}
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

/** One story (the card's book): who they are, how it starts, and Make it yours in Create. */
export function StorySheet({ template: written, stats, onClose }: { template: StoryTemplate | null; stats?: TemplateStats; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  // In the screen language, as Create will fill it in.
  const template = written ? localTemplate(written) : null;
  const card = template?.card;
  const fill = (text: string) => text.replace(/\{\{user\}\}/g, t('community.you')).replace(/\{\{char\}\}/g, card?.name ?? '');

  // The card itself says hi; the book is for reading the story and making it yours.
  const makeOwn = () => {
    if (!template) return;
    onClose();
    router.push({ pathname: '/create-character', params: { template: template.id } });
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
          <PillButton label={t('stories.makeOwn')} onPress={makeOwn} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: inkGutter, paddingBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: inkGutter },
  card: { borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  // The initial up top, the count bottom left (where PolyBuzz keeps it).
  // 3:4 as PolyBuzz's portraits, with or without a picture, so the two cards of a row stay one height.
  face: { aspectRatio: 3 / 4, alignItems: 'flex-start', justifyContent: 'space-between', padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photo: { aspectRatio: 3 / 4, justifyContent: 'flex-end', alignItems: 'flex-start', padding: 12, backgroundColor: ink.raised },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: inkRadius.chip, backgroundColor: ink.photoBadge },
  badgeInline: { backgroundColor: ink.raised },
  // Stories without a picture: one inset list, rows with a hairline from the text edge (iOS).
  list: { marginHorizontal: inkGutter, borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  listAfterGrid: { marginTop: GAP },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingLeft: 14 },
  rowPressed: { backgroundColor: ink.raised },
  rowBody: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 12, paddingRight: 14 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  body: { gap: 6, padding: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: TAG_GAP },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: inkRadius.chip, backgroundColor: ink.raised, maxWidth: '100%' },
  more: { alignItems: 'center', paddingTop: 12 },
  sheet: { gap: 14, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  block: { gap: 4 },
  label: { textTransform: 'uppercase' },
  italic: { fontStyle: 'italic' },
});
