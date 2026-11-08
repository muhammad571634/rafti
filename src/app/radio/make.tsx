import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HELPLINE_URL } from '@/ai/safety';
import { useFriends } from '@/components/group/friend-row';
import { PaywallSheet } from '@/components/paywall-sheet';
import { featureStyles, FeatureBar } from '@/components/feature/feature-kit';
import { BUY_BAR_SPACE, GroupLabel, StoreBuyBar } from '@/components/plans/store-look';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { Anim, Button, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { CLIP_LINE_MAX, CLIP_MAX_LINES, CLIP_TITLE_MAX, checkClip, cleanLines, clipCost } from '@/lib/radio-clips';
import { useAppStore } from '@/store/use-app-store';
import { colors, signature, space, systemGround } from '@/theme';

/** How long the "is recording" moment lasts in the mock; real builds wait for the voiced file. */
const RECORD_MS = 1800;
const PAD = 14;

/**
 * Make a clip (F27): pick a friend, write up to 5 lines, name it, and the friend records it in
 * their voice. 5 lines cost 1 shell (owner decision 2026-10-15). A feature screen on Apple's white
 * ground in Radio's purple (design-style §10): friends with a purple ring, the lines as one grey card
 * of fields, and the buy bar with Record and what it costs.
 */
export default function MakeClipScreen() {
  const insets = useSafeAreaInsets();
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
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
  const name = friend ? friendName(friend.character, true) : '';
  const clean = cleanLines(lines);
  const cost = clipCost(clean.length);

  const back = <FeatureBar backLabel={t('common.back')} onBack={() => router.back()} />;

  if (!friend) {
    return (
      <Screen background={systemGround.ground}>
        {back}
        <LargeTitle>{t('radio.make')}</LargeTitle>
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
    <Screen background={systemGround.ground}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {back}
          <LargeTitle>{t('radio.make')}</LargeTitle>

          <GroupLabel>{t('radio.who')}</GroupLabel>
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
                  <Txt style={[styles.friendName, on && styles.friendNameOn]} lines={1} center>
                    {friendName(f.character, true)}
                  </Txt>
                </PressableScale>
              );
            })}
          </ScrollView>

          <View style={styles.labelRow}>
            <GroupLabel>{t('radio.says', { name })}</GroupLabel>
            <Txt style={styles.labelValue}>{t('radio.lineCount', { count: clean.length, max: CLIP_MAX_LINES })}</Txt>
          </View>
          <View style={featureStyles.card}>
            {lines.map((line, i) => (
              <View key={i} style={[styles.line, i > 0 && styles.divider]}>
                <Txt style={styles.lineNo}>{i + 1}</Txt>
                <TextInput
                  value={line}
                  onChangeText={(text) => edit(i, text)}
                  placeholder={t('radio.linePlaceholder', { n: i + 1 })}
                  placeholderTextColor={systemGround.secondaryLabel}
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
                    <Ionicons name="close-circle" size={20} color={systemGround.secondaryLabel} />
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
                <Txt style={styles.addText}>{t('radio.addLine')}</Txt>
              </PressableScale>
            ) : null}
          </View>
          <Txt style={styles.footnote}>{t('radio.rules', { name })}</Txt>

          {crisis ? (
            <View style={[featureStyles.card, styles.crisis]} accessibilityLiveRegion="polite">
              <Txt variant="title">{t('radio.crisisTitle', { name })}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('radio.crisisBody')}
              </Txt>
              <Button label={t('safety.helplineAction')} variant="secondary" size="sm" onPress={() => void Linking.openURL(HELPLINE_URL)} />
            </View>
          ) : null}

          <GroupLabel>{`${t('radio.nameLabel')} · ${t('radio.optional')}`}</GroupLabel>
          <View style={featureStyles.card}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={clean[0] ?? t('radio.nameLabel')}
              placeholderTextColor={systemGround.secondaryLabel}
              accessibilityLabel={t('radio.nameLabel')}
              maxLength={CLIP_TITLE_MAX}
              editable={!recording}
              style={styles.input}
            />
          </View>
        </ScrollView>

        {/* The buy bar in Radio's purple: Record, then what it costs; while recording, the friend at work. */}
        <StoreBuyBar
          label={recording ? t('radio.recording', { name }) : clean.length ? t('radio.record', { name }) : t('radio.writeFirst')}
          caption={recording ? t('radio.recordingHint') : t('radio.cost', { lines: clean.length, count: cost })}
          disabled={recording || !clean.length || crisis}
          onPress={record}
          system
          look={signature.radio}
          left={recording ? <CharacterAvatar character={friend.character} size={28} /> : undefined}>
          {recording ? (
            <View style={styles.recording} accessibilityLiveRegion="polite">
              <Anim name="voiceWave" size={28} tint={signature.radio.strong} />
            </View>
          ) : null}
        </StoreBuyBar>
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  friends: { gap: 14, paddingHorizontal: space.lg },
  friend: { width: 64, alignItems: 'center', gap: 6 },
  ring: { padding: 2, borderRadius: 30, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: signature.radio.strong },
  friendName: { fontSize: 13, color: systemGround.secondaryLabel },
  friendNameOn: { fontWeight: '700', color: systemGround.label },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  labelValue: { marginBottom: 6, marginRight: space.lg * 2, fontSize: 13, color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: PAD },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  lineNo: { width: 18, fontSize: 15, fontWeight: '700', color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  lineInput: { flex: 1, paddingVertical: 14, fontSize: 17, letterSpacing: -0.4, color: systemGround.label },
  addText: { fontSize: 17, fontWeight: '600', color: signature.radio.text },
  footnote: { marginTop: 8, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: systemGround.secondaryLabel },
  crisis: { marginTop: 22, gap: space.sm, padding: space.lg, alignItems: 'flex-start' },
  input: { minHeight: 50, paddingHorizontal: PAD + 2, fontSize: 17, letterSpacing: -0.4, color: systemGround.label },
  recording: { alignItems: 'center' },
});
