import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { FIELD_RIM, gradientOf } from '@/components/create/form-parts';
import { BottomBar } from '@/components/create/kit';
import { Screen, Txt } from '@/components/ui';
import { initialsOf } from '@/lib/create-form';
import type { CreateForm } from '@/lib/create-flow';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import { ink, inkFace, inkPeachGlass } from '@/theme/ink';

const MEET = 148;

/** "Meet them": their face, their name and the first thing they will say, then the chat. */
export function MeetMoment({ form, accent, onOpen }: { form: CreateForm; accent: number; onOpen: () => void }) {
  const { t } = useTranslation();
  const you = useAppStore((s) => s.user.displayName);
  const name = form.name.trim();
  const greeting = (form.greeting.trim() || t('createCharacter.defaultGreeting', { name })).replace(/\{\{user\}\}/g, you);
  return (
    <Screen background={ink.ground}>
      <View style={styles.meet}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.meetFace}>
          {form.imageUri ? (
            <Image source={{ uri: form.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={gradientOf(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
              <Txt style={styles.meetInitial} maxFontSizeMultiplier={1}>
                {initialsOf(name)}
              </Txt>
            </LinearGradient>
          )}
        </Animated.View>
        <Animated.View entering={FadeIn.delay(220).duration(260)}>
          <Txt style={styles.meetTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {t('createCharacter.flow.meet', { name })}
          </Txt>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(420).duration(280)} style={styles.meetBubble}>
          <Txt style={styles.meetBubbleText} lines={5}>
            {greeting}
          </Txt>
        </Animated.View>
      </View>
      <BottomBar label={t('createCharacter.flow.startChat')} onPress={onOpen} left={<Ionicons name="chatbubble" size={17} color={inkPeachGlass.ctaText} />} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  meet: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: 120, gap: space.lg },
  meetFace: {
    width: MEET,
    height: MEET,
    borderRadius: MEET / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
  },
  meetInitial: { ...inkFace('display'), color: colors.white },
  meetTitle: { ...inkFace('display'), textAlign: 'center', color: ink.text },
  meetBubble: {
    maxWidth: '92%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  meetBubbleText: { ...inkFace('body'), color: ink.text },
});
