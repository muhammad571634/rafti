import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { CharacterAvatar, Divider, EmptyState, Header, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { duration as fmtDuration, relativeStamp } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { CallRecord, Character } from '@/types';

const AVATAR = 46;

export default function CallHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const calls = useAppStore((s) => s.calls);
  const characters = useAppStore((s) => s.characters);

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('callHistory.title')} />

      {calls.length === 0 ? (
        <EmptyState
          title={t('callHistory.empty')}
          hint={t('callHistory.emptyHint')}
        />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <Divider inset={space.lg + AVATAR + space.md} />}
          renderItem={({ item }) => {
            const character = characters.find((c) => c.id === item.characterId);
            if (!character) return null;
            return (
              <CallRow
                call={item}
                character={character}
                onCall={() => router.push(`/call/${character.id}`)}
                onOpen={() => router.push(`/character/${character.id}`)}
              />
            );
          }}
        />
      )}
    </Screen>
  );
}

function CallRow({
  call,
  character,
  onCall,
  onOpen,
}: {
  call: CallRecord;
  character: Character;
  onCall: () => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const tint = call.missed ? colors.danger : colors.textMuted;

  return (
    // The call-back button sits beside the row's tap area, not inside it.
    <View style={styles.row}>
      <PressableScale style={styles.rowTap} onPress={onOpen} scaleTo={0.99}>
        <CharacterAvatar character={character} size={AVATAR} />

        <View style={styles.body}>
          <Txt variant="bodyStrong" color={call.missed ? colors.danger : colors.text} lines={1}>
            {character.name}
          </Txt>
          <View style={styles.meta}>
            <Ionicons
              name={call.missed ? 'call-outline' : call.direction === 'incoming' ? 'arrow-down' : 'arrow-up'}
              size={12}
              color={tint}
            />
            <Txt variant="caption" color={colors.textMuted}>
              {call.missed
                ? t('call.missed')
                : `${t(`call.${call.direction}`)} · ${fmtDuration(call.durationSec)}`}
            </Txt>
          </View>
        </View>

        <Txt variant="caption" color={colors.textFaint}>
          {relativeStamp(call.startedAt)}
        </Txt>
      </PressableScale>
      <IconButton
        icon="call-outline"
        size={19}
        onPress={onCall}
        accessibilityLabel={t('a11y.callBack')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: space.huge },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
