import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CharacterAvatar, EmptyState, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { dateFromKey, dayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, HEADER_HEIGHT, radius, space, type } from '@/theme';

/** One ruled line on the page; the handwriting sits on this pitch. */
const LINE = type.hand.lineHeight ?? 32;
const PAPER = '#FFFDF8';

/**
 * A character's diary page about the user, in their handwriting on ruled paper (calm
 * cards, docs/design-style.md). Arrows step through their pages; opening one clears the
 * "New page" mark; the button carries the page into a chat.
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

  const name = shortName(character.name);
  const fmt = (key: string, opts: Intl.DateTimeFormatOptions) => dateFromKey(key).toLocaleDateString(i18n.language, opts);
  const dayBefore = (key: string) => {
    const d = dateFromKey(key);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  };
  const prev = pages[index - 1];
  const next = pages[index + 1];

  const reply = () => {
    if (!conversation) return;
    router.push({ pathname: '/chat/[id]', params: { id: conversation.id, draft: t('diary.replyDraft') } });
  };

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <PressableScale
          style={styles.back}
          scaleTo={0.88}
          hitSlop={8}
          accessibilityLabel={t('a11y.back')}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </PressableScale>
        <CharacterAvatar character={character} size={32} />
        <Txt variant="h3" lines={1} style={styles.flex}>
          {t('diary.theirDiary', { name })}
        </Txt>
      </View>

      <View style={styles.pager}>
        <PagerButton
          icon="chevron-back"
          label={t('diary.olderPage')}
          disabled={!prev}
          onPress={() => setIndex((i) => i - 1)}
        />
        <View style={styles.pagerMiddle}>
          <Txt variant="bodyStrong">
            {page.date === dayKey() ? t('common.today') : fmt(page.date, { weekday: 'long' })}
          </Txt>
          <Txt variant="caption" color={colors.textSecondary}>
            {t('diary.pageOf', { index: index + 1, count: pages.length })}
          </Txt>
        </View>
        <PagerButton
          icon="chevron-forward"
          label={t('diary.newerPage')}
          disabled={!next}
          onPress={() => setIndex((i) => i + 1)}
        />
      </View>

      <View style={styles.paper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.paperScroll}>
          <View style={styles.top}>
            <Txt variant="hand" color={colors.textSecondary} style={styles.flex}>
              {fmt(page.date, { weekday: 'long', month: 'short', day: 'numeric' })}
            </Txt>
            <View style={styles.mood}>
              <Txt variant="chip" color={colors.bondText}>
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

          <Txt variant="handTitle" color={colors.paperText} style={styles.signature}>
            — {name}
          </Txt>
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
        {conversation ? <Button label={t('diary.chatWith', { name })} size="lg" full onPress={reply} /> : null}
        <Txt variant="small" color={colors.textSecondary} center>
          {t(page.source === 'date' ? 'diary.afterDate' : 'diary.afterChat', { date: dayBefore(page.date) })}
        </Txt>
      </View>
    </Screen>
  );
}

/** A round grey arrow beside the day; it rests when there is no page that way. */
function PagerButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[styles.pagerButton, disabled && styles.off]}
      disabled={disabled}
      scaleTo={0.9}
      hitSlop={6}
      accessibilityLabel={label}
      onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    minHeight: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.sm,
    paddingRight: space.lg,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  pagerMiddle: { alignItems: 'center' },
  pagerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  paper: {
    flex: 1,
    marginHorizontal: space.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: PAPER,
    overflow: 'hidden',
  },
  paperScroll: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mood: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bondSoft,
  },
  body: { marginTop: space.sm },
  rule: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.paperLine },
  paragraph: { marginTop: LINE },
  signature: { alignSelf: 'flex-end', marginTop: space.md },
  footer: {
    gap: space.sm,
    marginTop: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
