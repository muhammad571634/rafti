import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupAvatar } from '@/components/group-avatar';
import { FriendRow, useFriends } from '@/components/group/friend-row';
import { InkGlassPill, InkNavBar, InkText } from '@/components/ink';
import { planDate } from '@/components/plans/copy';
import { Button, CharacterAvatar, PressableScale, Screen, Sheet, Toggle, Txt, useScrolledPast } from '@/components/ui';
import { confirmAlert as confirm } from '@/lib/alert';
import { chatDrafts } from '@/lib/chat-drafts';
import { shortName } from '@/lib/format';
import { canAddMember, canRemoveMember, groupTitle } from '@/lib/group-chat';
import { forgetNotes } from '@/lib/voice-files';
import { callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, space, systemColors, type } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

const NAME_MAX = 40;
const HERO_RING = '#14332C';
const HERO_RIM = 'rgba(95,224,196,0.24)';
const PEACH_SOFT = 'rgba(235,173,132,0.16)';
const GLASS_RIM = 'rgba(255,255,255,0.10)';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Group info (approved Ink Night+ prototype): sticky Apple HIG nav bar with scroll-edge title +
 * dark-glass Edit pill, stained-glass mint group hero card, glass quick actions (Call, Add,
 * Search), hairline-rimmed Ink inset groups with friend-accent ringed members, Mute, and Delete.
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
  const { scrolled, onScroll } = useScrolledPast(160);

  const members = useMemo(
    () => (group?.memberIds ?? []).flatMap((m) => characters.find((c) => c.id === m) ?? []),
    [group?.memberIds, characters],
  );

  if (!group || !groupId) {
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} title={t('group.info')} scrolled />
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
    confirm(
      t('group.deleteTitle'),
      t('group.deleteBody'),
      t('group.delete'),
      () => {
        chatDrafts.forget(groupId);
        void forgetNotes(groupId);
        deleteGroup(groupId);
        if (router.canDismiss()) router.dismissAll();
        router.replace('/(tabs)/chat');
      },
      t('group.cancel'),
    );

  const startCall = () => {
    if (callMinutes > 0) return router.push({ pathname: '/group/[id]/call', params: { id: groupId } });
    router.push(withCalls ? '/store/shell?tab=shells' : '/store/shell?tab=plans&plan=pro');
  };

  const quick: { key: string; icon: IoniconName; color: string; label: string; onPress: () => void; off?: boolean }[] = [
    { key: 'call', icon: 'call', color: systemColors.green, label: t('characterSettings.quickCall'), onPress: startCall },
    { key: 'add', icon: 'person-add', color: ink.accent, label: t('group.add'), onPress: () => setAdding(true), off: !roomLeft },
    {
      key: 'search',
      icon: 'search',
      color: systemColors.blue,
      label: t('characterSettings.quickSearch'),
      onPress: () => router.push({ pathname: '/group/[id]/search', params: { id: groupId } }),
    },
  ];

  const madeLine = t('group.made', {
    members: t('group.members', { count: members.length }),
    date: planDate(Date.parse(group.createdAt)),
  });

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(45,212,191,0.16)', 'rgba(9,9,13,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={title}
        scrolled={scrolled}
        right={
          <InkGlassPill
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
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + space.huge }}>
        {/* Stained-glass mint group hero card */}
        <View style={styles.heroCard}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(45,212,191,0.18)', 'rgba(20,83,61,0.10)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <GroupAvatar members={members} size={96} ringColor={HERO_RING} />
          <InkText variant="card" style={styles.heroName} lines={2} accessibilityRole="header">
            {title}
          </InkText>
          <InkText variant="footnote" color={ink.text2} style={styles.heroMeta} lines={2}>
            {madeLine}
          </InkText>
        </View>

        {/* Quick glass actions */}
        <View style={styles.quickRow}>
          {quick.map((q) => (
            <PressableScale
              key={q.key}
              disabled={q.off}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!q.off }}
              accessibilityLabel={q.label}
              onPress={q.onPress}
              style={[styles.quickBtn, q.off && styles.off]}>
              <Ionicons name={q.icon} size={20} color={q.color} />
              <InkText variant="caption" color={ink.text2} lines={1}>
                {q.label}
              </InkText>
            </PressableScale>
          ))}
        </View>

        <Txt style={styles.sectionLabel}>{t('group.membersCount', { count: members.length, max: 3 })}</Txt>
        <View style={styles.inkCard}>
          {members.map((m, i) => {
            const level = relationships[m.id]?.level ?? 0;
            const acc = friendAccent(m.id).strong;
            const last = i === members.length - 1 && !roomLeft;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMember(m)}
                accessibilityRole="button"
                accessibilityLabel={level >= 1 ? `${nameOf(m)}, ${t('home.bondLevel', { level })}` : nameOf(m)}
                style={({ pressed }) => [styles.memberRow, pressed && styles.rowPressed, !last && styles.rowLine]}>
                <View style={[styles.avatarRing, { borderColor: acc }]}>
                  <CharacterAvatar character={m} size={40} />
                </View>
                <View style={styles.memberBody}>
                  <Txt style={styles.memberTitle} lines={1}>
                    {nameOf(m)}
                  </Txt>
                  {level >= 1 ? (
                    <Txt style={[styles.memberMeta, styles.tabular]} lines={1}>
                      {t('closeness.level', { level })}
                    </Txt>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={15} color={ink.text3} />
              </Pressable>
            );
          })}
          {roomLeft ? (
            <Pressable
              onPress={() => setAdding(true)}
              accessibilityRole="button"
              accessibilityLabel={t('group.addMember')}
              style={({ pressed }) => [styles.memberRow, pressed && styles.rowPressed]}>
              <View style={styles.addCircle}>
                <Ionicons name="add" size={20} color={ink.accent} />
              </View>
              <Txt style={styles.addLabel} lines={1}>
                {t('group.addMember')}
              </Txt>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.inkCard, styles.groupGap]}>
          <Pressable
            onPress={() => router.push({ pathname: '/group/[id]/background', params: { id: groupId } })}
            accessibilityRole="button"
            accessibilityLabel={t('background.title')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}>
            <View style={[styles.iconTile, { backgroundColor: systemColors.indigo }]}>
              <Ionicons name="image" size={17} color={colors.white} />
            </View>
            <Txt style={[styles.settingLabel, styles.flex]} lines={1}>
              {t('background.title')}
            </Txt>
            <Ionicons name="chevron-forward" size={15} color={ink.text3} />
          </Pressable>
        </View>

        <View style={[styles.inkCard, styles.groupGap]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconTile, { backgroundColor: systemColors.orange }]}>
              <Ionicons name="notifications-off" size={17} color={colors.white} />
            </View>
            <Txt style={[styles.settingLabel, styles.flex]} lines={1}>
              {t('group.mute')}
            </Txt>
            <Toggle
              value={group.muted}
              onChange={(v) => setGroupMuted(groupId, v)}
              onColor={systemColors.green}
              accessibilityLabel={t('group.mute')}
            />
          </View>
        </View>

        <View style={[styles.inkCard, styles.groupGap]}>
          <Pressable
            onPress={askDelete}
            accessibilityRole="button"
            accessibilityLabel={t('group.delete')}
            style={({ pressed }) => [styles.settingRow, styles.dangerRow, pressed && styles.rowPressed]}>
            <Txt style={styles.dangerLabel} lines={1}>
              {t('group.delete')}
            </Txt>
          </Pressable>
        </View>
      </ScrollView>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title={t('group.nameLabel')} avoidKeyboard>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={names}
          placeholderTextColor={ink.placeholder}
          selectionColor={ink.accent}
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
          <Txt variant="body" color={ink.text2}>
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
                iconColor={systemColors.indigo}
                label={t('group.openProfile')}
                onPress={() => {
                  setMember(null);
                  router.push(`/character/${member.id}`);
                }}
              />
              {conversations.some((c) => c.characterId === member.id) ? (
                <SheetRow icon="chatbubble-outline" iconColor={ink.accent} label={t('group.openChat')} onPress={() => openChat(member)} />
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

/** A row in a sheet's Ink group: the action and a line icon on the right, as in iOS menus. */
function SheetRow({
  icon,
  iconColor,
  label,
  onPress,
  danger,
  disabled,
  last,
}: {
  icon: IoniconName;
  iconColor?: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  last?: boolean;
}) {
  const tint = danger ? ink.danger : ink.text;
  return (
    <Pressable
      style={({ pressed }) => [styles.way, !last && styles.line, pressed && styles.rowPressed, disabled && styles.off]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      onPress={onPress}>
      <Txt style={[styles.memberName, styles.flex]} color={tint}>
        {label}
      </Txt>
      <Ionicons name={icon} size={19} color={danger ? ink.danger : iconColor ?? tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  missing: { padding: space.xl, color: ink.text2 },
  off: { opacity: 0.42 },
  heroCard: {
    marginHorizontal: inkGutter,
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HERO_RIM,
    backgroundColor: ink.card,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroName: { marginTop: 14, textAlign: 'center' },
  heroMeta: { marginTop: 3, textAlign: 'center' },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: inkGutter,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    minHeight: 62,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    ...inkFace('footnoteStrong'),
    color: ink.text2,
    marginTop: 22,
    marginBottom: 8,
    marginHorizontal: inkGutter + 6,
  },
  inkCard: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  groupGap: { marginTop: 14 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowPressed: { backgroundColor: ink.raised },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberBody: { flex: 1, minWidth: 0, gap: 2 },
  memberTitle: { ...inkFace('bodyStrong'), fontSize: 15.5, color: ink.text },
  memberMeta: { ...inkFace('footnote'), color: ink.text2 },
  addCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PEACH_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.accent, flex: 1 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { ...inkFace('body'), fontSize: 16, color: ink.text },
  dangerRow: { justifyContent: 'center' },
  dangerLabel: { ...inkFace('bodyStrong'), fontSize: 16, color: ink.danger },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  memberName: { ...inkFace('body') },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#0E0E14',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    color: ink.text,
    ...type.body,
  },
  save: { marginTop: space.lg },
  note: { ...inkFace('footnote'), marginTop: space.sm, color: ink.text2 },
  ways: {
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  way: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 16 },
});
