import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { InsetGroup, Txt } from '@/components/ui';
import { SUPPORTED_LOCALES, phoneLanguage, phoneLanguageName, setLocale } from '@/i18n';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * Sets the screen language (null = the phone's) and the language the characters write in before
 * the user has written anything (`User.locale`, src/ai/reply-language.ts).
 */
export async function pickLanguage(code: string | null) {
  await setLocale(code);
  const locale = code ?? phoneLanguage();
  useAppStore.setState((s) => ({ user: { ...s.user, locale } }));
}

/**
 * The language choice as iOS Settings → Language: "Automatic" (the phone's language) alone in the
 * first group, then every language under its own name with its name in the current language
 * beneath it ("Deutsch" / "German"). The chosen one has the accent ✓.
 */
export function LanguageList({
  value,
  showAuto = true,
  onPick,
  groupStyle,
}: {
  /** The saved language; null while it follows the phone. */
  value: string | null;
  showAuto?: boolean;
  onPick: (code: string | null) => void;
  groupStyle?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  return (
    <>
      {showAuto ? (
        <InsetGroup style={groupStyle}>
          <Row title={t('profile.languageAuto')} hint={phoneLanguageName()} on={!value} last onPress={() => onPick(null)} />
        </InsetGroup>
      ) : null}
      <InsetGroup style={[groupStyle, showAuto && styles.gap]}>
        {SUPPORTED_LOCALES.map((locale, i) => {
          const local = t(`languages.${locale.code}`, { defaultValue: '' });
          return (
            <Row
              key={locale.code}
              title={locale.label}
              hint={local && local !== locale.label ? local : undefined}
              on={value === locale.code}
              last={i === SUPPORTED_LOCALES.length - 1}
              onPress={() => onPick(locale.code)}
            />
          );
        })}
      </InsetGroup>
    </>
  );
}

function Row({ title, hint, on, last, onPress }: { title: string; hint?: string; on: boolean; last?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={hint ? `${title}, ${hint}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.body, !last && styles.line]}>
        <View style={styles.flex}>
          <Txt style={styles.title} lines={1}>
            {title}
          </Txt>
          {hint ? (
            <Txt style={styles.hint} lines={1}>
              {hint}
            </Txt>
          ) : null}
        </View>
        {on ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: space.xl },
  row: { paddingLeft: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  body: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg, paddingVertical: 8 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  flex: { flex: 1 },
  title: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  hint: { marginTop: 1, fontSize: 13, lineHeight: 17, color: colors.textSecondary },
});
