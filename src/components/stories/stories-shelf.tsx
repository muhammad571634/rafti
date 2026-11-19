import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { InkChip, InkText, PillButton } from '@/components/ink';
import { Avatar, PressableScale, Sheet } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { shortCount } from '@/lib/format';
import { NEW_BELOW, shelf, type StoryTemplate, TROPES, type Trope, trendingIds, type TemplateStats } from '@/lib/templates';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { CharacterGender } from '@/types';

import { useTemplateStats } from './use-template-stats';

export type StoryShelf = Trope | 'forYou';
const SHELVES: readonly StoryShelf[] = ['forYou', ...TROPES];
const GAP = 12;

/** The templates a shelf shows for Find's Everyone / Him / Her switch; templates with no gender fit both. */
export function storiesFor(trope: StoryShelf, gender: CharacterGender | undefined, stats: Readonly<Record<string, TemplateStats>>) {
  return shelf(trope, stats).filter((t) => !gender || !t.card.gender || t.card.gender === gender);
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
  const [trope, setTrope] = useState<StoryShelf>('forYou');
  const [open, setOpen] = useState<StoryTemplate | null>(null);
  const list = storiesFor(trope, gender, stats);
  const trending = trendingIds(list, stats);
  // The route is new to the typed-routes list until Metro writes it again.
  const all = () => router.push(`/stories?trope=${trope}` as Href);
  return (
    <>
      {title(t('stories.title'), all)}
      <StoryChips value={trope} onChange={setTrope} />
      <StoryGrid items={list.slice(0, 6)} stats={stats} trending={trending} onOpen={setOpen} />
      <View style={styles.more}>
        <PillButton label={t('stories.seeAll')} kind="quiet" onPress={all} />
      </View>
      <StorySheet template={open} stats={open ? stats[open.id] : undefined} onClose={() => setOpen(null)} />
    </>
  );
}

/** Two columns of story cards. */
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
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <StoryCard key={item.id} item={item} width={cardWidth} stats={stats[item.id]} trending={trending.has(item.id)} onPress={() => onOpen(item)} />
      ))}
    </View>
  );
}

/** "12K chats" when there are enough people to say so, else "New" (never a made-up number). */
function CountBadge({ stats, trending }: { stats?: TemplateStats; trending: boolean }) {
  const { t } = useTranslation();
  const chats = stats?.chats ?? 0;
  return (
    <View style={styles.badge}>
      {trending ? <Ionicons name="flame" size={12} color={ink.accent} /> : chats >= NEW_BELOW ? <Ionicons name="chatbubble" size={11} color={ink.text} /> : null}
      <InkText variant="caption" color={trending ? ink.accent : ink.text}>
        {trending ? t('stories.trending') : chats >= NEW_BELOW ? shortCount(chats) : t('stories.new')}
      </InkText>
    </View>
  );
}

function StoryCard({ item, width, stats, trending, onPress }: { item: StoryTemplate; width: number; stats?: TemplateStats; trending: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { card } = item;
  const gradient = avatarGradients[(card.accentIndex ?? 0) % avatarGradients.length] as unknown as [string, string];
  return (
    <PressableScale scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${card.name}. ${item.hook}`} onPress={onPress} style={[styles.card, { width }]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
        <InkText variant="numeralSmall" color="rgba(255,255,255,0.92)" maxFontSizeMultiplier={1}>
          {card.name.slice(0, 1)}
        </InkText>
        <CountBadge stats={stats} trending={trending} />
      </LinearGradient>
      <View style={styles.body}>
        <InkText variant="bodyStrong" lines={1}>
          {card.name}
        </InkText>
        <InkText variant="footnote" color={ink.text2} lines={3}>
          {item.hook}
        </InkText>
        <View style={styles.tags}>
          {(card.tags ?? []).slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <InkText variant="caption" color={ink.text2} lines={1}>
                {t(`createCharacter.traitNames.${tag}`)}
              </InkText>
            </View>
          ))}
        </View>
      </View>
    </PressableScale>
  );
}

/** One story: who they are, how it starts, Say hi, or Make it yours in Create. */
export function StorySheet({ template, stats, onClose }: { template: StoryTemplate | null; stats?: TemplateStats; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const addTemplateCharacter = useAppStore((s) => s.addTemplateCharacter);
  const card = template?.card;
  const fill = (text: string) => text.replace(/\{\{user\}\}/g, t('community.you')).replace(/\{\{char\}\}/g, card?.name ?? '');

  const sayHi = () => {
    if (!template) return;
    haptic.success();
    const { conversationId } = addTemplateCharacter(template);
    onClose();
    router.push(`/chat/${conversationId}`);
  };
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
          <PillButton label={t('community.sayHi')} onPress={sayHi} />
          <PillButton label={t('stories.makeOwn')} kind="quiet" onPress={makeOwn} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: inkGutter, paddingBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: inkGutter },
  card: { borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  face: { height: 132, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: inkRadius.chip, backgroundColor: ink.photoBadge },
  body: { gap: 6, padding: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: inkRadius.chip, backgroundColor: ink.raised, maxWidth: '100%' },
  more: { alignItems: 'center', paddingTop: 12 },
  sheet: { gap: 14, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  block: { gap: 4 },
  label: { textTransform: 'uppercase' },
  italic: { fontStyle: 'italic' },
});
