import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkIconButton, InkNavBar, InkText } from '@/components/ink';
import { Avatar, PressableScale, Screen, Txt, UserAvatar, useScrolledPast } from '@/components/ui';
import { perkLimit, PERKS, planWouldAllowMore } from '@/economy/perks';
import { haptic } from '@/lib/haptics';
import { defaultPersona, personaList } from '@/lib/personas';
import { useAppStore } from '@/store/use-app-store';
import { friendAccentAt, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

const CHOSEN_WASH = ink.tintFill;
const PEACH_SOFT = ink.tintFill;
const PRONOUN_BG = 'rgba(255,255,255,0.08)';
const RADIO_OFF = 'rgba(235,235,245,0.28)';

/**
 * Personas (approved Ink Night+ prototype): sticky Apple HIG nav bar with "+", editorial display
 * header with tabular quota pill, hairline-rimmed Ink inset card highlighting the default role in
 * warm peach with localized pronoun pills and 2-line about copy, plus an inset New Persona card.
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
  const { scrolled, onScroll } = useScrolledPast(34);

  const list = personaList({ user, personas });
  const current = defaultPersona({ user, personas, defaultPersonaId }).id;
  const canAdd = personas.length < limit;
  // At the free limit the row offers a plan, which allows more (a perk: personas cost us almost nothing).
  const upsell = planWouldAllowMore('personas', personas.length, limit);
  const openAdd = () => router.push(canAdd ? '/personas/edit' : '/store/shell?tab=plans');

  return (
    <Screen background={ink.ground}>
      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('personas.title')}
        scrolled={scrolled}
        right={
          canAdd || upsell ? (
            <InkIconButton
              icon="add"
              size={22}
              accessibilityLabel={canAdd ? t('personas.new') : t('personas.morePlan', { count: PERKS.personas.plan })}
              onPress={openAdd}
            />
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.headRow}>
          <InkText variant="display" accessibilityRole="header" style={styles.flex}>
            {t('personas.title')}
          </InkText>
          <View style={styles.countPill} accessible accessibilityLabel={`${personas.length} / ${limit}`}>
            <InkText variant="caption" color={ink.text2} style={styles.tabular}>
              {`${personas.length} / ${limit}`}
            </InkText>
          </View>
        </View>

        <View style={styles.inkCard}>
          {list.map((persona, index) => {
            const chosen = persona.id === current;
            const last = index === list.length - 1;
            const ringHex = persona.profile ? ink.accent : friendAccentAt(index).strong;
            const pronounLabel = persona.pronouns ? t(`personas.pronounShort.${persona.pronouns}`) : undefined;
            const summary = persona.profile ? t('personas.profile') : persona.about || t('personas.noAbout');
            return (
              // The row opens the persona; the mark beside it (its own button) picks it for new chats.
              <View key={persona.id} style={[styles.row, chosen && styles.rowChosen, !last && styles.rowLine]}>
                <Pressable
                  onPress={() =>
                    router.push(
                      persona.profile ? '/edit-profile' : { pathname: '/personas/edit', params: { id: persona.id } },
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={persona.profile ? `${persona.name}, ${t('personas.profile')}` : persona.name}
                  style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
                  <View style={[styles.avatarRing, { borderColor: chosen ? ink.accent : `${ringHex}66` }]}>
                    {persona.profile ? (
                      <UserAvatar user={user} size={40} />
                    ) : (
                      <Avatar source={persona.avatarUri} name={persona.name} size={40} accentIndex={index} />
                    )}
                  </View>
                  <View style={styles.body}>
                    <View style={styles.nameRow}>
                      <Txt style={styles.name} lines={1}>
                        {persona.name}
                      </Txt>
                      {pronounLabel ? (
                        <View style={styles.pronounPill}>
                          <Txt style={styles.pronounText} lines={1}>
                            {pronounLabel}
                          </Txt>
                        </View>
                      ) : null}
                    </View>
                    <Txt style={styles.meta} lines={2}>
                      {summary}
                    </Txt>
                    {chosen ? (
                      <Txt style={styles.defaultNote} lines={1}>
                        {t('personas.default')}
                      </Txt>
                    ) : null}
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
                  style={styles.pick}>
                  <Ionicons
                    name={chosen ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={chosen ? ink.accent : RADIO_OFF}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>

        {canAdd || upsell ? (
          <PressableScale
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={canAdd ? t('personas.new') : t('personas.morePlan', { count: PERKS.personas.plan })}
            onPress={openAdd}
            style={[styles.inkCard, styles.addCard]}>
            <View style={styles.addLeft}>
              <View style={styles.addCircle}>
                <Ionicons name={canAdd ? 'add' : 'lock-closed'} size={canAdd ? 20 : 15} color={ink.accent} />
              </View>
              <Txt style={styles.addLabel} lines={2}>
                {canAdd ? t('personas.new') : t('personas.morePlan', { count: PERKS.personas.plan })}
              </Txt>
            </View>
            <Txt style={[styles.addCount, styles.tabular]}>{`${personas.length} / ${limit}`}</Txt>
          </PressableScale>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
    marginHorizontal: inkGutter,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(118,118,128,0.20)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    marginBottom: 4,
  },
  inkCard: {
    marginHorizontal: inkGutter,
    marginTop: 16,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowChosen: { backgroundColor: CHOSEN_WASH },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 14,
  },
  pressed: { backgroundColor: ink.raised },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { ...inkFace('bodyStrong'), fontSize: 16, color: ink.text, flexShrink: 1 },
  pronounPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: inkRadius.pill,
    backgroundColor: PRONOUN_BG,
  },
  pronounText: { ...inkFace('caption'), fontSize: 11, color: ink.text2 },
  meta: { ...inkFace('footnote'), color: ink.text2 },
  defaultNote: { ...inkFace('caption'), fontSize: 11, color: ink.accent, marginTop: 1 },
  pick: { width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  addCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  addLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PEACH_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.accent, flexShrink: 1 },
  addCount: { ...inkFace('footnote'), color: ink.text2 },
});
