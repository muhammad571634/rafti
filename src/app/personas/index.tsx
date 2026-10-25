import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddRow, Avatar, GlassBar, InsetGroup, LargeTitle, Screen, Txt, UserAvatar, useScrolledPast } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { defaultPersona, personaList } from '@/lib/personas';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * Who the user can be in a chat (Character.AI's personas): the profile first, then up to five
 * of their own. Tap one to edit it (the profile opens Edit profile); the round mark picks the
 * one new chats use. A chat can use another from its settings ("You are").
 */
export default function PersonasScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const personas = useAppStore((s) => s.personas);
  const defaultPersonaId = useAppStore((s) => s.defaultPersonaId);
  const setDefaultPersona = useAppStore((s) => s.setDefaultPersona);
  const limit = useAppStore((s) => perkLimit('personas', s.wallet.subscription, Date.now()));
  const { scrolled, onScroll } = useScrolledPast(44);

  const list = personaList({ user, personas });
  const current = defaultPersona({ user, personas, defaultPersonaId }).id;
  const canAdd = personas.length < limit;
  // At the free limit the row offers a plan, which allows more (a perk: personas cost us almost nothing).
  const upsell = planWouldAllowMore('personas', personas.length, limit);

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('personas.title')} scrolled={scrolled} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('personas.title')}</LargeTitle>

        <InsetGroup style={styles.first}>
          {list.map((persona, index) => {
            const chosen = persona.id === current;
            const last = index === list.length - 1;
            return (
              // The row opens the persona; the mark beside it (its own button) picks it for new chats.
              <View key={persona.id} style={styles.row}>
                <Pressable
                  onPress={() => router.push(persona.profile ? '/edit-profile' : { pathname: '/personas/edit', params: { id: persona.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={persona.profile ? `${persona.name}, ${t('personas.profile')}` : persona.name}
                  style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                  {persona.profile ? (
                    <UserAvatar user={user} size={40} />
                  ) : (
                    <Avatar source={persona.avatarUri} name={persona.name} size={40} accentIndex={index} />
                  )}
                  <View style={[styles.body, !last && styles.line]}>
                    <Txt style={styles.name} lines={1}>
                      {persona.name}
                    </Txt>
                    <Txt style={styles.meta} lines={1}>
                      {persona.profile ? t('personas.profile') : persona.about || t('personas.noAbout')}
                    </Txt>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptic.selection();
                    setDefaultPersona(persona.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={t('personas.useByDefault', { name: persona.name })}
                  style={[styles.pick, !last && styles.line]}>
                  <Ionicons name={chosen ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={chosen ? colors.primary : colors.textFaint} />
                </Pressable>
              </View>
            );
          })}
        </InsetGroup>

        {canAdd || upsell ? (
          <InsetGroup style={styles.gap}>
            <AddRow
              label={canAdd ? t('personas.new') : t('personas.morePlan', { count: PERKS.personas.plan })}
              count={`${personas.length}/${limit}`}
              locked={!canAdd}
              onPress={() => router.push(canAdd ? '/personas/edit' : '/store/shell?tab=plans')}
            />
          </InsetGroup>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: 14 },
  gap: { marginTop: space.xxl },
  row: { flexDirection: 'row', backgroundColor: colors.surface },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  body: { flex: 1, minHeight: 64, justifyContent: 'center' },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  name: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  meta: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  pick: { width: 56, alignItems: 'center', justifyContent: 'center' },
});
