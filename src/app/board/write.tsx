import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { BOARD_STYLES, boardStyle, Stationery } from '@/components/board/stationery';
import { PaywallSheet } from '@/components/paywall-sheet';
import { Button, CharacterAvatar, Header, PressableScale, Screen, Sheet, ShellIcon, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, radius, space } from '@/theme';
import type { BoardStyleId } from '@/types';

const MAX_LENGTH = 300;
const THUMB_W = 64;
const THUMB_H = 74;

/**
 * Write a note for one friend on a paper of your choice and pin it to the board.
 * They find it a moment later and answer in chat.
 */
export default function BoardWriteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ characterId?: string }>();

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const postBoardNote = useAppStore((s) => s.postBoardNote);

  // Anyone the user already talks to can receive a note.
  const friends = useMemo(
    () => characters.filter((c) => relationships[c.id] && conversations.some((v) => v.characterId === c.id)),
    [characters, relationships, conversations],
  );

  const [toId, setToId] = useState(params.characterId ?? friends[0]?.id);
  const [style, setStyle] = useState<BoardStyleId>('cloud');
  const [text, setText] = useState('');
  const [picking, setPicking] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);

  const to = characters.find((c) => c.id === toId);
  const ink = boardStyle(style);
  const paperW = Math.min(width - space.lg * 2, 420);
  const paperH = Math.round(paperW * 1.12);

  const post = () => {
    if (!to) return;
    const result = postBoardNote(to.id, text, style);
    if (result === 'noShells') return setPaywall(shellCosts.boardNote);
    if (result === 'ok') router.replace('/board');
  };

  return (
    <Screen background={colors.bg}>
      <Header title={t('board.title')} center />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.paper}>
            <Stationery id={style} width={paperW} height={paperH}>
              <PressableScale
                style={styles.to}
                scaleTo={0.95}
                accessibilityLabel={t('board.changeRecipient')}
                onPress={() => setPicking(true)}>
                <Txt variant="smallStrong">{t('board.to')}</Txt>
                {to ? <CharacterAvatar character={to} size={26} /> : null}
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </PressableScale>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('board.placeholder')}
                placeholderTextColor={ink.muted}
                maxLength={MAX_LENGTH}
                multiline
                textAlignVertical="top"
                style={[styles.input, { color: ink.ink }]}
              />

              <View style={styles.foot}>
                <PressableScale scaleTo={0.94} hitSlop={8} disabled={!text} onPress={() => setText('')}>
                  <Txt variant="small" color={ink.muted} style={styles.clear}>
                    {t('board.clear')}
                  </Txt>
                </PressableScale>
                <Txt variant="caption" color={ink.muted}>
                  {text.length}/{MAX_LENGTH}
                </Txt>
              </View>
            </Stationery>
          </View>
        </ScrollView>

        <View style={styles.tray}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {BOARD_STYLES.map(({ id }) => {
              const active = id === style;
              return (
                <PressableScale
                  key={id}
                  scaleTo={0.94}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`board.style.${id}`)}
                  style={[styles.thumb, active && styles.thumbActive]}
                  onPress={() => setStyle(id)}>
                  <Stationery id={id} width={THUMB_W - 12} height={THUMB_H - 12} />
                  {active ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={12} color={colors.textOnPrimary} />
                    </View>
                  ) : null}
                </PressableScale>
              );
            })}
          </ScrollView>

          <Button
            label={t('board.post')}
            size="lg"
            full
            disabled={!text.trim() || !to}
            onPress={post}
            right={
              <View style={styles.cost}>
                <ShellIcon size={16} />
                <Txt variant="bodyStrong" color={colors.textOnPrimary}>
                  {shellCosts.boardNote}
                </Txt>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('board.to')}>
        <View style={styles.people}>
          {friends.map((c) => (
            <PressableScale
              key={c.id}
              style={styles.person}
              scaleTo={0.94}
              onPress={() => {
                setToId(c.id);
                setPicking(false);
              }}>
              <CharacterAvatar character={c} size={54} ring={c.id === toId} ringColor={colors.text} />
              <Txt variant="tiny" lines={1} color={c.id === toId ? colors.text : colors.textMuted}>
                {shortName(displayName(c, relationships[c.id]))}
              </Txt>
            </PressableScale>
          ))}
        </View>
      </Sheet>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg },
  paper: { alignItems: 'center' },
  to: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingLeft: space.md,
    paddingRight: space.sm,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, marginTop: space.md, fontSize: 17, lineHeight: 26, fontFamily: fonts.body },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { textDecorationLine: 'underline' },
  tray: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: space.md,
  },
  thumbs: { gap: space.sm },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbActive: { borderColor: colors.primary },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingBottom: space.md },
  person: { alignItems: 'center', gap: space.xs, width: 60 },
});
