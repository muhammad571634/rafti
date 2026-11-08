import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import { Group, profileStyles, TitleTop, TopButton } from '@/components/character/kit';
import { CharacterAvatar, EmptyState, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { GROUP_MAX, GROUP_MIN, groupTitle } from '@/lib/group-chat';
import { useAppStore } from '@/store/use-app-store';
import { colors, playful, space, type } from '@/theme';

/** What the user may call a group. */
const NAME_MAX = 40;

/**
 * New group in the merged look (0z155; flow from the approved prototype): pick 2 or 3 friends the user already chats with, an
 * optional name, then one primary button. The first member says hello in the new chat.
 */
export default function NewGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const friends = useFriends();
  const createGroup = useAppStore((s) => s.createGroup);

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

  if (friends.length < GROUP_MIN) {
    return (
      <Screen background={playful.ground}>
        <TitleTop title={t('group.newGroup')} onBack={() => router.back()} />
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
    // The merged look (0z155): cream ground, a heavy title with Create beside it (peach once two
    // friends are picked), white cards for the name and the friends.
    <Screen background={playful.ground}>
      <TitleTop
        title={t('group.newGroup')}
        onBack={() => router.back()}
        right={
          <TopButton
            label={t('group.createShort')}
            accessibilityLabel={ready ? t('group.create') : t('group.pickOneMore')}
            peach
            disabled={!ready}
            onPress={create}
          />
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
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
                      <Ionicons name="close" size={12} color={colors.white} />
                    </View>
                  </View>
                  <Txt style={styles.faceName} lines={1}>
                    {shortName(f.name)}
                  </Txt>
                </PressableScale>
              );
            })}
          </View>

          <Group title={t('group.nameLabel')} right={<Txt style={styles.optional}>{t('group.optional')}</Txt>}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={ready ? fallback : t('group.nameLabel')}
              placeholderTextColor={colors.textFaint}
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
                  accessibilityLabel={on ? t('group.picked', { name: friend.name }) : friend.name}
                  onPress={() => toggle(friend.character.id)}
                />
              );
            })}
          </Group>
          <Txt style={profileStyles.footer}>{t('group.costNote')}</Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  faces: {
    flexDirection: 'row',
    gap: space.lg,
    paddingHorizontal: space.lg + space.xs,
    paddingTop: space.sm,
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
    borderColor: playful.ground,
    backgroundColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceName: { fontSize: 13, fontWeight: '600', color: playful.ink },
  // An empty seat: the dashed ring the playful layer uses for a slot waiting to be filled.
  seat: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: playful.dash,
    backgroundColor: playful.well,
  },
  optional: { fontSize: 13, color: colors.textSecondary },
  input: {
    minHeight: 54,
    paddingHorizontal: 18,
    paddingBottom: 4,
    color: colors.text,
    ...type.body,
    fontSize: 17,
  },
});
