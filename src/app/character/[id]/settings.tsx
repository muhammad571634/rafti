import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  BlurBackdrop,
  Button,
  CharacterAvatar,
  Header,
  PressableScale,
  Screen,
  Sheet,
  Toggle,
  Txt,
  characterImage,
} from '@/components/ui';
import { shortDate } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space, type } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type ActionKey =
  | 'voiceCall'
  | 'characterMemories'
  | 'characterSettings'
  | 'chatSettings'
  | 'searchHistory'
  | 'changeBackground'
  | 'clearChat'
  | 'reset';

const ACTIONS: { key: ActionKey; icon: IoniconName }[] = [
  { key: 'voiceCall', icon: 'call' },
  { key: 'characterMemories', icon: 'reader' },
  { key: 'characterSettings', icon: 'people' },
  { key: 'chatSettings', icon: 'chatbubbles' },
  { key: 'searchHistory', icon: 'search' },
  { key: 'changeBackground', icon: 'image' },
  { key: 'clearChat', icon: 'trash' },
  { key: 'reset', icon: 'refresh' },
];

/** Alert.alert is a no-op on web; fall back to the browser's confirm there. */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function CharacterSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const chatAnimation = useAppStore((s) => s.settings.chatAnimation);
  const clearChat = useAppStore((s) => s.clearChat);
  const resetRelationship = useAppStore((s) => s.resetRelationship);
  const setNickname = useAppStore((s) => s.setNickname);
  const setCharacterPref = useAppStore((s) => s.setCharacterPref);
  const setSetting = useAppStore((s) => s.setSetting);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);

  if (!character) {
    return (
      <Screen>
        <Header title={t('errors.notFound')} />
      </Screen>
    );
  }

  const name = displayName(character, relationship);

  const run = (key: ActionKey) => {
    switch (key) {
      case 'voiceCall':
        return router.push(`/call/${character.id}`);
      case 'characterMemories':
        return router.push(`/character/${character.id}/memories`);
      case 'characterSettings':
        return router.push(`/character/${character.id}`);
      case 'chatSettings':
        return setChatSettingsOpen(true);
      case 'searchHistory':
        return router.push(`/character/${character.id}/search`);
      case 'changeBackground':
        return router.push(`/character/${character.id}/background`);
      case 'clearChat':
        return confirm(
          t('characterSettings.clearChat'),
          t('characterSettings.clearChatConfirm'),
          t('common.delete'),
          () => conversation && clearChat(conversation.id),
          t('common.cancel'),
        );
      case 'reset':
        return confirm(
          t('characterSettings.reset'),
          t('characterSettings.resetConfirm'),
          t('characterSettings.reset'),
          () => resetRelationship(character.id),
          t('common.cancel'),
        );
    }
  };

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(character)} dim={0.3} blur={45} />}>
      <Header title={t('characterSettings.title')} center tint={colors.white} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <CharacterAvatar character={character} size={104} ring ringColor="rgba(255,255,255,0.85)" />
          <PressableScale
            style={styles.nameRow}
            scaleTo={0.97}
            onPress={() => {
              setDraftName(relationship?.nickname ?? '');
              setRenaming(true);
            }}>
            <Txt variant="h2" color={colors.white}>
              {name}
            </Txt>
            <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.75)" />
          </PressableScale>
          {relationship ? (
            <Txt variant="caption" color="rgba(255,255,255,0.8)">
              {t('characterSettings.anniversary', { date: shortDate(relationship.anniversary) })}
            </Txt>
          ) : null}
        </View>

        <View style={styles.grid}>
          {ACTIONS.map((action) => (
            <PressableScale key={action.key} style={styles.action} scaleTo={0.92} onPress={() => run(action.key)}>
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={28} color={colors.white} />
              </View>
              <Txt variant="small" center lines={2} color="rgba(255,255,255,0.95)">
                {t(`characterSettings.${action.key}`)}
              </Txt>
            </PressableScale>
          ))}
        </View>
      </ScrollView>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.18)']} style={styles.bottomScrim} pointerEvents="none" />

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('characterSettings.nickname')}>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder={character.name}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={30}
          autoFocus
        />
        <Txt variant="caption" color={colors.textMuted} style={styles.hint}>
          {t('characterSettings.nicknameHint')}
        </Txt>
        <Button
          label={t('common.save')}
          full
          onPress={() => {
            setNickname(character.id, draftName);
            setRenaming(false);
          }}
        />
      </Sheet>

      <Sheet
        visible={chatSettingsOpen}
        onClose={() => setChatSettingsOpen(false)}
        title={t('characterSettings.chatSettings')}>
        <ToggleRow
          label={t('characterSettings.voiceReplies')}
          hint={t('characterSettings.voiceRepliesHint')}
          value={relationship?.voiceReplies ?? true}
          disabled={!character.voiceReady}
          onChange={(v) => setCharacterPref(character.id, 'voiceReplies', v)}
        />
        <ToggleRow
          label={t('characterSettings.messagesFirst')}
          hint={t('characterSettings.messagesFirstHint')}
          value={relationship?.messagesFirst ?? true}
          onChange={(v) => setCharacterPref(character.id, 'messagesFirst', v)}
        />
        <ToggleRow
          label={t('characterSettings.chatAnimation')}
          value={chatAnimation}
          onChange={(v) => setSetting('chatAnimation', v)}
        />
      </Sheet>
    </Screen>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.toggleRow, disabled && styles.disabled]}>
      <View style={styles.flex}>
        <Txt variant="bodyStrong">{label}</Txt>
        {hint ? (
          <Txt variant="caption" color={colors.textMuted}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Toggle value={value} disabled={disabled} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.huge },
  identity: { alignItems: 'center', gap: space.xs, paddingVertical: space.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.xxxl,
    marginTop: space.xl,
  },
  action: { width: '33.3%', alignItems: 'center', gap: space.xs },
  actionIcon: { height: 38, alignItems: 'center', justifyContent: 'center' },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 },
  input: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    ...type.body,
  },
  hint: { marginTop: space.sm, marginBottom: space.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  disabled: { opacity: 0.45 },
});
