import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { HELPLINE_URL } from '@/ai/safety';
import { useFriends } from '@/components/group/friend-row';
import { InkDock, InkNavBar, InkText, PillButton } from '@/components/ink';
import { PaywallSheet } from '@/components/paywall-sheet';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { Anim, CharacterAvatar, EmptyState, PressableScale, Screen, useScrolledPast } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { CLIP_LINE_MAX, CLIP_MAX_LINES, CLIP_TITLE_MAX, checkClip, cleanLines, clipCost } from '@/lib/radio-clips';
import { useAppStore } from '@/store/use-app-store';
import { signature, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

/** How long the "is recording" moment lasts in the mock; real builds wait for the voiced file. */
const RECORD_MS = 1800;
const PAD = 14;

/**
 * Make a clip (F27), in Ink (0z325): pick a friend, write up to 5 lines, name it, and the friend
 * records it in their voice. 5 lines cost 1 shell (owner decision 2026-10-15). Radio's purple marks
 * the chosen friend and the add row; the dock holds Record and what it costs.
 */
export default function MakeClipScreen() {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ characterId?: string }>();
  const friends = useFriends();
  const makeRadioClip = useAppStore((s) => s.makeRadioClip);
  const play = useRadioPlayer((s) => s.play);
  const { scrolled, onScroll } = useScrolledPast(44);

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
  const name = friend ? friendName(friend.character, true) : '';
  const clean = cleanLines(lines);
  const cost = clipCost(clean.length);

  const nav = <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} title={t('radio.make')} scrolled={scrolled} />;

  if (!friend) {
    return (
      <Screen background={ink.ground}>
        {nav}
        <InkText variant="display" style={styles.title}>
          {t('radio.make')}
        </InkText>
        <EmptyState
          symbol={{ ios: 'person.2.fill', icon: 'people' }}
          title={t('radio.noFriends')}
          hint={t('radio.noFriendsHint')}
          actionLabel={t('common.findSomeone')}
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
    <Screen background={ink.ground}>
      {nav}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <InkText variant="display" style={styles.title}>
            {t('radio.make')}
          </InkText>

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('radio.who')}
          </InkText>
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
                  accessibilityLabel={friendName(f.character)}
                  accessibilityState={{ selected: on }}
                  style={styles.friend}>
                  <View style={[styles.ring, on && styles.ringOn]}>
                    <CharacterAvatar character={f.character} size={52} />
                  </View>
                  <InkText variant={on ? 'footnoteStrong' : 'footnote'} color={on ? ink.text : ink.text2} lines={1} center>
                    {friendName(f.character, true)}
                  </InkText>
                </PressableScale>
              );
            })}
          </ScrollView>

          <View style={styles.labelRow}>
            <InkText variant="footnoteStrong" color={ink.text2} style={[styles.section, styles.flex]} lines={1}>
              {t('radio.says', { name })}
            </InkText>
            <InkText variant="footnote" color={ink.text2} style={styles.labelValue}>
              {t('radio.lineCount', { count: clean.length, max: CLIP_MAX_LINES })}
            </InkText>
          </View>
          <View style={styles.card}>
            {lines.map((line, i) => (
              <View key={i} style={[styles.line, i > 0 && styles.divider]}>
                <InkText variant="subStrong" color={ink.text2} style={styles.lineNo}>
                  {String(i + 1)}
                </InkText>
                <TextInput
                  value={line}
                  onChangeText={(text) => edit(i, text)}
                  placeholder={t('radio.linePlaceholder', { n: i + 1 })}
                  placeholderTextColor={ink.placeholder}
                  selectionColor={signature.radio.strong}
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
                    <Ionicons name="close-circle" size={20} color={ink.text3} />
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
                <Ionicons name="add-circle" size={22} color={signature.radio.strong} />
                <InkText variant="bodyStrong" color={signature.radio.strong}>
                  {t('radio.addLine')}
                </InkText>
              </PressableScale>
            ) : null}
          </View>
          <InkText variant="footnote" color={ink.text2} style={styles.footnote}>
            {t('radio.rules', { name })}
          </InkText>

          {crisis ? (
            <View style={[styles.card, styles.crisis]} accessibilityLiveRegion="polite">
              <InkText variant="bodyStrong">{t('radio.crisisTitle', { name })}</InkText>
              <InkText variant="sub">{t('radio.crisisBody')}</InkText>
              <PillButton
                label={t('safety.helplineAction')}
                kind="secondary"
                size="md"
                full={false}
                onPress={() => void Linking.openURL(HELPLINE_URL)}
              />
            </View>
          ) : null}

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {`${t('radio.nameLabel')} · ${t('radio.optional')}`}
          </InkText>
          <View style={styles.card}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={clean[0] ?? t('radio.nameLabel')}
              placeholderTextColor={ink.placeholder}
              selectionColor={signature.radio.strong}
              accessibilityLabel={t('radio.nameLabel')}
              maxLength={CLIP_TITLE_MAX}
              editable={!recording}
              style={styles.input}
            />
          </View>
        </ScrollView>

        {/* Record, then what it costs; while recording, the friend at work. */}
        <InkDock inFlow>
          {recording ? (
            <View style={styles.recording} accessibilityLiveRegion="polite">
              <CharacterAvatar character={friend.character} size={28} />
              <Anim name="voiceWave" size={28} tint={signature.radio.strong} />
            </View>
          ) : null}
          <PillButton
            label={recording ? t('radio.recording', { name }) : clean.length ? t('radio.record', { name }) : t('radio.writeFirst')}
            disabled={recording || !clean.length || crisis}
            onPress={record}
          />
          <InkText variant="footnote" color={ink.text2} center style={styles.caption}>
            {recording ? t('radio.recordingHint') : t('radio.cost', { lines: clean.length, count: cost })}
          </InkText>
        </InkDock>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginTop: 2, marginHorizontal: inkGutter },
  section: { paddingHorizontal: inkGutter + 6, paddingTop: 20, paddingBottom: 8 },
  friends: { gap: 14, paddingHorizontal: inkGutter },
  friend: { width: 64, alignItems: 'center', gap: 6 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: signature.radio.strong },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end' },
  labelValue: { marginBottom: 8, marginRight: inkGutter + 6, fontVariant: ['tabular-nums'] },
  card: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: PAD + 2 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ink.line },
  lineNo: { width: 18, fontVariant: ['tabular-nums'] },
  lineInput: { flex: 1, paddingVertical: 14, ...inkFace('body'), color: ink.text },
  footnote: { marginTop: 8, marginHorizontal: inkGutter + 6 },
  crisis: { marginTop: 22, gap: space.sm, padding: space.lg, alignItems: 'flex-start' },
  input: { minHeight: 50, paddingHorizontal: PAD + 4, ...inkFace('body'), color: ink.text },
  recording: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  caption: { marginTop: 6 },
});
