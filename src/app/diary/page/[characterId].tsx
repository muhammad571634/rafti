import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryRulesSheet } from '@/components/diary';
import { Button, CharacterAvatar, EmptyState, Header, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { dateFromKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space, type } from '@/theme';

/** One ruled line on the page; the handwriting sits on this pitch. */
const LINE = type.hand.lineHeight ?? 32;

/**
 * A character's diary page about the user, in their handwriting on ruled paper.
 * Opening it clears the "New page" mark; the button carries the page into a chat.
 */
export default function CharacterDiaryPageScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ characterId: string; date?: string }>();
  const characterId = String(params.characterId);

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const allPages = useAppStore((s) => s.characterDiary);
  const markRead = useAppStore((s) => s.markDiaryPageRead);

  const pages = useMemo(
    () => allPages.filter((p) => p.characterId === characterId).sort((a, b) => a.date.localeCompare(b.date)),
    [allPages, characterId],
  );

  const [index, setIndex] = useState(() => {
    const at = pages.findIndex((p) => p.date === params.date);
    return at >= 0 ? at : pages.length - 1;
  });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);

  const page = pages[index];

  useEffect(() => {
    if (page) markRead(page.id);
  }, [page, markRead]);

  if (!character || !page) {
    return (
      <Screen background={colors.bgPlain}>
        <Header />
        <EmptyState title={t('diary.noPageYet')} hint={t('diary.rulesBody')} />
      </Screen>
    );
  }

  const name = character.name.split(' ')[0];
  const fmt = (key: string, opts: Intl.DateTimeFormatOptions) => dateFromKey(key).toLocaleDateString(i18n.language, opts);
  const dayBefore = (key: string) => {
    const d = dateFromKey(key);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  };
  const time = new Date(page.writtenAt).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' });
  const prev = pages[index - 1];
  const next = pages[index + 1];

  const reply = () => {
    if (!conversation) return;
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id, draft: t('diary.replyDraft') } });
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('diary.theirDiary', { name })}
        subtitle={fmt(page.date, { weekday: 'short', month: 'short', day: 'numeric' })}
        center
        right={
          <IconButton
            icon="information-circle-outline"
            size={21}
            accessibilityLabel={t('diary.rulesTitle')}
            onPress={() => setRulesOpen(true)}
          />
        }
      />

      <View style={styles.paper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.paperScroll}>
          <View style={styles.byline}>
            <CharacterAvatar character={character} size={38} ring ringColor={colors.white} />
            <View style={styles.flex}>
              <Txt variant="bodyStrong" lines={1}>
                {character.name}
              </Txt>
              <Txt variant="caption" color={colors.textMuted}>
                {t('diary.wroteAt', { time })}
              </Txt>
            </View>
            <View style={styles.mood}>
              <Txt variant="chip" color={colors.brandText}>
                {t(`diary.moods.${page.mood}`)}
              </Txt>
            </View>
          </View>

          {/* Ruled lines sit under the text on the same pitch as its line height. */}
          <View style={styles.body} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {Array.from({ length: Math.ceil(bodyHeight / LINE) }, (_, i) => (
                <View key={i} style={[styles.rule, { top: (i + 1) * LINE - 2 }]} />
              ))}
            </View>
            {page.body.map((paragraph, i) => (
              <Txt key={i} variant="hand" color={colors.paperText} style={i > 0 && styles.paragraph}>
                {paragraph}
              </Txt>
            ))}
          </View>

          <View style={styles.source}>
            <Ionicons
              name={page.source === 'date' ? 'heart-outline' : 'chatbubble-outline'}
              size={14}
              color={colors.textMuted}
            />
            <Txt variant="caption" color={colors.textMuted}>
              {t(page.source === 'date' ? 'diary.afterDate' : 'diary.afterChat', { date: dayBefore(page.date) })}
            </Txt>
          </View>
        </ScrollView>
      </View>

      <View style={styles.pager}>
        <PressableScale
          style={[styles.pagerSide, !prev && styles.off]}
          disabled={!prev}
          scaleTo={0.94}
          hitSlop={8}
          onPress={() => setIndex((i) => i - 1)}>
          <Ionicons name="chevron-back" size={15} color={colors.textSecondary} />
          <Txt variant="smallStrong" color={colors.textSecondary}>
            {prev ? fmt(prev.date, { month: 'short', day: 'numeric' }) : ''}
          </Txt>
        </PressableScale>
        <Txt variant="small" color={colors.textMuted}>
          {t('diary.pageOf', { index: index + 1, count: pages.length })}
        </Txt>
        <PressableScale
          style={[styles.pagerSide, styles.pagerRight, !next && styles.off]}
          disabled={!next}
          scaleTo={0.94}
          hitSlop={8}
          onPress={() => setIndex((i) => i + 1)}>
          <Txt variant="smallStrong" color={colors.textSecondary}>
            {next ? fmt(next.date, { month: 'short', day: 'numeric' }) : ''}
          </Txt>
          <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
        </PressableScale>
      </View>

      {conversation ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
          <Button
            label={t('diary.replyIn', { name })}
            size="lg"
            full
            left={<Ionicons name="chatbubble-outline" size={18} color={colors.textOnPrimary} />}
            onPress={reply}
          />
        </View>
      ) : null}

      <DiaryRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  paper: {
    flex: 1,
    marginHorizontal: space.lg,
    marginTop: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.paperLine,
    backgroundColor: palette.cream100,
    overflow: 'hidden',
  },
  paperScroll: { padding: space.xl, paddingTop: space.lg },
  byline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mood: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
  },
  body: { marginTop: space.lg },
  rule: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.paperLine },
  paragraph: { marginTop: LINE },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.paperLine,
    borderStyle: 'dashed',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
    paddingTop: space.md,
  },
  pagerSide: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, minWidth: 72 },
  pagerRight: { justifyContent: 'flex-end' },
  off: { opacity: 0.35 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md },
});
