import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupLabel } from '@/components/plans/store-look';
import { sceneLook } from '@/components/scenes/scene-look';
import { AddRow, GlassBar, InsetGroup, LargeTitle, Screen, SymbolTile, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { haptic } from '@/lib/haptics';
import { localized } from '@/i18n/content';
import { officialScenes } from '@/mock/scenes';
import { currentMoments } from '@/lib/friend-moments';
import { weekKey } from '@/lib/quiz';
import { askFriendMoments, displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import { inkFace } from '@/theme/ink';
import type { Scene } from '@/types';

/**
 * Pick a scene for this chat (Character.AI's Scenes, played inside the one chat with them): the
 * app's scenes, free for everyone, then the user's own (a plan perk: `PERKS.ownScenes`). A tap
 * starts it and goes back to the chat; a running scene can be ended here or from the chat's bar.
 */
export default function ScenesScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const chatId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
  const conversation = useAppStore((s) => s.conversations.find((c) => c.id === chatId));
  const own = useAppStore((s) => s.scenes);
  // The moments this friend wrote for the week (their page shows the same ones), asked for here too.
  const friendId = conversation?.characterId;
  const friend = useAppStore((s) => s.characters.find((c) => c.id === friendId));
  const bond = useAppStore((s) => (friendId ? s.relationships[friendId] : undefined));
  // As they were when the screen opened: a group arriving later would push the rows under the finger.
  // Still asked for, so the next visit (and their page) has them.
  const [theirs] = useState(() => (friendId ? currentMoments(useAppStore.getState().friendMoments[friendId], weekKey(new Date()), i18n.language) : []));
  useEffect(() => {
    if (friendId) void askFriendMoments(friendId);
  }, [friendId]);
  const limit = useAppStore((s) => perkLimit('ownScenes', s.wallet.subscription, Date.now()));
  const startScene = useAppStore((s) => s.startScene);
  const endScene = useAppStore((s) => s.endScene);
  const { scrolled, onScroll } = useScrolledPast(44);

  const canAdd = own.length < limit;
  const upsell = planWouldAllowMore('ownScenes', own.length, limit);
  const running = conversation?.scene;

  /** Back to the chat: the screen it came from, or the chat itself when opened directly. */
  const toChat = () => {
    if (router.canGoBack()) router.back();
    else if (conversation) router.replace({ pathname: '/chat/[id]', params: { id: conversation.id } });
  };

  const start = (scene: Scene) => {
    if (!conversation) return;
    startScene(conversation.id, scene.id);
    haptic.success();
    toChat();
  };

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('scenes.title')} scrolled={scrolled} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('scenes.title')}</LargeTitle>

        {running && conversation ? (
          <InsetGroup style={styles.first}>
            <View style={[styles.row, styles.line]}>
              <Ionicons name="film" size={18} color={colors.brandText} />
              <Txt style={styles.title} lines={1}>
                {running.title}
              </Txt>
              <Txt style={styles.meta}>{t('scenes.now')}</Txt>
            </View>
            <Pressable
              onPress={() => {
                endScene(conversation.id);
                toChat();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Txt style={styles.title} color={colors.danger}>
                {t('scenes.endScene')}
              </Txt>
            </Pressable>
          </InsetGroup>
        ) : null}

        {friend && theirs.length > 0 ? (
          <>
            <GroupLabel>{displayName(friend, bond)}</GroupLabel>
            <InsetGroup>
              {theirs.map((scene, i) => (
                <SceneRow key={scene.id} scene={scene} last={i === theirs.length - 1} onPress={() => start(scene)} />
              ))}
            </InsetGroup>
          </>
        ) : null}

        <GroupLabel>{t('scenes.ready')}</GroupLabel>
        <InsetGroup>
          {/* A world's entry scene starts from its world page, with its own host. */}
          {localized('scenes', officialScenes).filter((scene) => !scene.series).map((scene, i, list) => (
            <SceneRow key={scene.id} scene={scene} last={i === list.length - 1} onPress={() => start(scene)} />
          ))}
        </InsetGroup>

        <GroupLabel>{t('scenes.yours')}</GroupLabel>
        <InsetGroup>
          {own.map((scene, i) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              last={i === own.length - 1 && !(canAdd || upsell)}
              onPress={() => start(scene)}
              onEdit={() => router.push({ pathname: '/scenes/edit', params: { id: scene.id } })}
            />
          ))}
          {canAdd || upsell ? (
            <AddRow
              label={canAdd ? t('scenes.new') : t('scenes.morePlan', { count: PERKS.ownScenes.plan })}
              count={`${own.length}/${limit}`}
              locked={!canAdd}
              onPress={() => router.push(canAdd ? '/scenes/edit' : '/store/shell?tab=plans')}
            />
          ) : null}
        </InsetGroup>
      </ScrollView>
    </Screen>
  );
}

/** One scene: its glyph, title and set-up; a tap starts it, the pencil (own scenes) edits it. */
function SceneRow({ scene, last, onPress, onEdit }: { scene: Scene; last?: boolean; onPress: () => void; onEdit?: () => void }) {
  const { t } = useTranslation();
  const look = sceneLook(scene);
  return (
    <View style={styles.sceneWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('scenes.start', { title: scene.title })}
        style={({ pressed }) => [styles.scene, pressed && styles.pressed]}>
        <View style={styles.sceneTile}>
          <SymbolTile {...look} />
        </View>
        <View style={[styles.sceneBody, !last && styles.line]}>
          <Txt style={styles.title} lines={1}>
            {scene.title}
          </Txt>
          <Txt style={styles.setting} lines={2}>
            {scene.setting}
          </Txt>
        </View>
      </Pressable>
      {onEdit ? (
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('scenes.edit')} style={[styles.edit, !last && styles.line]}>
          <Ionicons name="create-outline" size={20} color={colors.brandText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: 14 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  title: { ...inkFace('body'), flex: 1, color: colors.text },
  meta: { ...inkFace('sub'), color: colors.textSecondary },
  sceneWrap: { flexDirection: 'row' },
  scene: { flex: 1, flexDirection: 'row', gap: space.md, paddingLeft: space.lg },
  sceneTile: { paddingTop: 12 },
  sceneBody: { flex: 1, paddingVertical: 11, paddingRight: space.lg, gap: 2 },
  setting: { ...inkFace('footnote'), color: colors.textSecondary },
  edit: { width: 52, alignItems: 'center', justifyContent: 'center' },
});
