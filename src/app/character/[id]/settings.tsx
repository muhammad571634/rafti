import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  CharacterAvatar,
  Divider,
  Header,
  IconButton,
  IconTile,
  ListRow,
  Screen,
  SectionLabel,
  Sheet,
  Toggle,
  Txt,
} from '@/components/ui';
import { shortDate } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';

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

/** Grouped like Profile: what you do in this chat, who they are, then the destructive two. */
const GROUPS: { title: string; actions: { key: ActionKey; icon: IoniconName }[] }[] = [
  {
    title: 'sectionChat',
    actions: [
      { key: 'voiceCall', icon: 'call-outline' },
      { key: 'chatSettings', icon: 'chatbubbles-outline' },
      { key: 'searchHistory', icon: 'search-outline' },
      { key: 'changeBackground', icon: 'image-outline' },
    ],
  },
  {
    title: 'sectionCharacter',
    actions: [
      { key: 'characterMemories', icon: 'bookmark-outline' },
      { key: 'characterSettings', icon: 'person-outline' },
    ],
  },
  {
    title: 'sectionManage',
    actions: [
      { key: 'clearChat', icon: 'trash-outline' },
      { key: 'reset', icon: 'refresh-outline' },
    ],
  },
];

const ROW_ICON = 34;

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
      <Screen background={colors.bgPlain}>
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
    <Screen background={colors.bgPlain}>
      <Header title={t('characterSettings.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <CharacterAvatar character={character} size={56} />
          <View style={styles.flex}>
            <Txt variant="h3" lines={1}>
              {name}
            </Txt>
            {relationship ? (
              <Txt variant="small" color={colors.textMuted}>
                {t('characterSettings.anniversary', { date: shortDate(relationship.anniversary) })}
              </Txt>
            ) : null}
          </View>
          <IconButton
            icon="pencil-outline"
            size={19}
            accessibilityLabel={t('characterSettings.nickname')}
            onPress={() => {
              setDraftName(relationship?.nickname ?? '');
              setRenaming(true);
            }}
          />
        </View>

        {GROUPS.map((group) => (
          <View key={group.title}>
            <SectionLabel title={t(`characterSettings.${group.title}`)} />
            {group.actions.map((action, i) => (
              <View key={action.key}>
                {i > 0 ? <Divider inset={space.lg + ROW_ICON + space.md} /> : null}
                <ListRow
                  title={t(`characterSettings.${action.key}`)}
                  left={<IconTile icon={action.icon} size={ROW_ICON} />}
                  chevron
                  onPress={() => run(action.key)}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

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
  scroll: { paddingBottom: space.huge },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingTop: space.sm,
  },
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
