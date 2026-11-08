import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import {
  DangerRow,
  FaceGlyph,
  FaceRow,
  Group,
  GroupFace,
  LinkRow,
  ProfileTop,
  QuickAction,
  QuickRow,
  SwitchRow,
  TitleTop,
  TopButton,
} from '@/components/character/kit';
import { Button, CharacterAvatar, Screen, Sheet, Txt, useScrolledPast } from '@/components/ui';
import { planDate } from '@/components/plans/copy';
import { chatDrafts } from '@/lib/chat-drafts';
import { forgetNotes } from '@/lib/voice-files';
import { shortName } from '@/lib/format';
import { canAddMember, canRemoveMember, groupTitle } from '@/lib/group-chat';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, playful, space, type } from '@/theme';
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
 * Group info in the merged look (0z155; layout from the approved prototype): the group's face and name, its members (open their
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
  // Past the group's face and name, the bar shows the name (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(220);

  const members = useMemo(
    () => (group?.memberIds ?? []).flatMap((m) => characters.find((c) => c.id === m) ?? []),
    [group?.memberIds, characters],
  );

  if (!group || !groupId) {
    return (
      <Screen background={playful.ground}>
        <TitleTop title={t('group.info')} onBack={() => router.back()} />
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
      chatDrafts.forget(groupId);
      void forgetNotes(groupId);
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
    // The merged look (0z155), twin of chat settings: cream ground, the group's mint card, white cards.
    <Screen background={playful.ground}>
      <ProfileTop
        title={title}
        showTitle={scrolled}
        onBack={() => router.back()}
        right={
          <TopButton
            label={t('common.edit')}
            accessibilityLabel={t('group.rename')}
            onPress={() => {
              setDraft(group.name ?? '');
              setRenaming(true);
            }}
          />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: space.xs, paddingBottom: insets.bottom + space.huge }}>
        <GroupFace
          members={members}
          name={title}
          line={t('group.made', {
            members: t('group.members', { count: members.length }),
            date: planDate(Date.parse(group.createdAt)),
          })}
        />

        <QuickRow center>
          {quick.map((q) => (
            <QuickAction key={q.key} icon={q.icon} label={q.label} disabled={q.off} onPress={q.onPress} />
          ))}
        </QuickRow>

        <Group title={t('group.membersCount', { count: members.length, max: 3 })}>
          {members.map((m, i) => {
            const level = relationships[m.id]?.level ?? 0;
            return (
              <FaceRow
                key={m.id}
                face={<CharacterAvatar character={m} size={44} />}
                title={nameOf(m)}
                meta={level >= 1 ? t('closeness.level', { level }) : undefined}
                last={i === members.length - 1 && !roomLeft}
                accessibilityLabel={level >= 1 ? `${nameOf(m)}, ${t('home.bondLevel', { level })}` : nameOf(m)}
                onPress={() => setMember(m)}
              />
            );
          })}
          {roomLeft ? (
            <FaceRow
              face={<FaceGlyph icon="add" />}
              title={t('group.addMember')}
              tint={colors.brandText}
              end={null}
              last
              accessibilityLabel={t('group.addMember')}
              onPress={() => setAdding(true)}
            />
          ) : null}
        </Group>

        <Group>
          <LinkRow label={t('background.title')} last onPress={() => router.push({ pathname: '/group/[id]/background', params: { id: groupId } })} />
        </Group>

        <Group>
          <SwitchRow label={t('group.mute')} value={group.muted} onChange={(v) => setGroupMuted(groupId, v)} last />
        </Group>

        <Group>
          <DangerRow label={t('group.delete')} last onPress={askDelete} />
        </Group>
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

      {/* Every friend can be on this list: never taller than the screen, it scrolls. */}
      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('group.addMemberTitle')} scroll>
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
  off: { opacity: 0.45 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  // No colour here: Txt's `color` prop (peach Add, red Remove) must win.
  memberName: { fontSize: 17, letterSpacing: -0.4 },
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
