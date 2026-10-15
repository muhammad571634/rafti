import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HELPLINE_URL } from '@/ai/safety';
import { useFriends } from '@/components/group/friend-row';
import { PaywallSheet } from '@/components/paywall-sheet';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { Anim, Button, CharacterAvatar, EmptyState, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { CLIP_LINE_MAX, CLIP_MAX_LINES, CLIP_TITLE_MAX, checkClip, cleanLines, clipCost } from '@/lib/radio-clips';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';

/** How long the "is recording" moment lasts in the mock; real builds wait for the voiced file. */
const RECORD_MS = 1800;

/**
 * Make a clip (F27, approved prototype): pick a friend, write up to 5 lines, name it, and the
 * friend records it in their voice. 5 lines cost 1 shell (owner decision 2026-10-15).
 */
export default function MakeClipScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ characterId?: string }>();
  const friends = useFriends();
  const makeRadioClip = useAppStore((s) => s.makeRadioClip);
  const play = useRadioPlayer((s) => s.play);

  const [who, setWho] = useState(params.characterId);
  const [lines, setLines] = useState<string[]>(['']);
  const [title, setTitle] = useState('');
  const [recording, setRecording] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [paywall, setPaywall] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const friend = friends.find((f) => f.character.id === who) ?? friends[0];
  const name = friend ? shortName(friend.name) : '';
  const clean = cleanLines(lines);
  const cost = clipCost(clean.length);

  if (!friend) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('radio.make')} />
        <EmptyState
          icon="bubbles"
          title={t('radio.noFriends')}
          hint={t('radio.noFriendsHint')}
          actionLabel={t('find.title')}
          onAction={() => router.replace('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const edit = (i: number, text: string) => {
    setCrisis(false);
    setLines((list) => list.map((line, j) => (j === i ? text : line)));
  };
  const remove = (i: number) => {
    setCrisis(false);
    setLines((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : list));
  };
  const add = () => setLines((list) => (list.length < CLIP_MAX_LINES ? [...list, ''] : list));

  const record = () => {
    const problem = checkClip(lines);
    if (problem === 'crisis') return setCrisis(true);
    if (problem) return;
    const result = makeRadioClip(friend.character.id, clean, title);
    if (result.status === 'noShells') return setPaywall(cost);
    if (result.status !== 'made') return;
    const id = result.id;
    setRecording(true);
    timer.current = setTimeout(() => {
      const clip = useAppStore.getState().radioClips.find((c) => c.id === id);
      if (clip) play('clip', id, clip.durationSec);
      router.replace({ pathname: '/radio/[id]', params: { id } });
    }, RECORD_MS);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('radio.make')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Txt variant="h3">{t('radio.who')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friends}>
              {friends.map((f) => {
                const on = f.character.id === friend.character.id;
                return (
                  <PressableScale
                    key={f.character.id}
                    onPress={() => setWho(f.character.id)}
                    disabled={recording}
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityLabel={f.name}
                    accessibilityState={{ selected: on }}
                    style={styles.friend}>
                    <View style={[styles.ring, on && styles.ringOn]}>
                      <CharacterAvatar character={f.character} size={52} />
                    </View>
                    <Txt
                      variant={on ? 'smallStrong' : 'small'}
                      color={on ? colors.text : colors.textSecondary}
                      lines={1}
                      center>
                      {shortName(f.name)}
                    </Txt>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Txt variant="h3" style={styles.flex}>
                {t('radio.says', { name })}
              </Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('radio.lineCount', { count: clean.length, max: CLIP_MAX_LINES })}
              </Txt>
            </View>
            <View style={styles.box}>
              {lines.map((line, i) => (
                <View key={i} style={[styles.line, i > 0 && styles.divider]}>
                  <Txt variant="smallStrong" color={colors.textFaint} style={styles.lineNo}>
                    {i + 1}
                  </Txt>
                  <TextInput
                    value={line}
                    onChangeText={(text) => edit(i, text)}
                    placeholder={t('radio.linePlaceholder', { n: i + 1 })}
                    placeholderTextColor={colors.textFaint}
                    accessibilityLabel={t('radio.linePlaceholder', { n: i + 1 })}
                    maxLength={CLIP_LINE_MAX}
                    multiline
                    editable={!recording}
                    style={styles.lineInput}
                  />
                  {lines.length > 1 && !recording ? (
                    <PressableScale
                      onPress={() => remove(i)}
                      hitSlop={10}
                      scaleTo={0.88}
                      accessibilityRole="button"
                      accessibilityLabel={t('radio.removeLine', { n: i + 1 })}>
                      <Ionicons name="close" size={18} color={colors.textFaint} />
                    </PressableScale>
                  ) : null}
                </View>
              ))}
              {lines.length < CLIP_MAX_LINES && !recording ? (
                <PressableScale
                  onPress={add}
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={t('radio.addLine')}
                  style={[styles.line, styles.divider]}>
                  <Ionicons name="add" size={20} color={colors.text} />
                  <Txt variant="bodyStrong">{t('radio.addLine')}</Txt>
                </PressableScale>
              ) : null}
            </View>
            <Txt variant="small" color={colors.textSecondary}>
              {t('radio.rules', { name })}
            </Txt>
          </View>

          {crisis ? (
            <View style={styles.crisis} accessibilityLiveRegion="polite">
              <Txt variant="title">{t('radio.crisisTitle', { name })}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('radio.crisisBody')}
              </Txt>
              <Button
                label={t('safety.helplineAction')}
                variant="secondary"
                size="sm"
                onPress={() => void Linking.openURL(HELPLINE_URL)}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Txt variant="smallStrong">
              {t('radio.nameLabel')}
              <Txt variant="small" color={colors.textSecondary}>{` · ${t('radio.optional')}`}</Txt>
            </Txt>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={clean[0] ?? t('radio.nameLabel')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('radio.nameLabel')}
              maxLength={CLIP_TITLE_MAX}
              editable={!recording}
              style={styles.input}
            />
          </View>
        </ScrollView>

        {/* Action bar (docs/design-style.md §3): the button, then what it costs. */}
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          {recording ? (
            <View style={styles.recording} accessibilityLiveRegion="polite">
              <CharacterAvatar character={friend.character} size={40} />
              <Txt variant="bodyStrong">{t('radio.recording', { name })}</Txt>
              <Anim name="voiceWave" size={28} tint={colors.text} />
            </View>
          ) : (
            <Button
              label={clean.length ? t('radio.record', { name }) : t('radio.writeFirst')}
              size="lg"
              full
              disabled={!clean.length || crisis}
              onPress={record}
            />
          )}
          <Txt variant="caption" color={colors.textSecondary} center>
            {recording ? t('radio.recordingHint') : t('radio.cost', { lines: clean.length, count: cost })}
          </Txt>
        </View>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.xl },
  section: { gap: space.sm + 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  friends: { gap: space.md, paddingRight: space.lg },
  friend: { width: 64, alignItems: 'center', gap: space.xs + 2 },
  ring: { padding: 2, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.text },
  box: {
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    minHeight: 52,
    paddingHorizontal: space.md + 2,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  lineNo: { width: 18 },
  lineInput: { flex: 1, paddingVertical: space.md, color: colors.text, ...type.body },
  crisis: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
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
  recording: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
