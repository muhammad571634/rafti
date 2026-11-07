import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { CharacterAvatar, ModuleLine, PressableScale, SFIcon, Txt, type ModuleKey } from '@/components/ui';
import { colors, fonts, isDark, moduleColors, moduleTints, systemColors } from '@/theme';
import type { Ionicons as IoniconsSet } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

import type { Character, WidgetKind } from '@/types';

/** Every widget, in the gallery's order. */
export const WIDGET_KINDS: WidgetKind[] = [
  'calls',
  'diary',
  'date',
  'sleep',
  'gifts',
  'store',
  'photos',
  'radio',
  'board',
  'contacts',
  'bond',
];

/** The Today tile a widget stands in for; Bond has none. */
export const WIDGET_MODULE: Record<WidgetKind, ModuleKey | null> = {
  calls: 'calls',
  diary: 'diary',
  date: 'date',
  sleep: 'sleep',
  gifts: 'gifts',
  store: 'store',
  photos: 'photo',
  radio: 'radio',
  board: 'board',
  contacts: 'contacts',
  bond: null,
};

const LABEL_KEY: Record<WidgetKind, string> = {
  calls: 'home.short.calls',
  diary: 'home.short.diary',
  date: 'home.short.dating',
  sleep: 'home.short.bedtime',
  gifts: 'home.short.gifts',
  store: 'home.short.store',
  photos: 'home.short.photo',
  radio: 'home.short.radio',
  board: 'home.short.board',
  contacts: 'home.short.contacts',
  bond: 'home.widget.bond',
};

/** A widget's name, as the gallery and VoiceOver say it. */
export const widgetLabel = (kind: WidgetKind, t: TFunction) => t(LABEL_KEY[kind]);

/** Near square, as an iOS small widget, so a plan's or a note's words fit whole (owner, 2026-11-05). */
export const WIDGET_HEIGHT = 172;

/** What one widget shows; `WidgetView` draws it the same way in every slot and in the gallery. */
export interface WidgetModel {
  kind: WidgetKind;
  label: string;
  faces: Character[];
  badge?: string;
  /** A big number or time, with an optional word after it */
  figure?: string;
  unit?: string;
  title?: string;
  /** How many lines the title may take (a plan's name: two); on iOS it shrinks a little before it is cut. */
  titleLines?: number;
  line: string;
  /** A small face before `line`: who the plan is with, who wakes you (the top row keeps one button only). */
  lineFace?: Character;
  /** How many lines `line` may take (Bond's "7 to the next level" runs long in Russian): one by default. */
  lineLines?: number;
  /** What comes after the main thing, as list rows with a small face each (the next plans, more alarms). */
  list?: { face?: Character; text: string }[];
  /** A row of seven: weekday letters (an alarm's days) or dots (the check-in week); `on` in ink. */
  days?: { label?: string; on: boolean }[];
  photo?: string | number;
  onPress: () => void;
  /** A friend as a contact card: their face in the middle, `title` their name, `line` under it (Calls). */
  person?: Character;
  /** The mark on the contact card's face: green "can call", red "missed their call". */
  personDot?: 'call' | 'missed';
  /** Words shown as they are, large: the widget is the thing itself (the board's note). */
  quote?: string;
  /** How far toward the next step, 0-1, as a filling bar (Bond). */
  progress?: number;
  /** Round buttons that each do one thing (HIG Widgets: a few clear actions), in the corner or under a person. */
  buttons?: WidgetButton[];
  /** The one main thing as a dark pill along the foot (Gifts: Spin). */
  pill?: { label: string; onPress: () => void };
}

/** One round widget button: a glyph, what it says to VoiceOver, what it does. */
export interface WidgetButton {
  glyph: { ios: SFSymbol; icon: keyof typeof IoniconsSet.glyphMap };
  label: string;
  onPress: () => void;
  /** `go`: the one thing to do now, white on green (call back a missed call). */
  tone?: 'go';
}

/** The sizes words step down through to fit (`FitText`); the last is the floor, then they are cut. */
const QUOTE_SIZES = [15, 14, 13, 12] as const;
const SUBTITLE_SIZES = [15, 14, 13] as const;
const TITLE_SIZES = [17, 16, 15] as const;

/**
 * One widget card. `preview` draws it inert, for the gallery. Its buttons are siblings of the
 * card's own press area, never inside it: a button in a button breaks on web.
 *
 * Each widget shows what it does by its face, as iOS widgets do (owner, 2026-11-04): a friend to
 * call is a contact card with call and message buttons, the board shows the note itself, the bond
 * a bar filling toward the next level, the shells a balance with "+", the daily spin a dark pill.
 */
export function WidgetView({
  model,
  height = WIDGET_HEIGHT,
  preview,
  onPress,
  onLongPress,
}: {
  model: WidgetModel;
  height?: number;
  preview?: boolean;
  /** Replaces the widget's own tap (edit mode: open the gallery for this slot). */
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  // Photos is `photo`; Bond is the only widget with no module tile.
  const key = WIDGET_MODULE[model.kind] ?? 'bond';
  const tone = moduleColors[key];
  // A picture keeps its scrim and white words; every other widget wears its module's light tint
  // with ink on it (the playful skin, four-tab prototype). The line under a title stays full ink:
  // a faded ink fails contrast on every tint.
  const onPhoto = model.photo != null;
  const ink = onPhoto ? colors.white : colors.text;
  const sub = onPhoto ? SUB : colors.text;
  const tint = moduleTints[key] ?? moduleTints.bond;
  // The board widget is a note pinned up: a little tilt and a strip of tape.
  const pinned = model.kind === 'board' && !onPhoto;
  const buttons = model.buttons ?? [];
  // In edit mode (or the gallery) a tap belongs to the card, so its buttons do nothing.
  const inert = preview || !!onPress;
  const person = model.person;

  const words = (
    <View style={model.pill ? styles.abovePill : undefined}>
      {model.quote ? (
        // The thing itself, whole where it fits: a step smaller before it is cut, never tiny.
        <FitText key={model.quote} text={model.quote} lines={4} sizes={QUOTE_SIZES} style={styles.quote} color={ink} />
      ) : (
        <>
          {model.figure ? (
            <View style={styles.figureLine}>
              <Txt style={[styles.figure, { color: ink }]} lines={1}>
                {model.figure}
              </Txt>
              {model.unit ? (
                <Txt style={[styles.unit, { color: sub }]} lines={1}>
                  {model.unit}
                </Txt>
              ) : null}
            </View>
          ) : null}
          {model.title && model.titleLines && model.titleLines > 1 ? (
            // A plan's or a clip's name, whole where it fits.
            <FitText
              key={model.title}
              text={model.title}
              lines={model.titleLines}
              sizes={model.figure ? SUBTITLE_SIZES : TITLE_SIZES}
              style={model.figure ? styles.subtitle : styles.title}
              color={ink}
            />
          ) : model.title ? (
            <Txt style={[model.figure ? styles.subtitle : styles.title, { color: ink }]} lines={1}>
              {model.title}
            </Txt>
          ) : null}
        </>
      )}
      {model.days ? (
        <View style={styles.days}>
          {model.days.map((d, i) =>
            d.label != null ? (
              <Txt key={i} style={[styles.dayLetter, { color: ink, opacity: d.on ? 1 : 0.45 }]}>
                {d.label}
              </Txt>
            ) : (
              <View key={i} style={[styles.dayDot, d.on && { backgroundColor: ink }]} />
            ),
          )}
        </View>
      ) : null}
      {model.progress != null ? (
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${Math.round(Math.max(0.04, Math.min(1, model.progress)) * 100)}%` }]} />
        </View>
      ) : null}
      {model.pill || !model.line ? null : model.lineFace ? (
        <View style={styles.lineRow}>
          <CharacterAvatar character={model.lineFace} size={18} />
          <Txt variant="caption" color={sub} lines={model.lineLines ?? 1} style={styles.flexText}>
            {model.line}
          </Txt>
        </View>
      ) : (
        <Txt variant="caption" color={sub} lines={model.lineLines ?? 1}>
          {model.line}
        </Txt>
      )}
      {model.list && !model.pill
        ? // What comes after, as list rows under the first (a forecast's next days), each with its face.
          model.list.map((row, i) => (
            <View key={i} style={styles.afterRow}>
              {row.face ? (
                <CharacterAvatar character={row.face} size={18} />
              ) : (
                <View style={styles.afterDotBox}>
                  <View style={[styles.afterDot, { backgroundColor: ink }]} />
                </View>
              )}
              <Txt variant="caption" color={sub} lines={1} style={styles.flexText}>
                {row.text}
              </Txt>
            </View>
          ))
        : null}
    </View>
  );

  const body = person ? (
    // A contact card: the face in the middle, the name, a word on it; the buttons sit below.
    <View style={styles.person}>
      <View>
        <CharacterAvatar character={person} size={46} ring ringColor={colors.white} />
        <View style={[styles.callDot, model.personDot === 'missed' && styles.missedDot]}>
          <Ionicons name="call" size={10} color={colors.white} />
        </View>
      </View>
      <Txt style={[styles.personName, { color: ink }]} lines={1}>
        {model.title}
      </Txt>
      <Txt style={[styles.personLine, { color: sub }]} lines={1}>
        {model.line}
      </Txt>
    </View>
  ) : (
    <>
      <View style={styles.top}>
        {onPhoto ? <View /> : <ModuleLine name={key} size={28} color={ink} />}
        <View style={[styles.faces, buttons.length > 0 && { marginRight: buttons.length * (BUTTON + 8) }]}>
          {model.faces.slice(0, 3).map((c, i) => (
            <CharacterAvatar key={c.id} character={c} size={28} ring ringColor={colors.white} style={i > 0 && styles.overlap} />
          ))}
          {model.badge ? (
            <View style={[styles.badge, !onPhoto && styles.badgeInk]}>
              <Txt style={[styles.badgeText, { color: onPhoto ? tone[1] : colors.textOnInk }]}>{model.badge}</Txt>
            </View>
          ) : null}
        </View>
      </View>
      {words}
    </>
  );

  return (
    <View style={[styles.card, !onPhoto && { backgroundColor: tint }, pinned && styles.pinned, { height }]}>
      {pinned ? <View style={styles.tape} pointerEvents="none" /> : null}
      {onPhoto ? (
        <>
          <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
          <Image source={model.photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <LinearGradient colors={PHOTO_SCRIM} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      {preview ? (
        <View style={styles.fill}>{body}</View>
      ) : (
        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={model.label}
          onPress={onPress ?? model.onPress}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={styles.fill}>
          {body}
        </PressableScale>
      )}
      {buttons.length ? (
        <View style={person ? styles.buttonsFoot : styles.buttonsTop} pointerEvents={inert ? 'none' : 'box-none'}>
          {buttons.map((b) => (
            <PressableScale
              key={b.label}
              scaleTo={0.88}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              onPress={b.onPress}
              style={[styles.button, onPhoto && styles.buttonOnPhoto, b.tone === 'go' && styles.buttonGo]}>
              <SFIcon ios={b.glyph.ios} icon={b.glyph.icon} size={18} color={b.tone === 'go' ? colors.white : ink} weight="medium" />
            </PressableScale>
          ))}
        </View>
      ) : null}
      {model.pill ? (
        <View style={styles.pillWrap} pointerEvents={inert ? 'none' : 'box-none'}>
          <PressableScale scaleTo={0.94} accessibilityRole="button" accessibilityLabel={model.pill.label} onPress={model.pill.onPress} style={styles.pill}>
            <Txt style={styles.pillText} lines={1}>
              {model.pill.label}
            </Txt>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Words that should show whole: at their size when they fit in `lines`, else a step smaller, down to
 * the last of `sizes`, then cut. A hidden twin with no line limit counts the lines. Not
 * `adjustsFontSizeToFit`: Android ignores its `minimumFontScale`, and a diary page came out
 * microscopic on the A51 (2026-11-05), while plain cutting lost the end of a short note.
 */
function FitText({
  text,
  lines,
  sizes,
  style,
  color,
}: {
  text: string;
  lines: number;
  sizes: readonly number[];
  style: StyleProp<TextStyle>;
  color: string;
}) {
  // New words start again from the largest size: callers key this by its text.
  const [step, setStep] = useState(0);
  const last = sizes.length - 1;
  const size = sizes[Math.min(step, last)];
  const fit = { fontSize: size, lineHeight: Math.round(size * 1.27) };
  return (
    <View>
      <Txt style={[style, fit, { color }]} lines={lines}>
        {text}
      </Txt>
      {step < last ? (
        <Txt
          style={[style, fit, styles.twin]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onTextLayout={(e) => {
            // Only from the size it measured: a late layout of an older size moves nothing.
            if (e.nativeEvent.lines.length > lines) setStep((s) => (s === step ? Math.min(s + 1, last) : s));
          }}>
          {text}
        </Txt>
      ) : null}
    </View>
  );
}

/** A widget button's size: an iOS glass circle the thumb finds (44 pt with its hit slop). */
const BUTTON = 36;
const PHOTO_SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)'] as const;
/** The line under a widget's title: white, a step quieter. */
const SUB = 'rgba(255,255,255,0.85)';

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden' },
  // Flat colour, no elevation: Android would lift the card over the "−" badge and its neighbours.
  pinned: { transform: [{ rotate: '-1.6deg' }] },
  tape: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 54,
    height: 12,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)',
    zIndex: 1,
  },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, padding: 14, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  faces: { flexDirection: 'row', alignItems: 'center' },
  overlap: { marginLeft: -8 },
  badge: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  badgeInk: { backgroundColor: colors.text },
  badgeText: { fontSize: 12, fontWeight: '700' },
  // A word that does not fit beside its number goes under it; the number is never cut ("… new pages"
  // in the gallery's narrow card, Russian, A51 2026-11-05).
  figureLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6 },
  // The number is the widget's headline (a clock's time, a balance): large, tight, heavy.
  figure: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  unit: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  title: { fontFamily: fonts.playful, fontSize: 17, lineHeight: 22 },
  // Under a number: what it is for (a plan's name), up to two lines.
  subtitle: { fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2 },
  days: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 2, paddingRight: 4 },
  dayLetter: { width: 16, textAlign: 'center', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  dayDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)' },
  afterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  afterDotBox: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  afterDot: { width: 5, height: 5, borderRadius: 2.5, opacity: 0.5 },
  flexText: { flexShrink: 1 },
  // The note itself, in its own words: the widget is the note.
  quote: { fontSize: 15, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2, marginBottom: 4 },
  // FitText's line counter: laid out like the words, never seen.
  twin: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  // Toward the next level: an ink bar in a soft track, as a battery widget fills (owner: the milk
  // stays, no colour added inside).
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.text },
  person: { flex: 1, alignItems: 'center', paddingTop: 0 },
  personName: { marginTop: 6, fontFamily: fonts.playful, fontSize: 16, lineHeight: 20 },
  personLine: { fontSize: 12, lineHeight: 15, fontWeight: '500' },
  // A soft white circle on the tint (the prototype's buttons), a faint one on a deep tint.
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.75)',
  },
  buttonGo: { backgroundColor: systemColors.green },
  // Clear glass on a picture (the clear-glass rule), never a white disc.
  buttonOnPhoto: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.5)' },
  buttonsTop: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  buttonsFoot: { position: 'absolute', left: 0, right: 0, bottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 14 },
  abovePill: { marginBottom: 44 },
  pillWrap: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  // The one main thing, as a dark pill (the Payme and iOS wallet buttons).
  pill: { height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  pillText: { fontSize: 15, fontWeight: '700', color: colors.textOnInk },
  callDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: systemColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedDot: { backgroundColor: systemColors.red },
});
