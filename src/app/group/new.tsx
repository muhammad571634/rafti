import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import {
  CharacterAvatar,
  EmptyState,
  GlassBar,
  glassStyle,
  Header,
  InsetGroup,
  LargeTitle,
  PressableScale,
  Screen,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { shortName } from '@/lib/format';
import { GROUP_MAX, GROUP_MIN, groupTitle } from '@/lib/group-chat';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, type } from '@/theme';

/** What the user may call a group. */
const NAME_MAX = 40;

/**
 * New group (approved prototype): pick 2 or 3 friends the user already chats with, an
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
  // Past the large title, the bar shows it (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(44);

  const full = picked.length >= GROUP_MAX;
  const ready = picked.length >= GROUP_MIN;
  // The name a group gets when the field is left empty.
  const fallback = groupTitle(
    friends.filter((f) => picked.includes(f.character.id)).map((f) => shortName(f.name)),
  );

  const toggle = (id: string) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < GROUP_MAX ? [...list, id] : list));

  const create = () => {
    const id = createGroup(picked, name);
    if (id) router.replace({ pathname: '/group/[id]', params: { id } });
  };

  if (friends.length < GROUP_MIN) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('group.newGroup')} />
        <EmptyState
          symbol={{ ios: 'person.2.fill', icon: 'people' }}
          title={t('group.noFriends')}
          hint={t('group.noFriendsHint')}
          actionLabel={t('find.title')}
          onAction={() => router.replace('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const pickedFriends = friends.filter((f) => picked.includes(f.character.id));

  return (
    // iOS "New group" from the approved pieces (glass bar, large title, inset groups): Create
    // sits in the bar and wakes up once two friends are picked.
    <Screen background={colors.bg}>
      <GlassBar
        title={t('group.newGroup')}
        scrolled={scrolled}
        right={
          <PressableScale
            scaleTo={0.92}
            disabled={!ready}
            onPress={create}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
            accessibilityLabel={ready ? t('group.create') : t('group.pickOneMore')}
            style={[styles.create, ready ? styles.createOn : glassStyle]}>
            <Txt style={styles.createText} color={ready ? colors.textOnPrimary : colors.textFaint}>
              {t('group.createShort')}
            </Txt>
          </PressableScale>
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <LargeTitle>{t('group.newGroup')}</LargeTitle>

          {/* Who is in so far; a tap takes them out again (iOS Messages' "To:" faces). */}
          {pickedFriends.length > 0 ? (
            <View style={styles.faces}>
              {pickedFriends.map((f) => (
                <PressableScale
                  key={f.character.id}
                  scaleTo={0.92}
                  onPress={() => toggle(f.character.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('group.unpick', { name: f.name })}
                  style={styles.face}>
                  <View>
                    <CharacterAvatar character={f.character} size={56} />
                    <View style={styles.unpick}>
                      <Ionicons name="close" size={11} color={colors.white} />
                    </View>
                  </View>
                  <Txt style={styles.faceName} lines={1}>
                    {shortName(f.name)}
                  </Txt>
                </PressableScale>
              ))}
            </View>
          ) : null}

          <Txt style={styles.sectionLabel}>{`${t('group.nameLabel')} · ${t('group.optional')}`}</Txt>
          <InsetGroup>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={ready ? fallback : t('group.nameLabel')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('group.nameLabel')}
              maxLength={NAME_MAX}
              style={styles.input}
            />
          </InsetGroup>

          <Txt style={styles.sectionLabel}>{t('group.pickTitle')}</Txt>
          <InsetGroup>
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
          </InsetGroup>
          <Txt style={styles.footer}>{t('group.costNote')}</Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  create: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center' },
  createOn: { backgroundColor: colors.primaryFill },
  createText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  faces: { flexDirection: 'row', gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.lg },
  face: { alignItems: 'center', gap: 6, width: 64 },
  unpick: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.bg,
    backgroundColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceName: { fontSize: 13, color: colors.text },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  input: { minHeight: 48, paddingHorizontal: space.lg, color: colors.text, ...type.body, fontSize: 17 },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, color: colors.textSecondary },
});
