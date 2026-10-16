import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import { GroupAvatar } from '@/components/group-avatar';
import {
  Button,
  CharacterAvatar,
  GlassBar,
  GlassButton,
  Header,
  InsetGroup,
  InsetRow,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { shortName } from '@/lib/format';
import { canAddMember, canRemoveMember, groupTitle } from '@/lib/group-chat';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, space, type } from '@/theme';
import type { Character } from '@/types';

const NAME_MAX = 40;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

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
  const withCalls = useAppStore((s) => callsIncluded(s.wallet));
  const callMinutes = useAppStore((s) => minutesOf(s.wallet, 'call').total);

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

  const startCall = () => {
    if (callMinutes > 0) return router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
    // No minutes: members top up, others see the plans (the chat's sheets say the same).
    router.push(withCalls ? '/store/shell?tab=shells' : '/store/shell?tab=plans&plan=pro');
  };
  const quick: { key: string; icon: IoniconName; label: string; onPress: () => void; off?: boolean }[] = [
    { key: 'call', icon: 'call', label: t('characterSettings.quickCall'), onPress: startCall },
    { key: 'add', icon: 'person-add', label: t('group.add'), onPress: () => setAdding(true), off: !roomLeft },
    {
      key: 'search',
      icon: 'search',
      label: t('characterSettings.quickSearch'),
      onPress: () => router.push({ pathname: '/group/[id]/search', params: { id: groupId } }),
    },
  ];

  return (
    // iOS contact card for the group (approved prototype `GroupInfo.dc.html`).
    <Screen background={colors.bg}>
      <GlassBar
        right={
          <GlassButton
            label={t('common.edit')}
            accessibilityLabel={t('group.rename')}
            onPress={() => {
              setDraft(group.name ?? '');
              setRenaming(true);
            }}
          />
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.identity}>
          <GroupAvatar members={members} size={112} ringColor={colors.bg} />
          <Txt style={styles.name} center lines={2} accessibilityRole="header">
            {title}
          </Txt>
          <Txt style={styles.caption} center>
            {t('group.made', {
              members: t('group.members', { count: members.length }),
              date: planDate(Date.parse(group.createdAt)),
            })}
          </Txt>
        </View>

        <View style={styles.quick}>
          {quick.map((q) => (
            <PressableScale
              key={q.key}
              scaleTo={0.95}
              disabled={q.off}
              onPress={q.onPress}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!q.off }}
              accessibilityLabel={q.label}
              style={[styles.quickTile, q.off && styles.off]}>
              <Ionicons name={q.icon} size={22} color={colors.primary} />
              <Txt style={styles.quickLabel} color={colors.primary}>
                {q.label}
              </Txt>
            </PressableScale>
          ))}
        </View>

        <Txt style={styles.sectionLabel}>{t('group.membersCount', { count: members.length, max: 3 })}</Txt>
        <InsetGroup>
          {members.map((m, i) => {
            const level = relationships[m.id]?.level ?? 0;
            const last = i === members.length - 1 && !roomLeft;
            return (
              <Pressable
                key={m.id}
                style={({ pressed }) => [styles.member, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={level >= 1 ? `${nameOf(m)}, ${t('home.bondLevel', { level })}` : nameOf(m)}
                onPress={() => setMember(m)}>
                <CharacterAvatar character={m} size={40} />
                <View style={[styles.memberBody, !last && styles.line]}>
                  <View style={styles.flex}>
                    <Txt style={styles.memberName} lines={1}>
                      {nameOf(m)}
                    </Txt>
                    {level >= 1 ? <Txt style={styles.memberMeta}>{t('closeness.level', { level })}</Txt> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
                </View>
              </Pressable>
            );
          })}
          {roomLeft ? (
            <Pressable
              style={({ pressed }) => [styles.member, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('group.addMember')}
              onPress={() => setAdding(true)}>
              <View style={styles.addIcon}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </View>
              <View style={styles.memberBody}>
                <Txt style={styles.memberName} color={colors.primary}>
                  {t('group.addMember')}
                </Txt>
              </View>
            </Pressable>
          ) : null}
        </InsetGroup>

        <InsetGroup style={styles.block}>
          <View style={styles.switchRow}>
            <Txt style={[styles.memberName, styles.flex]}>{t('group.mute')}</Txt>
            <Switch
              value={group.muted}
              onValueChange={(v) => setGroupMuted(groupId, v)}
              accessibilityLabel={t('group.mute')}
              trackColor={{ true: colors.success }}
              ios_backgroundColor={colors.surfaceAlt}
            />
          </View>
        </InsetGroup>

        <InsetGroup style={styles.block}>
          <InsetRow label={t('group.delete')} danger last onPress={askDelete} />
        </InsetGroup>
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
          <View style={styles.ways}>
            {addable.map((friend, i) => (
              <FriendRow
                key={friend.character.id}
                friend={friend}
                picked={false}
                last={i === addable.length - 1}
                accessibilityLabel={friend.name}
                onPress={() => {
                  addGroupMember(groupId, friend.character.id);
                  setAdding(false);
                }}
              />
            ))}
          </View>
        ) : (
          <Txt variant="body" color={colors.textSecondary}>
            {t('group.noOneToAdd')}
          </Txt>
        )}
      </Sheet>

      <Sheet visible={!!member} onClose={() => setMember(null)} title={member ? nameOf(member) : undefined}>
        {member ? (
          <>
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
                <SheetRow icon="chatbubble-outline" label={t('group.openChat')} onPress={() => openChat(member)} />
              ) : null}
              <SheetRow
                icon="person-remove-outline"
                label={t('group.remove')}
                danger
                disabled={!removable}
                onPress={remove}
                last
              />
            </View>
            {!removable ? <Txt style={styles.note}>{t('group.removeLast')}</Txt> : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

/** A row in a sheet's grey group: the action and a line icon on the right, as in iOS menus. */
function SheetRow({
  icon,
  label,
  onPress,
  danger,
  disabled,
  last,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  last?: boolean;
}) {
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      style={({ pressed }) => [styles.way, !last && styles.line, pressed && styles.pressed, disabled && styles.off]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      onPress={onPress}>
      <Txt style={[styles.memberName, styles.flex]} color={tint}>
        {label}
      </Txt>
      <Ionicons name={icon} size={19} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { padding: space.xl },
  identity: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.xs },
  name: { marginTop: space.md, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.3 },
  caption: { marginTop: 4, fontSize: 15, color: colors.textSecondary },
  quick: { flexDirection: 'row', gap: space.sm, marginTop: 22, paddingHorizontal: space.lg },
  quickTile: {
    flex: 1,
    height: 62,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickLabel: { fontSize: 12, fontWeight: '500' },
  off: { opacity: 0.45 },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  block: { marginTop: 22 },
  member: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  memberBody: { flex: 1, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  // No colour here: Txt's `color` prop (peach Add, red Remove) must win.
  memberName: { fontSize: 17, letterSpacing: -0.4 },
  memberMeta: { fontSize: 13, color: colors.textSecondary },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  input: {
    minHeight: 52,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    ...type.body,
  },
  save: { marginTop: space.lg },
  note: { marginTop: space.sm, fontSize: 13, color: colors.textSecondary },
  ways: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  way: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
});
