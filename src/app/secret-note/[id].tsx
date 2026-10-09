import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { Anim, Button, Card, Header, Screen, ShellIcon, Txt } from '@/components/ui';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space, type } from '@/theme';

const MAX_LENGTH = 400;

/**
 * Secret Note: a daily question, two sealed notes. The character writes theirs
 * first ("Thinking..."), you write yours, and one swap opens both at once.
 */
export default function SecretNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const notes = useAppStore((s) => s.notes);
  const ensureSecretNote = useAppStore((s) => s.ensureSecretNote);
  const newSecretNote = useAppStore((s) => s.newSecretNote);
  const writeNote = useAppStore((s) => s.writeNote);
  const exchangeNote = useAppStore((s) => s.exchangeNote);

  const [paywall, setPaywall] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);

  const note = useMemo(() => notes.find((n) => n.characterId === characterId), [notes, characterId]);

  useEffect(() => {
    if (characterId) ensureSecretNote(characterId);
  }, [characterId, ensureSecretNote]);

  if (!character || !note) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('secretNote.title')} />
      </Screen>
    );
  }

  const exchanged = note.status === 'exchanged';
  const composing = note.status === 'composing';
  const canExchange = note.status === 'ready' && note.myNote.trim().length > 0;
  const name = displayName(character, relationship);

  const exchange = () => {
    const result = exchangeNote(note.id);
    if (result === 'noShells') setPaywall(shellCosts.secretNote);
    if (result === 'ok') setJustOpened(true);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('secretNote.title')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.prompt}>
            <Txt variant="caption" color={colors.textMuted} center>
              {t('secretNote.question')}
            </Txt>
            <Txt variant="h2" center style={styles.promptText}>
              {`“${note.prompt}”`}
            </Txt>
          </View>

          <Card variant="outlined">
            {exchanged ? (
              <>
                {justOpened ? <Anim name="loveLetter" size={120} loop={false} style={styles.letter} /> : null}
                <Txt variant="smallStrong" color={colors.textMuted}>
                  {t('secretNote.theirNote', { name })}
                </Txt>
                <Txt variant="body" style={styles.noteText}>
                  {note.theirNote}
                </Txt>
              </>
            ) : composing ? (
              <View style={styles.row}>
                <Anim name="typing" size={26} tint={colors.bond} />
                <Txt variant="small" color={colors.textMuted}>
                  {t('secretNote.thinking')}
                </Txt>
              </View>
            ) : (
              <View style={styles.row}>
                <View style={styles.lock}>
                  <Ionicons name="lock-closed-outline" size={19} color={colors.bondText} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{t('secretNote.sealedTitle', { name })}</Txt>
                  <Txt variant="small" color={colors.textMuted}>
                    {t('secretNote.sealedHint')}
                  </Txt>
                </View>
              </View>
            )}
          </Card>

          <Txt variant="h3" style={styles.label}>
            {t('secretNote.yourNote')}
          </Txt>
          <Card variant="outlined">
            <TextInput
              value={note.myNote}
              onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
              placeholder={t('secretNote.placeholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              multiline
              editable={!exchanged}
              textAlignVertical="top"
              accessibilityLabel={t('secretNote.yourNote')}
            />
            <Txt variant="caption" color={colors.textFaint} style={styles.counter}>
              {t('secretNote.counter', { count: note.myNote.length })}
            </Txt>
          </Card>

          {exchanged ? (
            <View style={styles.doneBlock}>
              <View style={styles.done}>
                <Ionicons name="checkmark-circle-outline" size={17} color={colors.bondText} />
                <Txt variant="smallStrong" color={colors.bondText}>
                  {t('secretNote.exchanged')}
                </Txt>
              </View>
              <Button
                label={t('secretNote.newQuestion')}
                variant="secondary"
                left={<Ionicons name="refresh-outline" size={16} color={colors.text} />}
                onPress={() => {
                  setJustOpened(false);
                  newSecretNote(character.id);
                }}
              />
            </View>
          ) : null}
        </ScrollView>

        {exchanged ? null : (
          <View style={styles.footer}>
            <Button
              label={t('secretNote.swap')}
              size="lg"
              full
              disabled={!canExchange}
              onPress={exchange}
              right={
                <View style={styles.cost}>
                  <ShellIcon size={16} />
                  <Txt variant="bodyStrong" color={colors.textOnPrimary}>
                    {shellCosts.secretNote}
                  </Txt>
                </View>
              }
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  prompt: { paddingHorizontal: space.sm, paddingVertical: space.lg, gap: space.sm },
  promptText: { lineHeight: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lock: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    backgroundColor: palette.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { alignSelf: 'center', marginTop: -space.md },
  noteText: { marginTop: space.sm },
  label: { marginTop: space.md },
  input: {
    minHeight: 120,
    padding: 0,
    color: colors.text,
    ...type.body,
  },
  counter: { alignSelf: 'flex-end', marginTop: space.sm },
  doneBlock: { alignItems: 'center', gap: space.md, marginTop: space.md },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // Action bar (docs/design-style.md §3): white, hairline on top.
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cost: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
});
