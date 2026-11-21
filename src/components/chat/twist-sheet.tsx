import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Sheet, Txt } from '@/components/ui';
import { checkSkipTo, cleanSkipTo, TWIST_MAX, type SkipToProblem, type SteerBlock } from '@/lib/chat-steer';
import { haptic } from '@/lib/haptics';
import { colors, space } from '@/theme';

/**
 * More > Story > Twist (docs/polybuzz-core.md §5.5): something unexpected happens and turns the
 * story. "Surprise me" lets the friend pick one that fits; the field takes the user's own ("Their
 * ex walks in"). Built as the Time skip sheet is: one grey box, the own words under it, then what
 * it costs, or why the chat can't move on now.
 */
export function TwistSheet({
  visible,
  block,
  onClose,
  onPick,
}: {
  visible: boolean;
  block: SteerBlock | null;
  onClose: () => void;
  /** `to`: the twist in the user's words; none lets the friend pick. */
  onPick: (to?: string) => void;
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

  const ready = !block && !!cleanSkipTo(own, TWIST_MAX);

  const sendOwn = () => {
    if (block) return;
    const [first] = checkSkipTo(own, TWIST_MAX);
    if (first) {
      haptic.error();
      return setProblem(first);
    }
    onPick(cleanSkipTo(own, TWIST_MAX));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.attachments.twist')} avoidKeyboard>
      <Txt style={styles.lead}>{t('chat.twistLead')}</Txt>
      <View style={styles.box}>
        <Pressable
          disabled={!!block}
          onPress={() => onPick()}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!block }}
          accessibilityLabel={`${t('chat.twistSurprise')}, ${t('chat.twistSurpriseHint')}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed, !!block && styles.off]}>
          <View style={styles.tile}>
            <Ionicons name="shuffle" size={18} color={colors.text} />
          </View>
          <View style={styles.body}>
            <View style={styles.text}>
              <Txt style={styles.title}>{t('chat.twistSurprise')}</Txt>
              <Txt style={styles.hint}>{t('chat.twistSurpriseHint')}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
          </View>
        </Pressable>
      </View>

      {/* Their own twist: sent with the arrow or the keyboard's Go. */}
      <View style={[styles.box, styles.own, !!block && styles.off]}>
        <TextInput
          value={own}
          onChangeText={(value) => {
            setOwn(value);
            setProblem(null);
          }}
          editable={!block}
          placeholder={t('chat.twistOwnPlaceholder')}
          placeholderTextColor={colors.textFaint}
          maxLength={TWIST_MAX}
          returnKeyType="go"
          onSubmitEditing={sendOwn}
          style={styles.input}
          accessibilityLabel={t('chat.twistOwnPlaceholder')}
        />
        <Pressable
          disabled={!ready}
          onPress={sendOwn}
          accessibilityRole="button"
          accessibilityLabel={t('chat.twistOwnSend')}
          accessibilityState={{ disabled: !ready }}
          hitSlop={6}
          style={styles.send}>
          <Ionicons name="arrow-up-circle" size={30} color={ready ? colors.primary : colors.textFaint} />
        </Pressable>
      </View>

      <Txt style={[styles.note, !!problem && styles.problem]}>
        {problem ? t(`chat.twistProblem.${problem}`) : block ? t(`chat.steerBlocked.${block}`) : t('chat.skipNote')}
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
  text: { flex: 1, gap: 1 },
  title: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  hint: { fontSize: 13, color: colors.textSecondary },
  own: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: 6 },
  input: { flex: 1, minHeight: 50, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  send: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space.md, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
  problem: { color: colors.danger },
});
