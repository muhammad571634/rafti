import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkFriendPill, InkGlassPill, InkNavBar, InkText, PillButton } from '@/components/ink';
import { PaywallSheet } from '@/components/paywall-sheet';
import { OpenedNote } from '@/components/secret-note/opened-note';
import { WaxSealEnvelope } from '@/components/secret-note/wax-seal';
import { Anim, CharacterAvatar, EmptyState, PressableScale, Screen, ShellIcon, useScrolledPast } from '@/components/ui';
import { localSecretNote } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { secretNoteDisplayDay, waxPaletteFor, waxSealTier } from '@/lib/wax-seal';
import { shellCosts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius, inkWaxSeal } from '@/theme/ink';

const MAX_LENGTH = 400;
/** Cards glide to their new height when a note opens or arrives (on-screen move: ease-in-out). */
const GLIDE = LinearTransition.duration(320).easing(Easing.bezier(0.77, 0, 0.175, 1));

/**
 * Secret Note (Ink Night+ with approved "1. Bosib sindirish" Hold-to-Crack Wax Seal, 2026-11-27):
 * a daily question and two sealed notes. The friend identity pill stays pinned in the sticky Apple
 * HIG top bar; their card renders as an obsidian linen envelope with a sculpted 3D wax seal whose
 * finish evolves with daily return streaks (Friend Wax → Day 3 Pearl → Day 7 / Keepsake Gold).
 * Pressing and holding the seal (or tapping Swap notes) cracks the wax with tactile creaks,
 * shatters the halves, folds open the 3D flap, and reveals their editorial serif letter.
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
  const shells = useAppStore((s) => s.wallet.shells);
  const ensureSecretNote = useAppStore((s) => s.ensureSecretNote);
  const newSecretNote = useAppStore((s) => s.newSecretNote);
  const writeNote = useAppStore((s) => s.writeNote);
  const exchangeNote = useAppStore((s) => s.exchangeNote);
  const retrySecretNote = useAppStore((s) => s.retrySecretNote);

  const [paywall, setPaywall] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);
  const [focused, setFocused] = useState(false);
  const [nudgeNote, setNudgeNote] = useState(false);
  const [autoCrackSeq, setAutoCrackSeq] = useState(0);

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const rawNote = useMemo(() => notes.find((n) => n.characterId === characterId), [notes, characterId]);
  const note = rawNote ? localSecretNote(rawNote) : undefined;

  useEffect(() => {
    if (characterId) ensureSecretNote(characterId);
  }, [characterId, ensureSecretNote]);

  useEffect(() => () => clearTimeout(nudgeTimer.current), []);

  const focusNoteWithNudge = useCallback(() => {
    setNudgeNote(true);
    clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeNote(false), 900);
    inputRef.current?.focus();
  }, []);

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
  const initial = (short.trim().charAt(0) || '?').toUpperCase();
  const accent = friendAccent(character.id);

  const displayDay = secretNoteDisplayDay(notes, exchanged);
  const tier = waxSealTier(displayDay, !!note.depth);
  const sealPalette = waxPaletteFor(tier, accent.strong);
  const streakLabel =
    tier === 'gold' && displayDay >= 7
      ? t('secretNote.streakGold', { count: displayDay })
      : tier === 'pearl'
        ? t('secretNote.streakPearl', { count: displayDay })
        : displayDay >= 2
          ? t('secretNote.streakDay', { count: displayDay })
          : undefined;

  const canAfford = !!note.depth || shells >= shellCosts.secretNote;

  const checkAffordable = () => {
    if (!canAfford) {
      setPaywall(shellCosts.secretNote);
      return false;
    }
    return true;
  };

  const commitExchange = () => {
    const result = exchangeNote(note.id);
    if (result === 'noShells') {
      setPaywall(shellCosts.secretNote);
      return false;
    }
    if (result === 'ok') {
      haptic.success();
      setJustOpened(true);
      return true;
    }
    return false;
  };

  const requestSwapFromButton = () => {
    if (!canExchange) return;
    if (!checkAffordable()) return;
    // Play the full hold-crack fracture sequence before committing exchange.
    setAutoCrackSeq((s) => s + 1);
  };

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${sealPalette.accent}2A`, `${sealPalette.accent}00`]}
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
            {note.depth ? t('secretNote.depthKicker', { n: note.depth }) : t('secretNote.question')}
          </InkText>
          <InkText variant="title" accessibilityRole="header" style={styles.question}>
            {note.prompt}
          </InkText>

          {/* Their note: friend/tier diagonal wash, Hold-to-Crack Wax Seal envelope or revealed serif letter. */}
          <Animated.View
            layout={GLIDE}
            style={[
              styles.card,
              { borderColor: exchanged ? `${sealPalette.accent}48` : ink.edge },
            ]}>
            <LinearGradient
              colors={[`${sealPalette.accent}${exchanged ? '2A' : '32'}`, `${sealPalette.accent}00`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 0.85 }}
              style={StyleSheet.absoluteFill}
            />
            {exchanged ? (
              <View style={styles.cardPad}>
                <OpenedNote
                  key={note.id}
                  text={note.theirNote ?? ''}
                  reveal={justOpened}
                  accentColor={accent.strong}
                  waxTier={tier}
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
                          { backgroundColor: `${sealPalette.accent}24`, borderColor: `${sealPalette.accent}4A` },
                        ]}>
                        <Ionicons name="lock-open" size={13} color={sealPalette.rim} />
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
                    <InkText variant="quote" color={ink.photoLine} lines={1} style={styles.thinkingLine}>
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
              <Animated.View entering={FadeIn.duration(220)}>
                <WaxSealEnvelope
                  key={note.id}
                  character={character}
                  initial={initial}
                  accentColor={accent.strong}
                  tier={tier}
                  sealedTitle={t('secretNote.sealedTitle', { name: short })}
                  hintText={canExchange ? t('secretNote.holdSeal') : t('secretNote.sealedHint')}
                  streakLabel={streakLabel}
                  creaseLabel={canExchange ? t('secretNote.sealReady') : t('home.widget.sealed')}
                  accessibilityLabel={t('secretNote.swap')}
                  canBreak={canExchange}
                  autoCrackSeq={autoCrackSeq}
                  onBeforeStart={checkAffordable}
                  onBreak={commitExchange}
                  onNeedNote={focusNoteWithNudge}
                />
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
              {
                borderColor:
                  (focused || nudgeNote) && !exchanged ? `${sealPalette.accent}88` : ink.edge,
              },
            ]}>
            <TextInput
              ref={inputRef}
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
              entering={justOpened ? FadeInDown.delay(420).duration(320).easing(Easing.bezier(0.23, 1, 0.32, 1)) : undefined}
              style={styles.doneWrap}>
              <View style={styles.donePill}>
                <Ionicons name="checkmark-circle" size={16} color={inkWaxSeal.swappedMint} />
                <InkText variant="footnoteStrong" color={inkWaxSeal.swappedMint}>
                  {streakLabel ? `${t('secretNote.exchanged')} · ${streakLabel}` : t('secretNote.exchanged')}
                </InkText>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        {exchanged ? null : (
          <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
            <PillButton label={t('secretNote.swap')} onPress={requestSwapFromButton} disabled={!canExchange} style={styles.swap} />
            {/* A keepsake (`depth`) is the friend's gift: no price. */}
            {note.depth ? (
              <View style={styles.price}>
                <InkText variant="footnote" color={ink.text2}>
                  {t('common.free')}
                </InkText>
              </View>
            ) : (
              <View style={styles.price}>
                <ShellIcon size={14} />
                <InkText variant="footnote" color={ink.text2} style={styles.count}>
                  {String(shellCosts.secretNote)}
                </InkText>
              </View>
            )}
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
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginHorizontal: inkGutter + 4 },
  count: { fontVariant: ['tabular-nums'] },
  field: {
    marginTop: 8,
    marginHorizontal: inkGutter,
    minHeight: 152,
    padding: 18,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { minHeight: 116, padding: 0, ...inkFace('body'), fontSize: 16, lineHeight: 23, color: ink.text },
  doneWrap: { alignItems: 'center', marginTop: 18 },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: inkRadius.pill,
    backgroundColor: inkWaxSeal.swappedFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkWaxSeal.swappedRim,
  },
  foot: {
    paddingHorizontal: inkGutter,
    paddingTop: 12,
    alignItems: 'center',
    gap: 7,
    backgroundColor: ink.dock,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  swap: { alignSelf: 'stretch' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
