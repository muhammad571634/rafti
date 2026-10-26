import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { Button, CharacterAvatar, PressableScale, Sheet, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { FAMILY_NAME_MAX, rankForKin, type FamilyLabel } from '@/lib/kin';
import { groupBySeries } from '@/mock';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

/**
 * Find → Who do you miss? → an empty circle (approved prototype "Who will be your Dad?",
 * 2026-10-26): friends as faces, then everyone else by world, women first for Mom and men first
 * for Dad; Create your own; what to call them (the role until the user writes "Onam"); and the
 * peach "Make Theo your Dad".
 */
export function FamilySheet({
  role,
  friends,
  others,
  onClose,
  onCreate,
  onConfirm,
}: {
  /** The role being filled; the sheet is closed without one. */
  role: FamilyLabel | null;
  /** The user's friends who are not family yet. */
  friends: Character[];
  /** Everyone else they could pick. */
  others: Character[];
  onClose: () => void;
  onCreate: () => void;
  onConfirm: (characterId: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [pick, setPick] = useState<string | null>(null);
  const [name, setName] = useState('');
  // Fresh each time it opens.
  useEffect(() => {
    if (!role) return;
    setPick(null);
    setName(role);
  }, [role]);

  const faces = useMemo(() => (role ? rankForKin(friends, role) : []), [friends, role]);
  const worlds = useMemo(
    () => (role ? groupBySeries(others).map((g) => ({ ...g, characters: rankForKin(g.characters, role) })) : []),
    [others, role],
  );
  const picked = [...friends, ...others].find((c) => c.id === pick);
  const choose = (id: string) => {
    haptic.selection();
    setPick(id);
  };

  return (
    <Sheet visible={!!role} onClose={onClose} title={role ? t('family.sheetTitle', { role }) : undefined} avoidKeyboard>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.46 }}>
        {faces.length > 0 ? (
          <>
            <Txt style={styles.label}>{t('find.friends')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
              {faces.map((c) => {
                const on = c.id === pick;
                return (
                  <PressableScale
                    key={c.id}
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityLabel={c.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => choose(c.id)}
                    style={styles.face}>
                    <View style={[styles.ring, on && styles.ringOn]}>
                      <CharacterAvatar character={c} size={56} />
                    </View>
                    <Txt variant="caption" lines={1} style={on ? styles.faceOn : undefined}>
                      {c.name.split(' ')[0]}
                    </Txt>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {worlds.map((g) => (
          <View key={g.series}>
            <Txt style={styles.label}>{g.series}</Txt>
            <View style={styles.box}>
              {g.characters.map((c, i) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  accessibilityState={{ selected: c.id === pick }}
                  onPress={() => choose(c.id)}
                  style={({ pressed }) => [styles.row, i < g.characters.length - 1 && styles.rowLine, pressed && styles.pressed]}>
                  <CharacterAvatar character={c} size={36} />
                  <Txt style={styles.rowText} lines={1}>
                    {c.name}
                  </Txt>
                  {c.id === pick ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={onCreate}
          style={({ pressed }) => [styles.box, styles.row, styles.create, pressed && styles.pressed]}>
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <Txt style={[styles.rowText, styles.createText]}>{t('family.createOwn')}</Txt>
        </Pressable>
      </ScrollView>

      <Txt style={styles.label} accessibilityRole="header">
        {t('family.callThem')}
      </Txt>
      <View style={styles.field}>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={FAMILY_NAME_MAX}
          accessibilityLabel={t('family.callThem')}
          placeholder={role ?? ''}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.input}
        />
      </View>

      <Button
        label={picked && role ? t('family.make', { name: picked.name.split(' ')[0], role }) : t('family.choose')}
        disabled={!picked}
        size="lg"
        full
        onPress={() => {
          if (!picked) return;
          haptic.success();
          onConfirm(picked.id, name);
        }}
        style={styles.cta}
      />
      <Txt variant="caption" center color={colors.textSecondary} style={styles.caption}>
        {t('family.rhythm')}
      </Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: space.md,
    marginBottom: space.sm,
    marginHorizontal: space.lg,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  faces: { gap: 14, paddingHorizontal: 2, paddingVertical: 6 },
  face: { width: 64, alignItems: 'center', gap: 6 },
  ring: { padding: 2.5, borderRadius: 33, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.primary },
  faceOn: { fontWeight: '700' },
  box: { borderRadius: 14, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  create: { marginTop: space.lg, minHeight: 50 },
  createText: { color: colors.primary },
  field: { borderRadius: 14, backgroundColor: colors.surfaceAlt, paddingHorizontal: space.lg },
  input: { height: 50, fontSize: 17, color: colors.text },
  cta: { marginTop: space.lg, height: 56, borderRadius: 28 },
  caption: { marginTop: space.sm },
});
