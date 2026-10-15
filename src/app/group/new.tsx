import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow, useFriends } from '@/components/group/friend-row';
import { Button, EmptyState, Header, Screen, Txt } from '@/components/ui';
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
          icon="bubbles"
          title={t('group.noFriends')}
          hint={t('group.noFriendsHint')}
          actionLabel={t('find.title')}
          onAction={() => router.replace('/(tabs)/find')}
        />
      </Screen>
    );
  }

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('group.newGroup')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Txt variant="h2">{t('group.pickTitle')}</Txt>
            <Txt variant="body" color={colors.textSecondary}>
              {t('group.pickBody')}
            </Txt>
          </View>

          <View>
            {friends.map((friend) => {
              const on = picked.includes(friend.character.id);
              return (
                <FriendRow
                  key={friend.character.id}
                  friend={friend}
                  picked={on}
                  locked={full && !on}
                  accessibilityLabel={on ? t('group.picked', { name: friend.name }) : friend.name}
                  onPress={() => toggle(friend.character.id)}
                />
              );
            })}
          </View>

          <View style={styles.field}>
            <Txt variant="smallStrong">
              {t('group.nameLabel')}
              <Txt variant="small" color={colors.textSecondary}>{` · ${t('group.optional')}`}</Txt>
            </Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={ready ? fallback : t('group.nameLabel')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('group.nameLabel')}
              maxLength={NAME_MAX}
              style={styles.input}
            />
          </View>
        </ScrollView>

        {/* Action bar (docs/design-style.md §3): the button, then one line on what it costs. */}
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button
            label={ready ? t('group.create') : t('group.pickOneMore')}
            size="lg"
            full
            disabled={!ready}
            onPress={create}
          />
          <Txt variant="caption" color={colors.textSecondary} center>
            {t('group.costNote')}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  intro: { gap: space.xs + 2, paddingTop: space.sm },
  field: { gap: space.xs + 2 },
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
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
