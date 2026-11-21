import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import { Group } from '@/components/character/kit';
import { InkDock, InkNavBar, InkText, PillButton } from '@/components/ink';
import { CharacterAvatar, EmptyState, PressableScale, Screen, useScrolledPast } from '@/components/ui';
import { shortName } from '@/lib/format';
import { GROUP_MAX, GROUP_MIN, groupTitle } from '@/lib/group-chat';
import { useAppStore } from '@/store/use-app-store';
import { space } from '@/theme';
import { ink, inkFace, inkGutter } from '@/theme/ink';

/** What the user may call a group. */
const NAME_MAX = 40;

/**
 * New group, in Ink (0z325; flow from the approved prototype, 0z155): pick 2 or 3 friends the user
 * already chats with, an optional name, then the one pill at the bottom. The first member says hello
 * in the new chat.
 */
export default function NewGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const friends = useFriends();
  const createGroup = useAppStore((s) => s.createGroup);
  const { scrolled, onScroll } = useScrolledPast(44);

  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState('');

  const full = picked.length >= GROUP_MAX;
  const ready = picked.length >= GROUP_MIN;
  // The name a group gets when the field is left empty.
  const fallback = groupTitle(friends.filter((f) => picked.includes(f.character.id)).map((f) => shortName(f.name)));

  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < GROUP_MAX ? [...list, id] : list));

  const create = () => {
    const id = createGroup(picked, name);
    if (id) router.replace({ pathname: '/group/[id]', params: { id } });
  };

  const nav = <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} title={t('group.newGroup')} scrolled={scrolled} />;

  if (friends.length < GROUP_MIN) {
    return (
      <Screen background={ink.ground}>
        {nav}
        <InkText variant="display" style={styles.title}>
          {t('group.newGroup')}
        </InkText>
        <EmptyState
          symbol={{ ios: 'person.2.fill', icon: 'people' }}
          title={t('group.noFriends')}
          hint={t('group.noFriendsHint')}
          actionLabel={t('common.findSomeone')}
          onAction={() => router.replace('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const pickedFriends = friends.filter((f) => picked.includes(f.character.id));

  return (
    <Screen background={ink.ground}>
      {nav}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <InkText variant="display" style={styles.title}>
            {t('group.newGroup')}
          </InkText>

          {/* Who is in so far, in GROUP_MAX seats that are always there, so the list below never
              jumps under the finger when the first friend is picked; a tap on a face takes them
              out again (iOS Messages' "To:" faces). */}
          <View style={styles.faces}>
            {Array.from({ length: GROUP_MAX }, (_, i) => {
              const f = pickedFriends[i];
              if (!f)
                return (
                  <View key={`seat-${i}`} style={styles.face} accessible={false}>
                    <View style={styles.seat} />
                  </View>
                );
              return (
                <PressableScale
                  key={f.character.id}
                  scaleTo={0.92}
                  onPress={() => toggle(f.character.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('group.unpick', { name: f.name })}
                  style={styles.face}>
                  <View>
                    <CharacterAvatar character={f.character} size={60} />
                    <View style={styles.unpick}>
                      <Ionicons name="close" size={12} color={ink.text} />
                    </View>
                  </View>
                  <InkText variant="caption" color={ink.text} lines={1}>
                    {shortName(f.name)}
                  </InkText>
                </PressableScale>
              );
            })}
          </View>

          <Group
            title={t('group.nameLabel')}
            right={
              <InkText variant="footnote" color={ink.text2}>
                {t('group.optional')}
              </InkText>
            }>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={ready ? fallback : t('group.nameLabel')}
              placeholderTextColor={ink.placeholder}
              selectionColor={ink.accent}
              accessibilityLabel={t('group.nameLabel')}
              maxLength={NAME_MAX}
              style={styles.input}
            />
          </Group>

          <Group title={t('group.pickTitle')}>
            {friends.map((friend, i) => {
              const on = picked.includes(friend.character.id);
              return (
                <FriendRow
                  key={friend.character.id}
                  friend={friend}
                  picked={on}
                  locked={full && !on}
                  last={i === friends.length - 1}
                  accessibilityLabel={on ? t('group.picked', { name: friend.name, context: friend.character.gender }) : friend.name}
                  onPress={() => toggle(friend.character.id)}
                />
              );
            })}
          </Group>
          <InkText variant="footnote" color={ink.text2} style={styles.footer}>
            {t('group.costNote')}
          </InkText>
        </ScrollView>

        <InkDock inFlow>
          <PillButton
            label={t('group.create')}
            accessibilityLabel={ready ? t('group.create') : t('group.pickOneMore')}
            disabled={!ready}
            onPress={create}
          />
        </InkDock>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginTop: 2, marginHorizontal: inkGutter },
  faces: {
    flexDirection: 'row',
    gap: space.lg,
    paddingHorizontal: inkGutter + space.xs,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  face: { alignItems: 'center', gap: 6, width: 68, minHeight: 86 },
  unpick: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: ink.ground,
    backgroundColor: ink.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // An empty seat: a dashed ring, a slot waiting to be filled.
  seat: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ink.placeholder,
    backgroundColor: ink.hairlineFill,
  },
  input: { ...inkFace('body'), minHeight: 54, paddingHorizontal: 18, paddingBottom: 4, color: ink.text },
  footer: { marginTop: 10, marginHorizontal: inkGutter + 6 },
});
