import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  CharacterAvatar,
  Header,
  IconButton,
  IconTile,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  Sheet,
  Toggle,
  Txt,
} from '@/components/ui';
import { ClosenessSheet } from '@/components/closeness-sheet';
import { planDate } from '@/components/plans/copy';
import { shortName } from '@/lib/format';
import { levelForIntimacy, MAX_LEVEL, TIERS, unlockedLabels } from '@/mock';
import { displayName, memberActive, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { Character } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type ActionKey =
  | 'voiceCall'
  | 'characterMemories'
  | 'characterSettings'
  | 'editCharacter'
  | 'chatSettings'
  | 'searchHistory'
  | 'changeBackground'
  | 'clearChat'
  | 'reset'
  | 'block';

/**
 * Grouped like Profile: what you do in this chat, who they are, then the destructive
 * three. Rows carry a line icon in a grey tile (docs/design-style.md); the destructive
 * rows are plain text, Block in red.
 */
const GROUPS: { title: string; actions: { key: ActionKey; icon?: IoniconName }[] }[] = [
  {
    title: 'sectionChat',
    actions: [
      { key: 'voiceCall', icon: 'call-outline' },
      { key: 'chatSettings', icon: 'options-outline' },
      { key: 'searchHistory', icon: 'search-outline' },
      { key: 'changeBackground', icon: 'image-outline' },
    ],
  },
  {
    title: 'sectionCharacter',
    actions: [
      { key: 'characterMemories', icon: 'bookmark-outline' },
      { key: 'characterSettings', icon: 'person-outline' },
      // Only on characters the user made (see `visible`).
      { key: 'editCharacter', icon: 'pencil-outline' },
    ],
  },
  {
    title: 'sectionManage',
    actions: [{ key: 'clearChat' }, { key: 'reset' }, { key: 'block' }],
  },
];

const ROW_ICON = 36;

/** Seed characters cannot be edited; the user's own creations can. */
const visible = (key: ActionKey, character: Character) => key !== 'editCharacter' || !character.isOfficial;

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
  // Voice replies come with a plan; without one the switch says so.
  const hasPlan = useAppStore((s) => memberActive(s.wallet));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const memoryCount = useAppStore((s) => s.memories.filter((m) => m.characterId === characterId).length);
  const chatAnimation = useAppStore((s) => s.settings.chatAnimation);
  const clearChat = useAppStore((s) => s.clearChat);
  const resetRelationship = useAppStore((s) => s.resetRelationship);
  const blockCharacter = useAppStore((s) => s.blockCharacter);
  const setNickname = useAppStore((s) => s.setNickname);
  const setCharacterPref = useAppStore((s) => s.setCharacterPref);
  const setSetting = useAppStore((s) => s.setSetting);
  const setRelationshipLabel = useAppStore((s) => s.setRelationshipLabel);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [closenessOpen, setClosenessOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

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
      case 'editCharacter':
        return router.push({ pathname: '/create-character', params: { id: character.id } });
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
      case 'block':
        return confirm(
          t('safety.blockTitle', { name: shortName(name) }),
          t('safety.blockBody'),
          t('safety.block'),
          () => {
            blockCharacter(character.id);
            if (router.canDismiss()) router.dismissAll();
            router.replace('/(tabs)/chat');
          },
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
                {t('characterSettings.anniversary', { date: planDate(Date.parse(relationship.anniversary)) })}
              </Txt>
            ) : null}
          </View>
          <IconButton
            icon="pencil-outline"
            size={18}
            background={colors.surfaceAlt}
            accessibilityLabel={t('characterSettings.nickname')}
            onPress={() => {
              setDraftName(relationship?.nickname ?? '');
              setRenaming(true);
            }}
          />
        </View>

        {relationship ? (
          <RelationshipCard
            level={relationship.level}
            intimacy={relationship.intimacy}
            title={relationship.levelTitle}
            label={relationship.label}
            onPick={() => setLabelOpen(true)}
            onInfo={() => setClosenessOpen(true)}
          />
        ) : null}

        {GROUPS.map((group) => (
          <View key={group.title}>
            <SectionLabel tone="section" title={t(`characterSettings.${group.title}`)} />
            {group.actions.filter((action) => visible(action.key, character)).map((action) =>
              action.icon ? (
                <ListRow
                  key={action.key}
                  title={t(`characterSettings.${action.key}`)}
                  left={<IconTile icon={action.icon} size={ROW_ICON} radius={11} glyphSize={19} />}
                  meta={action.key === 'characterMemories' && memoryCount > 0 ? String(memoryCount) : undefined}
                  chevron
                  onPress={() => run(action.key)}
                />
              ) : (
                <PressableScale
                  key={action.key}
                  scaleTo={0.98}
                  onPress={() => run(action.key)}
                  accessibilityRole="button"
                  style={styles.plainRow}>
                  <Txt variant="title" color={action.key === 'block' ? colors.dangerText : colors.text}>
                    {action.key === 'block'
                      ? t('characterSettings.blockName', { name: shortName(name) })
                      : t(`characterSettings.${action.key}`)}
                  </Txt>
                </PressableScale>
              ),
            )}
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
          hint={t(hasPlan ? 'characterSettings.voiceRepliesHint' : 'characterSettings.voiceRepliesPlanHint')}
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
      <ClosenessSheet visible={closenessOpen} onClose={() => setClosenessOpen(false)} level={relationship?.level} />

      <Sheet
        visible={labelOpen}
        onClose={() => setLabelOpen(false)}
        title={t('closeness.labelTitle', { name: shortName(name) })}>
        <ScrollView style={styles.labelScroll} showsVerticalScrollIndicator={false}>
          <Txt variant="small" color={colors.textSecondary} style={styles.labelHint}>
            {t('closeness.labelHint')}
          </Txt>
          <LabelRow
            title={t('closeness.none')}
            selected={!relationship?.label}
            onPress={() => {
              setRelationshipLabel(character.id, undefined);
              setLabelOpen(false);
            }}
          />
          {TIERS.flatMap((tier) =>
            tier.labels.map((label) => {
              const open = unlockedLabels(relationship?.level ?? 0).includes(label);
              return (
                <LabelRow
                  key={label}
                  title={label}
                  meta={open ? tier.title : t('closeness.lockedAt', { level: tier.from })}
                  locked={!open}
                  selected={relationship?.label === label}
                  onPress={() => {
                    if (!open) return;
                    setRelationshipLabel(character.id, label);
                    setLabelOpen(false);
                  }}
                />
              );
            }),
          )}
        </ScrollView>
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

/** Level, stage, progress to the next level and the label you chose. */
function RelationshipCard({
  level,
  intimacy,
  title,
  label,
  onPick,
  onInfo,
}: {
  level: number;
  intimacy: number;
  title: string;
  label?: string;
  onPick: () => void;
  onInfo: () => void;
}) {
  const { t } = useTranslation();
  const { progress, nextLevelAt } = levelForIntimacy(intimacy);
  const maxed = level >= MAX_LEVEL;

  return (
    <View style={styles.bond}>
      <View style={styles.bondHead}>
        <View style={styles.bondHeart}>
          <Ionicons name="heart" size={18} color={colors.bondText} />
        </View>
        <View style={styles.flex}>
          <Txt variant="title">{title}</Txt>
          <Txt variant="small" color={colors.textMuted}>
            {t('closeness.level', { level })}
            {' · '}
            {maxed
              ? t('closeness.max')
              : t('closeness.toNext', { count: Math.max(0, nextLevelAt - intimacy), level: level + 1 })}
          </Txt>
        </View>
        <IconButton icon="information-circle-outline" size={21} accessibilityLabel={t('closeness.title')} onPress={onInfo} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(Math.min(1, progress) * 100)}%` }]} />
      </View>
      <ListRow
        title={t('closeness.relationship')}
        meta={label ?? t('closeness.pickShort')}
        chevron
        onPress={onPick}
        style={styles.bondRow}
      />
    </View>
  );
}

function LabelRow({
  title,
  meta,
  locked,
  selected,
  onPress,
}: {
  title: string;
  meta?: string;
  locked?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <ListRow
      title={title}
      meta={meta}
      trailing={
        locked ? (
          <Ionicons name="lock-closed" size={16} color={colors.textFaint} />
        ) : (
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={selected ? colors.bond : colors.textFaint}
          />
        )
      }
      onPress={onPress}
      style={locked ? styles.locked : undefined}
    />
  );
}

const styles = StyleSheet.create({
  // One white card for the bond: level, progress and the label you chose.
  bond: {
    marginTop: space.xl,
    marginHorizontal: space.lg,
    paddingTop: space.lg,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bondHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg, paddingRight: space.sm },
  bondHeart: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.bondSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 8,
    marginHorizontal: space.lg,
    marginTop: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.bond },
  bondRow: { marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.divider },
  plainRow: { minHeight: 52, justifyContent: 'center', paddingHorizontal: space.lg },
  labelScroll: { maxHeight: 460 },
  labelHint: { marginBottom: space.sm },
  locked: { opacity: 0.5 },
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
