import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOARD_STYLES, boardStyle, Stationery } from '@/components/board/stationery';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CharacterAvatar, GlassButton, glassStyle, InsetGroup, PressableScale, Screen, Sheet, ShellIcon, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, space } from '@/theme';
import type { BoardStyleId } from '@/types';

const MAX_LENGTH = 300;
const THUMB_W = 52;
const THUMB_H = 62;

/**
 * Write a note for one friend on a paper of your choice and pin it to the board.
 * They find it a moment later and answer in chat.
 */
export default function BoardWriteScreen() {
  const insets = useSafeAreaInsets();
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
    // Back to where the note was started (Us or the board); the answer arrives in chat.
    if (result === 'ok') router.back();
  };

  const ready = !!text.trim() && !!to;

  return (
    // iOS Mail's New Message (approved prototype `UsBoard.dc.html`): × / title / Post in the bar,
    // a "To:" row, the paper, and the papers to choose from.
    <Screen background={colors.bg}>
      <View style={styles.bar}>
        <GlassButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
        <Txt style={styles.barTitle} accessibilityRole="header">
          {t('board.newNote')}
        </Txt>
        <PressableScale
          scaleTo={0.92}
          disabled={!ready}
          onPress={post}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          accessibilityLabel={`${t('board.post')}, ${shellCosts.boardNote} ${t('common.shells')}`}
          style={[styles.post, ready ? styles.postOn : glassStyle]}>
          <Txt style={styles.postText} color={ready ? colors.textOnPrimary : colors.textFaint}>
            {t('board.post')}
          </Txt>
          <ShellIcon size={15} />
          <Txt style={styles.postText} color={ready ? colors.textOnPrimary : colors.textFaint}>
            {shellCosts.boardNote}
          </Txt>
        </PressableScale>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xl }]} keyboardShouldPersistTaps="handled">
          <InsetGroup style={styles.toGroup}>
            <Pressable
              style={({ pressed }) => [styles.toRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${t('board.to')} ${to ? shortName(displayName(to, relationships[to.id])) : ''}, ${t('board.changeRecipient')}`}
              onPress={() => setPicking(true)}>
              <Txt style={styles.toLabel}>{t('board.to')}</Txt>
              {to ? (
                <View style={styles.toChip}>
                  <CharacterAvatar character={to} size={24} />
                  <Txt style={styles.toName} color={colors.brandText} lines={1}>
                    {shortName(displayName(to, relationships[to.id]))}
                  </Txt>
                </View>
              ) : null}
              <View style={styles.flex} />
              <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
            </Pressable>
          </InsetGroup>

          <View style={styles.paper}>
            <Stationery id={style} width={paperW} height={paperH}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('board.placeholder')}
                placeholderTextColor={ink.muted}
                maxLength={MAX_LENGTH}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t('board.placeholder')}
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

          <Txt style={styles.sectionLabel}>{t('board.paper')}</Txt>
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
                  <Stationery id={id} width={THUMB_W} height={THUMB_H} />
                </PressableScale>
              );
            })}
          </ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('board.to')}>
        <View style={styles.people}>
          {friends.map((c, i) => {
            const on = c.id === toId;
            return (
              <Pressable
                key={c.id}
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setToId(c.id);
                  setPicking(false);
                }}>
                <CharacterAvatar character={c} size={36} />
                <View style={[styles.personBody, i < friends.length - 1 && styles.line]}>
                  <Txt style={styles.personName} lines={1}>
                    {displayName(c, relationships[c.id])}
                  </Txt>
                  {on ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  barTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  post: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space.lg, borderRadius: 22 },
  postOn: { backgroundColor: colors.primaryFill },
  postText: { fontSize: 17, fontWeight: '600' },
  scroll: { paddingTop: space.sm },
  toGroup: { marginBottom: space.lg },
  toRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  toLabel: { fontSize: 17, letterSpacing: -0.4, color: colors.textSecondary },
  toChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingLeft: 3,
    paddingRight: space.md,
    borderRadius: 15,
    backgroundColor: colors.primarySofter,
  },
  toName: { fontSize: 17, fontWeight: '500', letterSpacing: -0.4, flexShrink: 1 },
  paper: { alignItems: 'center' },
  input: { flex: 1, fontSize: 17, lineHeight: 26, fontFamily: fonts.body },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { textDecorationLine: 'underline' },
  sectionLabel: {
    marginTop: 22,
    marginBottom: space.sm,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  thumbs: { gap: 14, paddingHorizontal: space.lg + 6, paddingVertical: 6 },
  // The chosen paper: a peach ring with a gap of the ground, as on the Us story ring.
  thumb: { borderRadius: 12, padding: 2, borderWidth: 2.5, borderColor: 'transparent' },
  thumbActive: { borderColor: colors.primary },
  people: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  personBody: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  personName: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
});
