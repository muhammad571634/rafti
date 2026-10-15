import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BondChip } from '@/components/bond-chip';
import { FriendRow, useFriends } from '@/components/group/friend-row';
import { GroupAvatar } from '@/components/group-avatar';
import { Button, CharacterAvatar, Divider, Header, PressableScale, Screen, Sheet, Toggle, Txt } from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { shortName } from '@/lib/format';
import { canAddMember, canRemoveMember, groupTitle } from '@/lib/group-chat';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { Character } from '@/types';

const NAME_MAX = 40;
const ROW_ICON = 36;

/** Alert.alert is a no-op on web; fall back to the browser's confirm there (as in chat settings). */
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

/**
 * Group info (approved prototype): the group's face and name, its members (open their
 * profile or chat, remove one while two would stay, add one while there is room), Mute,
 * and Delete group. Levels and memories stay in the one-to-one chats.
 */
export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const addGroupMember = useAppStore((s) => s.addGroupMember);
  const removeGroupMember = useAppStore((s) => s.removeGroupMember);
  const setGroupMuted = useAppStore((s) => s.setGroupMuted);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const friends = useFriends();

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [member, setMember] = useState<Character | null>(null);

  const members = useMemo(
    () => (group?.memberIds ?? []).flatMap((m) => characters.find((c) => c.id === m) ?? []),
    [group?.memberIds, characters],
  );

  if (!group || !groupId) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('group.info')} />
        <Txt style={styles.missing}>{t('group.notFound')}</Txt>
      </Screen>
    );
  }

  const nameOf = (c: Character) => displayName(c, relationships[c.id]);
  const names = groupTitle(members.map((m) => shortName(nameOf(m))));
  const title = group.name || names;
  const addable = friends.filter((f) => !group.memberIds.includes(f.character.id));
  const roomLeft = canAddMember(group.memberIds);
  const removable = canRemoveMember(group.memberIds);

  const remove = () => {
    if (!member) return;
    removeGroupMember(groupId, member.id);
    setMember(null);
  };

  const openChat = (character: Character) => {
    setMember(null);
    const conversation = conversations.find((c) => c.characterId === character.id);
    if (conversation) router.push(`/chat/${conversation.id}`);
  };

  const askDelete = () =>
    confirm(t('group.deleteTitle'), t('group.deleteBody'), t('group.delete'), () => {
      deleteGroup(groupId);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)/chat');
    }, t('group.cancel'));

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('group.info')} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.huge }]}>
        <View style={styles.identity}>
          <GroupAvatar members={members} size={72} />
          <View style={styles.flex}>
            <Txt variant="h2">{title}</Txt>
            <Txt variant="small" color={colors.textSecondary}>
              {t('group.made', {
                members: t('group.members', { count: members.length }),
                date: planDate(Date.parse(group.createdAt)),
              })}
            </Txt>
          </View>
        </View>
        <Button
          label={t('group.rename')}
          variant="secondary"
          size="sm"
          style={styles.rename}
          left={<Ionicons name="pencil-outline" size={15} color={colors.text} />}
          onPress={() => {
            setDraft(group.name ?? '');
            setRenaming(true);
          }}
        />

        <View style={styles.section}>
          <Txt variant="h3" accessibilityRole="header">
            {t('group.membersTitle')}
          </Txt>
          {members.map((m) => {
            const level = relationships[m.id]?.level ?? 0;
            return (
              <PressableScale
                key={m.id}
                scaleTo={0.98}
                style={styles.memberRow}
                accessibilityRole="button"
                accessibilityLabel={nameOf(m)}
                onPress={() => setMember(m)}>
                <CharacterAvatar character={m} size={44} />
                <View style={styles.flex}>
                  <View style={styles.nameLine}>
                    <Txt variant="bodyStrong" lines={1} style={styles.shrink}>
                      {nameOf(m)}
                    </Txt>
                    {level >= 1 ? <BondChip level={level} /> : null}
                  </View>
                  {m.series ? (
                    <Txt variant="small" color={colors.textSecondary} lines={1}>
                      {m.series}
                    </Txt>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </PressableScale>
            );
          })}
          {roomLeft ? (
            <PressableScale
              scaleTo={0.98}
              style={styles.memberRow}
              accessibilityRole="button"
              accessibilityLabel={t('group.addMember')}
              onPress={() => setAdding(true)}>
              <View style={styles.addIcon}>
                <Ionicons name="person-add-outline" size={20} color={colors.text} />
              </View>
              <Txt variant="bodyStrong" style={styles.flex}>
                {t('group.addMember')}
              </Txt>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </PressableScale>
          ) : null}
          <Txt variant="caption" color={colors.textSecondary} style={styles.note}>
            {t('group.limitNote')}
          </Txt>
        </View>

        <View style={styles.section}>
          <Txt variant="h3" accessibilityRole="header">
            {t('group.settings')}
          </Txt>
          <View style={styles.settingRow}>
            <View style={styles.tile}>
              <Ionicons name="notifications-off-outline" size={19} color={colors.text} />
            </View>
            <Txt variant="bodyStrong" style={styles.flex}>
              {t('group.mute')}
            </Txt>
            <Toggle
              value={group.muted}
              onChange={(v) => setGroupMuted(groupId, v)}
              accessibilityLabel={t('group.mute')}
            />
          </View>
          <PressableScale
            scaleTo={0.98}
            style={styles.settingRow}
            accessibilityRole="button"
            accessibilityLabel={t('group.delete')}
            onPress={askDelete}>
            <View style={[styles.tile, styles.dangerTile]}>
              <Ionicons name="trash-outline" size={19} color={colors.dangerText} />
            </View>
            <Txt variant="bodyStrong" color={colors.dangerText} style={styles.flex}>
              {t('group.delete')}
            </Txt>
          </PressableScale>
        </View>
      </ScrollView>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('group.nameLabel')} avoidKeyboard>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={names}
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={t('group.nameLabel')}
          style={styles.input}
          maxLength={NAME_MAX}
          autoFocus
        />
        <Button
          label={t('group.save')}
          full
          style={styles.save}
          onPress={() => {
            renameGroup(groupId, draft);
            setRenaming(false);
          }}
        />
      </Sheet>

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('group.addMemberTitle')}>
        {addable.length ? (
          addable.map((friend) => (
            <FriendRow
              key={friend.character.id}
              friend={friend}
              picked={false}
              accessibilityLabel={friend.name}
              onPress={() => {
                addGroupMember(groupId, friend.character.id);
                setAdding(false);
              }}
            />
          ))
        ) : (
          <Txt variant="body" color={colors.textSecondary}>
            {t('group.noOneToAdd')}
          </Txt>
        )}
      </Sheet>

      <Sheet visible={!!member} onClose={() => setMember(null)}>
        {member ? (
          <>
            <View style={styles.memberHead}>
              <CharacterAvatar character={member} size={52} />
              <Txt variant="h3" style={styles.flex} lines={1}>
                {nameOf(member)}
              </Txt>
            </View>
            <View style={styles.ways}>
              <SheetRow
                icon="person-outline"
                label={t('group.openProfile')}
                onPress={() => {
                  setMember(null);
                  router.push(`/character/${member.id}`);
                }}
              />
              {conversations.some((c) => c.characterId === member.id) ? (
                <>
                  <Divider inset={space.lg + ROW_ICON + space.md} />
                  <SheetRow icon="chatbubble-outline" label={t('group.openChat')} onPress={() => openChat(member)} />
                </>
              ) : null}
              <Divider inset={space.lg + ROW_ICON + space.md} />
              <SheetRow
                icon="person-remove-outline"
                label={t('group.remove')}
                danger
                disabled={!removable}
                onPress={remove}
              />
            </View>
            {!removable ? (
              <Txt variant="caption" color={colors.textSecondary} style={styles.note}>
                {t('group.removeLast')}
              </Txt>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

/** A row in a sheet's bordered box: a line icon tile, the action, and a chevron. */
function SheetRow({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const tint = danger ? colors.dangerText : colors.text;
  return (
    <PressableScale
      scaleTo={1}
      style={[styles.way, disabled && styles.off]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      onPress={onPress}>
      <View style={[styles.tile, danger && styles.dangerTile]}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <Txt variant="bodyStrong" color={tint} style={styles.flex}>
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  missing: { padding: space.xl },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  rename: { alignSelf: 'flex-start', marginTop: space.md },
  section: { marginTop: space.xxl },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: space.xs },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  tile: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTile: { backgroundColor: colors.dangerSoft },
  input: {
    minHeight: 52,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  save: { marginTop: space.lg },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ways: {
    marginTop: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  way: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  off: { opacity: 0.45 },
});
