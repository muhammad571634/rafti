import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Sheet, Txt } from '@/components/ui';
import { checkSkipTo, cleanSkipTo, SKIP_TO_MAX, TIME_SKIPS, type SkipToProblem, type SteerBlock } from '@/lib/chat-steer';
import { haptic } from '@/lib/haptics';
import { colors, space } from '@/theme';
import type { TimeSkip } from '@/types';

const GLYPH: Record<Exclude<TimeSkip, 'own'>, keyof typeof Ionicons.glyphMap> = {
  scene: 'film-outline',
  later: 'hourglass-outline',
  evening: 'partly-sunny-outline',
  nextMorning: 'sunny-outline',
  week: 'calendar-outline',
};

/**
 * The chat "+" menu's Time skip (Character.AI teardown item 5): how far the story moves on, as
 * equal choices in one grey box (while a scene runs, its next moment comes first), or where to in
 * the user's own words; then what it costs and that it is story time only. While the chat cannot
 * move on (a reply on its way, their answer still to come, three in a row) the choices rest and a
 * line says why.
 */
export function TimeSkipSheet({
  visible,
  block,
  scene,
  onClose,
  onPick,
}: {
  visible: boolean;
  block: SteerBlock | null;
  /** The running scene's title: "Next moment" joins the choices (one-to-one chats only). */
  scene?: string;
  onClose: () => void;
  /** `to` carries the user's own words when `skip` is `own`. */
  onPick: (skip: TimeSkip, to?: string) => void;
}) {
  const { t } = useTranslation();
  const [own, setOwn] = useState('');
  const [problem, setProblem] = useState<SkipToProblem | null>(null);
  // Fresh each time it opens.
  useEffect(() => {
    if (!visible) return;
    setOwn('');
    setProblem(null);
  }, [visible]);

  const choices: Exclude<TimeSkip, 'own'>[] = scene ? ['scene', ...TIME_SKIPS] : [...TIME_SKIPS];
  const hint = (skip: Exclude<TimeSkip, 'own'>) => (skip === 'scene' ? t('chat.skipHint.scene', { title: scene }) : t(`chat.skipHint.${skip}`));
  const ready = !block && !!cleanSkipTo(own);

  const sendOwn = () => {
    if (block) return;
    const [first] = checkSkipTo(own);
    if (first) {
      haptic.error();
      return setProblem(first);
    }
    onPick('own', cleanSkipTo(own));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.skipTitle')} avoidKeyboard>
      <Txt style={styles.lead}>{t('chat.skipLead')}</Txt>
      <View style={styles.box}>
        {choices.map((skip, i) => (
          <Pressable
            key={skip}
            disabled={!!block}
            onPress={() => onPick(skip)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!block }}
            accessibilityLabel={`${t(`chat.skip.${skip}`)}, ${hint(skip)}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed, !!block && styles.off]}>
            <View style={styles.tile}>
              <Ionicons name={GLYPH[skip]} size={18} color={colors.text} />
            </View>
            <View style={[styles.body, i < choices.length - 1 && styles.line]}>
              <View style={styles.text}>
                <Txt style={styles.title}>{t(`chat.skip.${skip}`)}</Txt>
                <Txt style={styles.hint} lines={1}>
                  {hint(skip)}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Where to, in their own words ("After the concert"): sent with the arrow or the keyboard's Go. */}
      <View style={[styles.box, styles.own, !!block && styles.off]}>
        <TextInput
          value={own}
          onChangeText={(value) => {
            setOwn(value);
            setProblem(null);
          }}
          editable={!block}
          placeholder={t('chat.skipOwnPlaceholder')}
          placeholderTextColor={colors.textFaint}
          maxLength={SKIP_TO_MAX}
          returnKeyType="go"
          onSubmitEditing={sendOwn}
          style={styles.input}
          accessibilityLabel={t('chat.skipOwnPlaceholder')}
        />
        <Pressable
          disabled={!ready}
          onPress={sendOwn}
          accessibilityRole="button"
          accessibilityLabel={t('chat.skipOwnSend')}
          accessibilityState={{ disabled: !ready }}
          hitSlop={6}
          style={styles.send}>
          <Ionicons name="arrow-up-circle" size={30} color={ready ? colors.primary : colors.textFaint} />
        </Pressable>
      </View>

      <Txt style={[styles.note, !!problem && styles.problem]}>
        {problem ? t(`chat.skipProblem.${problem}`) : block ? t(`chat.steerBlocked.${block}`) : t('chat.skipNote')}
      </Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: space.md, fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  box: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  off: { opacity: 0.45 },
  tile: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  body: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  text: { flex: 1, gap: 1 },
  title: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  hint: { fontSize: 13, color: colors.textSecondary },
  own: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: 6 },
  input: { flex: 1, minHeight: 50, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  send: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space.md, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
  problem: { color: colors.danger },
});
