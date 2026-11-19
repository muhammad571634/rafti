import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { withAccount } from '@/ai/account';
import { serverCommunity } from '@/ai/server';
import { InkText, PillButton } from '@/components/ink';
import { Avatar, PressableScale, Sheet } from '@/components/ui';
import { count } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { track } from '@/lib/analytics';
import type { CommunityItem } from '@/lib/community';
import { useAppStore } from '@/store/use-app-store';
import { ink, inkGutter, inkRadius } from '@/theme/ink';

const CARD = 200;
const AVATAR = 52;

/** Why a user reports a community character; the server keeps the word. */
const REPORT_REASONS = ['rights', 'realPerson', 'minor', 'sexual', 'hate', 'other'] as const;

/**
 * "From the community" on Find (0z300, docs/agent-tasks/community-library.md): characters other
 * users shared, most chatted first. Nothing shows while the list is empty or the server is away, so
 * the shelf never stands there blank. A card opens the character (`CommunitySheet`).
 */
export function CommunityShelf({ title }: { title: (text: string) => React.ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<CommunityItem[]>([]);
  const [open, setOpen] = useState<CommunityItem | null>(null);
  useEffect(() => {
    let alive = true;
    void withAccount((token) => serverCommunity.list(token, 'popular'))
      .catch(() => null)
      .then((result) => {
        if (alive && result?.items) setItems(result.items);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (!items.length) return null;
  return (
    <>
      {title(t('community.title'))}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <PressableScale key={item.id} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={item.card.name} onPress={() => setOpen(item)} style={styles.card}>
            <Avatar name={item.card.name} accentIndex={item.card.accentIndex ?? 0} size={AVATAR} />
            <InkText variant="bodyStrong" lines={1}>
              {item.card.name}
            </InkText>
            {item.card.tagline ? (
              <InkText variant="sub" color={ink.text2} lines={2} style={styles.grow}>
                {item.card.tagline}
              </InkText>
            ) : (
              <View style={styles.grow} />
            )}
            <View style={styles.chats}>
              <Ionicons name="chatbubble" size={12} color={ink.text3} />
              <InkText variant="footnote" color={ink.text3}>
                {count(item.chats)}
              </InkText>
            </View>
          </PressableScale>
        ))}
      </ScrollView>
      <CommunitySheet item={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** One community character: who they are, how it starts, Say hi, and Report. */
export function CommunitySheet({ item, onClose }: { item: CommunityItem | null; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const addCommunityCharacter = useAppStore((s) => s.addCommunityCharacter);
  const reportCommunity = useAppStore((s) => s.reportCommunity);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  useEffect(() => {
    setReporting(false);
    setReported(false);
  }, [item?.id]);
  const card = item?.card;

  const sayHi = () => {
    if (!item) return;
    haptic.success();
    const { conversationId } = addCommunityCharacter(item);
    track('character_created', {});
    onClose();
    router.push(`/chat/${conversationId}`);
  };
  const report = async (reason: string) => {
    if (!item) return;
    const ok = await reportCommunity(item.id, reason);
    if (ok) haptic.success();
    else haptic.error();
    setReported(ok);
    setReporting(false);
  };

  return (
    <Sheet visible={!!item} onClose={onClose} title={card?.name ?? ''} scroll>
      {card ? (
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Avatar name={card.name} accentIndex={card.accentIndex ?? 0} size={64} />
            <View style={styles.grow}>
              {card.tagline ? <InkText variant="bodyStrong">{card.tagline}</InkText> : null}
              <InkText variant="footnote" color={ink.text3}>
                {t('community.chats', { count: item?.chats ?? 0 })}
              </InkText>
            </View>
          </View>
          {card.tags?.length ? (
            <View style={styles.tags}>
              {card.tags.slice(0, 4).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <InkText variant="footnote">{tag}</InkText>
                </View>
              ))}
            </View>
          ) : null}
          {card.bio ? <InkText variant="sub">{card.bio}</InkText> : null}
          {card.scenario ? (
            <View style={styles.block}>
              <InkText variant="footnote" color={ink.text3} style={styles.label}>
                {t('community.scene')}
              </InkText>
              <InkText variant="sub" style={styles.italic}>
                {card.scenario.replace(/\{\{user\}\}/g, t('community.you')).replace(/\{\{char\}\}/g, card.name)}
              </InkText>
            </View>
          ) : null}
          <View style={styles.block}>
            <InkText variant="footnote" color={ink.text3} style={styles.label}>
              {t('community.firstMessage')}
            </InkText>
            <InkText variant="sub">{card.greeting.replace(/\{\{user\}\}/g, t('community.you')).replace(/\{\{char\}\}/g, card.name)}</InkText>
          </View>
          <PillButton label={t('community.sayHi')} onPress={sayHi} />
          {reported ? (
            <InkText variant="footnote" color={ink.text3} center>
              {t('community.reported')}
            </InkText>
          ) : reporting ? (
            <View style={styles.reasons}>
              {REPORT_REASONS.map((reason, i) => (
                <Pressable
                  key={reason}
                  onPress={() => void report(reason)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.reason, i < REPORT_REASONS.length - 1 && styles.reasonLine, pressed && styles.pressed]}>
                  <InkText variant="body">{t(`community.reason.${reason}`)}</InkText>
                </Pressable>
              ))}
            </View>
          ) : (
            <PillButton label={t('community.report')} kind="quiet" onPress={() => setReporting(true)} />
          )}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingHorizontal: inkGutter, paddingBottom: 4 },
  card: { width: CARD, minHeight: 176, gap: 8, padding: 16, borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card },
  grow: { flex: 1, minWidth: 0 },
  chats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sheet: { gap: 14, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: inkRadius.chip, backgroundColor: ink.raised },
  block: { gap: 4 },
  label: { textTransform: 'uppercase' },
  italic: { fontStyle: 'italic' },
  reasons: { borderRadius: inkRadius.field, borderCurve: 'continuous', backgroundColor: ink.raised, overflow: 'hidden' },
  reason: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  reasonLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  pressed: { opacity: 0.6 },
});
