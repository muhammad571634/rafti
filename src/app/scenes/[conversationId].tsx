import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupLabel } from '@/components/plans/store-look';
import { GlassBar, GlassButton, InsetGroup, LargeTitle, Screen, Txt, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { haptic } from '@/lib/haptics';
import { officialScenes } from '@/mock/scenes';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { Scene } from '@/types';

/**
 * Pick a scene for this chat (Character.AI's Scenes, played inside the one chat with them): the
 * app's scenes, free for everyone, then the user's own (a plan perk: `PERKS.ownScenes`). A tap
 * starts it and goes back to the chat; a running scene can be ended here or from the chat's bar.
 */
export default function ScenesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const chatId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
  const conversation = useAppStore((s) => s.conversations.find((c) => c.id === chatId));
  const own = useAppStore((s) => s.scenes);
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
      <GlassBar
        title={t('scenes.title')}
        scrolled={scrolled}
        right={canAdd ? <GlassButton icon="add" accessibilityLabel={t('scenes.new')} onPress={() => router.push('/scenes/edit')} /> : undefined}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('scenes.title')}</LargeTitle>

        {running && conversation ? (
          <InsetGroup style={styles.first}>
            <View style={[styles.row, styles.line]}>
              <Ionicons name="film" size={18} color={colors.primary} />
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

        <GroupLabel>{t('scenes.ready')}</GroupLabel>
        <InsetGroup>
          {officialScenes.map((scene, i) => (
            <SceneRow key={scene.id} scene={scene} last={i === officialScenes.length - 1} onPress={() => start(scene)} />
          ))}
        </InsetGroup>

        <GroupLabel>{t('scenes.yours', { count: own.length, max: limit })}</GroupLabel>
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
            <Pressable
              onPress={() => router.push(canAdd ? '/scenes/edit' : '/store/shell?tab=plans')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Ionicons name={canAdd ? 'add-circle' : 'lock-closed'} size={22} color={canAdd ? systemColors.green : colors.textSecondary} />
              <Txt style={styles.title}>{canAdd ? t('scenes.new') : t('scenes.morePlan', { count: PERKS.ownScenes.plan })}</Txt>
            </Pressable>
          ) : null}
        </InsetGroup>
      </ScrollView>
    </Screen>
  );
}

/** One scene: its title and set-up; a tap starts it, the pencil (own scenes) edits it. */
function SceneRow({ scene, last, onPress, onEdit }: { scene: Scene; last?: boolean; onPress: () => void; onEdit?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sceneWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('scenes.start', { title: scene.title })}
        style={({ pressed }) => [styles.scene, pressed && styles.pressed]}>
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
          <Ionicons name="create-outline" size={20} color={colors.primary} />
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
  title: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  meta: { fontSize: 15, color: colors.textSecondary },
  sceneWrap: { flexDirection: 'row' },
  scene: { flex: 1, paddingLeft: space.lg },
  sceneBody: { paddingVertical: 11, paddingRight: space.lg, gap: 2 },
  setting: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  edit: { width: 52, alignItems: 'center', justifyContent: 'center' },
});
