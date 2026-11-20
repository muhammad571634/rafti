import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkFriendPill, InkGlassPill, InkNavBar, InkText, PillButton } from '@/components/ink';
import { PaywallSheet } from '@/components/paywall-sheet';
import { OpenedNote } from '@/components/secret-note/opened-note';
import { Anim, CharacterAvatar, EmptyState, PressableScale, Screen, ShellIcon, useScrolledPast } from '@/components/ui';
import { localSecretNote } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

const MAX_LENGTH = 400;
/** Cards glide to their new height when a note opens or arrives (on-screen move: ease-in-out). */
const GLIDE = LinearTransition.duration(320).easing(Easing.bezier(0.77, 0, 0.175, 1));
const SWAPPED_MINT = '#5FE0C4';
const SWAPPED_FILL = 'rgba(95,224,196,0.12)';
const SWAPPED_RIM = 'rgba(95,224,196,0.30)';
const DOCK_BG = 'rgba(9,9,13,0.94)';

/**
 * Secret Note (approved Ink Night+ prototype): a daily question and two sealed notes. The friend
 * identity pill stays pinned in the sticky Apple HIG top bar before and after swap; their card
 * shifts from Thinking / Sealed (dark-glass accent lock + envelope crease) into an editorial serif
 * letter with their avatar and name intact; Your note wears a hairline edge that lights in their
 * accent on focus.
 */
export default function SecretNoteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scrolled, onScroll } = useScrolledPast(34);
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
  const retrySecretNote = useAppStore((s) => s.retrySecretNote);

  const [paywall, setPaywall] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);
  const [focused, setFocused] = useState(false);

  const rawNote = useMemo(() => notes.find((n) => n.characterId === characterId), [notes, characterId]);
  const note = rawNote ? localSecretNote(rawNote) : undefined;

  useEffect(() => {
    if (characterId) ensureSecretNote(characterId);
  }, [characterId, ensureSecretNote]);

  if (!character || !note) {
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} />
        <InkText variant="display" style={styles.emptyTitle}>
          {t('secretNote.title')}
        </InkText>
        {/* No such friend any more (deleted, blocked, an old link); with one, the note is being made. */}
        {!character ? (
          <EmptyState
            symbol={{ ios: 'envelope.open', icon: 'mail-open-outline' }}
            title={t('secretNote.gone')}
            actionLabel={t('common.back')}
            onAction={() => router.back()}
          />
        ) : null}
      </Screen>
    );
  }

  const exchanged = note.status === 'exchanged';
  const composing = note.status === 'composing';
  const canExchange = note.status === 'ready' && note.myNote.trim().length > 0;
  const fullName = displayName(character, relationship);
  const short = shortName(fullName);
  const accent = friendAccent(character.id);

  const exchange = () => {
    const result = exchangeNote(note.id);
    if (result === 'noShells') setPaywall(shellCosts.secretNote);
    if (result === 'ok') {
      haptic.success();
      setJustOpened(true);
    }
  };

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${accent.strong}2A`, `${accent.strong}00`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <InkNavBar
          backLabel={t('common.back')}
          onBack={() => router.back()}
          scrolled={scrolled}
          center={
            <InkFriendPill
              character={character}
              name={short}
              ringColor={accent.strong}
              onPress={() => router.push(`/character/${character.id}`)}
            />
          }
          right={
            exchanged ? (
              <InkGlassPill
                label={t('secretNote.newQuestion')}
                icon="refresh"
                onPress={() => {
                  setJustOpened(false);
                  newSecretNote(character.id);
                }}
              />
            ) : undefined
          }
        />

        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
          keyboardShouldPersistTaps="handled">
          <InkText variant="footnoteStrong" color={ink.text2} style={styles.kicker}>
            {t('secretNote.question')}
          </InkText>
          <InkText variant="title" accessibilityRole="header" style={styles.question}>
            {note.prompt}
          </InkText>

          {/* Their note: friend-accent diagonal wash, sealed/composing state or revealed serif letter. */}
          <Animated.View
            layout={GLIDE}
            style={[
              styles.card,
              { borderColor: exchanged ? `${accent.strong}44` : 'rgba(255,255,255,0.10)' },
            ]}>
            <LinearGradient
              colors={[`${accent.strong}${exchanged ? '2E' : '38'}`, `${accent.strong}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 0.85 }}
              style={StyleSheet.absoluteFill}
            />
            {exchanged ? (
              <View style={styles.cardPad}>
                <OpenedNote
                  key={note.id}
                  text={note.theirNote ?? ''}
                  sealedTitle={t('secretNote.sealedTitle', { name: short })}
                  sealedHint={t('secretNote.sealedHint')}
                  reveal={justOpened}
                  accentColor={accent.strong}
                  header={
                    <View style={styles.openedHeader}>
                      <View style={styles.whoRow}>
                        <View style={[styles.avatarRingSm, { borderColor: accent.strong }]}>
                          <CharacterAvatar character={character} size={28} />
                        </View>
                        <InkText variant="footnoteStrong" color={ink.text} lines={1} style={styles.flex}>
                          {t('secretNote.theirNote', { name: short })}
                        </InkText>
                      </View>
                      <View
                        style={[
                          styles.unlockBadge,
                          { backgroundColor: `${accent.strong}24`, borderColor: `${accent.strong}4A` },
                        ]}>
                        <Ionicons name="lock-open" size={13} color={accent.strong} />
                      </View>
                    </View>
                  }
                />
              </View>
            ) : composing && note.busy ? (
              <View style={[styles.cardPad, styles.row]}>
                <InkText variant="sub" style={styles.flex}>
                  {t('games.busy', { name: short })}
                </InkText>
                <PressableScale scaleTo={0.95} accessibilityRole="button" onPress={() => retrySecretNote(note.id)}>
                  <InkText variant="subStrong" color={accent.strong}>
                    {t('common.retry')}
                  </InkText>
                </PressableScale>
              </View>
            ) : composing ? (
              <Animated.View entering={FadeIn.duration(220)} style={styles.cardPad}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatarRingMd, { borderColor: accent.strong }]}>
                    <CharacterAvatar character={character} size={34} />
                  </View>
                  <View style={styles.flex}>
                    <InkText variant="subStrong" color={ink.text} lines={1}>
                      {t('secretNote.theirNote', { name: short })}
                    </InkText>
                    <InkText variant="quote" color="rgba(255,255,255,0.70)" lines={1} style={styles.thinkingLine}>
                      {t('secretNote.thinking')}
                    </InkText>
                  </View>
                  <View style={styles.typingPill}>
                    <Anim name="typing" size={22} tint={accent.strong} />
                  </View>
                </View>
                <InkText variant="footnote" color={ink.text2}>
                  {t('secretNote.sealedHint')}
                </InkText>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(220)} style={styles.cardPad}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatarRingLg, { borderColor: accent.strong }]}>
                    <CharacterAvatar character={character} size={38} />
                  </View>
                  <View style={styles.flex}>
                    <InkText variant="subStrong" color={ink.text} lines={1}>
                      {t('secretNote.sealedTitle', { name: short })}
                    </InkText>
                    <InkText variant="footnote" color={ink.text2} lines={2} style={styles.sealedHint}>
                      {t('secretNote.sealedHint')}
                    </InkText>
                  </View>
                  <View style={[styles.sealLock, { borderColor: `${accent.strong}52` }]}>
                    <Ionicons name="lock-closed" size={16} color={accent.strong} />
                  </View>
                </View>

                {/* Subtle sealed envelope crease divider */}
                <View style={styles.creaseRow}>
                  <LinearGradient
                    colors={[`${accent.strong}55`, 'rgba(255,255,255,0.06)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.creaseLine}
                  />
                  <InkText variant="caption" color={accent.strong} style={styles.creaseText}>
                    {t('home.widget.sealed')}
                  </InkText>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', `${accent.strong}55`]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.creaseLine}
                  />
                </View>
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View layout={GLIDE} style={styles.labelRow}>
            <InkText variant="footnoteStrong" color={ink.text2}>
              {t('secretNote.yourNote')}
            </InkText>
            <InkText variant="footnote" color={ink.text3} style={styles.count}>
              {`${note.myNote.length} / ${MAX_LENGTH}`}
            </InkText>
          </Animated.View>

          <Animated.View
            layout={GLIDE}
            style={[
              styles.field,
              { borderColor: focused && !exchanged ? `${accent.strong}77` : 'rgba(255,255,255,0.09)' },
            ]}>
            <TextInput
              value={note.myNote}
              onChangeText={(text) => writeNote(note.id, text.slice(0, MAX_LENGTH))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t('secretNote.placeholder')}
              placeholderTextColor={ink.placeholder}
              selectionColor={accent.strong}
              style={styles.input}
              multiline
              editable={!exchanged}
              textAlignVertical="top"
              accessibilityLabel={t('secretNote.yourNote')}
            />
          </Animated.View>

          {exchanged ? (
            <Animated.View
              entering={justOpened ? FadeInDown.delay(560).duration(320).easing(Easing.bezier(0.23, 1, 0.32, 1)) : undefined}
              style={styles.doneWrap}>
              <View style={styles.donePill}>
                <Ionicons name="checkmark-circle" size={16} color={SWAPPED_MINT} />
                <InkText variant="footnoteStrong" color={SWAPPED_MINT}>
                  {t('secretNote.exchanged')}
                </InkText>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        {exchanged ? null : (
          <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
            <PillButton label={t('secretNote.swap')} onPress={exchange} disabled={!canExchange} style={styles.swap} />
            <View style={styles.price}>
              <ShellIcon size={14} />
              <InkText variant="footnote" color={ink.text2} style={styles.count}>
                {String(shellCosts.secretNote)}
              </InkText>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  flex: { flex: 1 },
  emptyTitle: { marginTop: 4, marginHorizontal: inkGutter },
  kicker: { marginTop: 10, marginHorizontal: inkGutter },
  question: { marginTop: 6, marginHorizontal: inkGutter },
  card: {
    marginTop: 20,
    marginHorizontal: inkGutter,
    minHeight: 118,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardPad: { flex: 1, padding: 18, gap: 14, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  openedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  whoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatarRingSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarRingMd: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarRingLg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unlockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingLine: { fontSize: 13.5, lineHeight: 18 },
  typingPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(9,9,13,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sealedHint: { marginTop: 1 },
  sealLock: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(9,9,13,0.48)',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creaseLine: { flex: 1, height: StyleSheet.hairlineWidth },
  creaseText: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginHorizontal: inkGutter + 4 },
  count: { fontVariant: ['tabular-nums'] },
  field: {
    marginTop: 8,
    marginHorizontal: inkGutter,
    minHeight: 172,
    padding: 18,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { minHeight: 136, padding: 0, ...inkFace('body'), fontSize: 16, lineHeight: 23, color: ink.text },
  doneWrap: { alignItems: 'center', marginTop: 18 },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: inkRadius.pill,
    backgroundColor: SWAPPED_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SWAPPED_RIM,
  },
  foot: {
    paddingHorizontal: inkGutter,
    paddingTop: 12,
    alignItems: 'center',
    gap: 7,
    backgroundColor: DOCK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  swap: { alignSelf: 'stretch' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
