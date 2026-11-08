import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, type ReactNode, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { portraitOf } from '@/components/chat/chat-ground';
import { GroupAvatar } from '@/components/group-avatar';
import { CharacterAvatar, PressableScale, Toggle, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { colors, fonts, friendColor, hitSlop, playful, space } from '@/theme';
import type { Character } from '@/types';

/**
 * A friend's profile and chat settings in the four tabs' look (design-style §10, 0z152): the cream
 * ground, round head buttons, their picture as Find's photo card (radius 30, bottom scrim, white
 * Nunito name, clear glass), white radius-24 cards with heavy titles, big round quick actions and
 * one peach button. Switches stay the app's `Toggle`, choices a soft segmented control.
 */

const SIDE = space.lg;
const ROUND = 44;
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)'] as const;

/** The top row: a round back button, the name once the face card has scrolled away, and a right button. */
export function ProfileTop({ title, showTitle, onBack, right }: { title: string; showTitle: boolean; onBack: () => void; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.top}>
      <PressableScale onPress={onBack} scaleTo={0.88} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={t('a11y.back')} style={styles.round}>
        <Ionicons name="chevron-back" size={24} color={playful.ink} style={styles.backGlyph} />
      </PressableScale>
      <Txt
        style={[styles.topTitle, !showTitle && styles.hidden]}
        lines={1}
        maxFontSizeMultiplier={1.2}
        accessibilityElementsHidden={!showTitle}
        importantForAccessibility={showTitle ? 'auto' : 'no-hide-descendants'}>
        {title}
      </Txt>
      {right ?? <View style={styles.roundSpace} />}
    </View>
  );
}

/** A tool screen's top (Memories, Background): a round back button, a heavy title and a right button. */
export function TitleTop({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.top}>
      <PressableScale onPress={onBack} scaleTo={0.88} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={t('a11y.back')} style={styles.round}>
        <Ionicons name="chevron-back" size={24} color={playful.ink} style={styles.backGlyph} />
      </PressableScale>
      {/* A long title shrinks to fit rather than being cut. */}
      <Txt style={styles.bigTitle} lines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

/** Two or three choices on a soft track, the chosen one a white pill (Find's who-switch). */
export function SoftSegmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.segments} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (on) return;
              haptic.selection();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && styles.segmentOn]}>
            <Txt style={[styles.segmentText, on && styles.segmentTextOn]} lines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A round head button with an icon, or a short word ("Edit") in a pill of the same height.
 * `peach` makes it the screen's one action (New group's Create); `disabled` greys it until it can run.
 */
export function TopButton({
  icon,
  label,
  accessibilityLabel,
  peach,
  disabled,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  accessibilityLabel: string;
  peach?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const on = peach && !disabled;
  const ink = disabled ? colors.textFaint : on ? colors.textOnPrimary : playful.ink;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.round, label ? styles.pill : null, on && styles.pillPeach]}>
      {icon ? <Ionicons name={icon} size={22} color={ink} /> : null}
      {label ? (
        <Txt style={[styles.pillText, { color: ink }]} maxFontSizeMultiplier={1.2}>
          {label}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

/**
 * A group's face as a card of its own: the groups' one soft mint (as in the Chats list), the members'
 * stacked faces in the middle, the name and a line under it in the mint's ink.
 */
export function GroupFace({ members, name, line }: { members: Character[]; name: string; line?: string }) {
  const { width: screen } = useWindowDimensions();
  const height = Math.round(Math.min((screen - SIDE * 2) * 0.74, 300));
  return (
    <View style={[styles.face, { height, backgroundColor: playful.group.fill }]}>
      <View style={styles.faceAvatar}>
        <GroupAvatar members={members} size={120} ringColor={playful.group.fill} />
      </View>
      <View style={styles.faceFoot}>
        <Txt
          style={[styles.faceName, { color: playful.group.ink }]}
          lines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header">
          {name}
        </Txt>
        {line ? (
          <Txt style={[styles.faceLine, { color: playful.group.ink }]} lines={1} maxFontSizeMultiplier={1.3}>
            {line}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const OnPicture = createContext(true);

/**
 * Their face as Find's photo card: the portrait (or scene, or the creator's photo) full-bleed, a scrim
 * at the bottom with the name and a line or two under it in white. Without a picture: their friend
 * hue with the face in the middle and the words in the hue's ink.
 */
export function FaceCard({
  character,
  name,
  nameBadge,
  lines,
  topLeft,
  tall,
}: {
  character: Character;
  name: string;
  /** Beside the name (the "AI" mark). */
  nameBadge?: ReactNode;
  lines: (string | null | undefined | false)[];
  /** Over the picture's top left corner (the "Voice ready" glass). */
  topLeft?: ReactNode;
  /** The profile's tall card; settings take a lower one. */
  tall?: boolean;
}) {
  const { width: screen } = useWindowDimensions();
  const width = screen - SIDE * 2;
  const height = Math.round(Math.min(width * (tall ? 1.12 : 0.74), tall ? 470 : 300));
  const picture = portraitOf(character, width / height);
  const hue = friendColor(character.id);
  const ink = picture ? colors.onMedia : hue.ink;
  const shown = lines.filter((line): line is string => !!line);

  return (
    <OnPicture.Provider value={!!picture}>
      <View style={[styles.face, { height, backgroundColor: picture ? colors.surfaceAlt : hue.fill }]}>
        {picture ? (
          <>
            <Image source={picture.source} contentPosition={picture.position} contentFit="cover" transition={150} style={StyleSheet.absoluteFill} accessible={false} />
            <LinearGradient colors={SCRIM} style={styles.scrim} pointerEvents="none" />
          </>
        ) : (
          <View style={styles.faceAvatar}>
            <CharacterAvatar character={character} size={tall ? 128 : 96} />
          </View>
        )}
        {topLeft ? <View style={styles.topLeft}>{topLeft}</View> : null}
        <View style={styles.faceFoot}>
          <View style={styles.nameRow}>
            <Txt
              style={[styles.faceName, picture && styles.shadow, { color: ink }]}
              lines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={1.2}
              accessibilityRole="header">
              {name}
            </Txt>
            {nameBadge}
          </View>
          {shown.map((line, i) => (
            <Txt key={i} style={[styles.faceLine, picture && styles.shadow, { color: picture ? colors.onMediaSoft : hue.ink }]} lines={1} maxFontSizeMultiplier={1.3}>
              {line}
            </Txt>
          ))}
        </View>
      </View>
    </OnPicture.Provider>
  );
}

/** A clear glass pill on the face card (the "AI" mark, "Voice ready"): the picture shows through. */
export function GlassPill({ icon, label, accessibilityLabel }: { icon?: ReactNode; label: string; accessibilityLabel?: string }) {
  const onPicture = useContext(OnPicture);
  return (
    <View style={[styles.glass, !onPicture && styles.glassOnHue]} accessibilityLabel={accessibilityLabel}>
      {onPicture && Platform.OS === 'ios' ? <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      {icon}
      <Txt style={[styles.glassText, !onPicture && styles.glassTextOnHue]} maxFontSizeMultiplier={1.2}>
        {label}
      </Txt>
    </View>
  );
}

/** A big round white action with an ink glyph and its name under it; a small count in its corner. */
export function QuickAction({
  icon,
  label,
  badge,
  disabled,
  accessibilityLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.92}
      dimOnPress={false}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? (badge ? `${label}, ${badge}` : label)}
      style={[styles.quick, disabled && styles.off]}>
      <View style={styles.quickRound}>
        <Ionicons name={icon} size={25} color={playful.ink} />
        {badge ? (
          <View style={styles.badge}>
            <Txt style={styles.badgeText} maxFontSizeMultiplier={1.2}>
              {badge > 99 ? '99+' : badge}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt style={styles.quickLabel} lines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** A row of quick actions, spread evenly (or a pair kept together in the middle). */
export function QuickRow({ center, children }: { center?: boolean; children: ReactNode }) {
  return <View style={[styles.quickRow, center && styles.quickCenter]}>{children}</View>;
}

/** The screen's one peach button. */
export function PeachButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={label} style={styles.peach}>
      <Ionicons name={icon} size={20} color={colors.textOnPrimary} />
      <Txt style={styles.peachText} lines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** A white radius-24 card; rows run edge to edge with hairlines, a heavy title on top when given. */
export function Group({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.group}>
      {title || right ? (
        <View style={styles.groupHead}>
          {title ? (
            <Txt style={[styles.groupTitle, styles.grow]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {title}
            </Txt>
          ) : (
            <View style={styles.grow} />
          )}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** A row that opens something: label, its value and a chevron. */
export function LinkRow({ label, meta, last, onPress }: { label: string; meta?: string; last?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.rowPressed]}>
      <Txt style={[styles.rowText, styles.grow]}>{label}</Txt>
      {meta ? (
        <Txt style={[styles.rowText, styles.meta]} lines={1}>
          {meta}
        </Txt>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

/**
 * A row led by a face (a group's members, a friend to pick): the face, a name with an optional line
 * under it, and an end (chevron, pick circle). `tint` colours the name (the peach "Add a friend").
 */
export function FaceRow({
  face,
  title,
  meta,
  tint,
  end,
  last,
  disabled,
  dim,
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  face: ReactNode;
  title: string;
  meta?: string;
  tint?: string;
  end?: ReactNode;
  last?: boolean;
  disabled?: boolean;
  /** Greyed (a friend who cannot be picked now). */
  dim?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'checkbox';
  accessibilityState?: { checked?: boolean; disabled?: boolean };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState ?? { disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.faceRow, !last && styles.rowLine, pressed && styles.rowPressed, dim && styles.off]}>
      {face}
      <View style={styles.grow}>
        <Txt style={styles.rowText} color={tint} lines={1}>
          {title}
        </Txt>
        {meta ? (
          <Txt style={styles.faceRowMeta} lines={1}>
            {meta}
          </Txt>
        ) : null}
      </View>
      {end === undefined ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : end}
    </Pressable>
  );
}

/** A soft round glyph in a face's place (the peach + of "Add a friend"). */
export function FaceGlyph({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.faceGlyph}>
      <Ionicons name={icon} size={22} color={colors.brandText} />
    </View>
  );
}

/** The pick circle at a row's end: an empty ring, or a peach disc with a tick. */
export function PickMark({ on }: { on: boolean }) {
  return on ? (
    <View style={[styles.pick, styles.pickOn]}>
      <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
    </View>
  ) : (
    <View style={styles.pick} />
  );
}

/** A row with the app's switch. */
export function SwitchRow({ label, value, disabled, last, onChange }: { label: string; value: boolean; disabled?: boolean; last?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[styles.row, !last && styles.rowLine, disabled && styles.off]}>
      <Txt style={[styles.rowText, styles.grow]}>{label}</Txt>
      <Toggle value={value} disabled={disabled} onChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/** A red row in the last card (clear, reset, block). */
export function DangerRow({ label, last, onPress }: { label: string; last?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.rowPressed]}>
      <Txt style={styles.rowText} color={colors.danger}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A setting with two or three choices: its name over a soft segmented control (Find's who-switch). */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  last,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  last?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.choice, !last && styles.rowLine]}>
      <Txt style={styles.rowText}>{label}</Txt>
      <SoftSegmented options={options} value={value} onChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/** The level card's top: a soft heart, the title and a line under it, and an optional end. */
export function BondHead({ title, line, heart, end }: { title: string; line: string; heart?: ReactNode; end?: ReactNode }) {
  return (
    <View style={styles.bondHead}>
      <View style={styles.heart}>{heart ?? <Ionicons name="heart" size={18} color={colors.brandText} />}</View>
      <View style={styles.grow}>
        <Txt style={styles.bondTitle} lines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3}>
          {title}
        </Txt>
        <Txt style={styles.bondLine}>{line}</Txt>
      </View>
      {end}
    </View>
  );
}

/** The peach progress track to the next level. */
export function BondTrack({ progress }: { progress: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
    </View>
  );
}

/** A small round soft button inside a card (the level's ⓘ). */
export function CardRound({ icon, accessibilityLabel, onPress }: { icon: keyof typeof Ionicons.glyphMap; accessibilityLabel: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [styles.cardRound, pressed && styles.rowPressed]}>
      <Ionicons name={icon} size={19} color={playful.ink} />
    </Pressable>
  );
}

export const profileStyles = StyleSheet.create({
  /** Room between the screen's parts. */
  gap: { height: 14 },
  /** A caption under a card or the face, centred. */
  caption: { marginTop: space.sm, marginHorizontal: SIDE + space.sm, textAlign: 'center', fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  /** A footer under a card, iOS style. */
  footer: { marginTop: space.sm, marginHorizontal: SIDE + space.lg, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: SIDE, paddingTop: space.xs, paddingBottom: space.sm },
  round: { minWidth: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.round },
  roundSpace: { width: ROUND },
  pill: { paddingHorizontal: 16 },
  pillText: { fontFamily: fonts.playfulBold, fontSize: 15, color: playful.ink },
  pillPeach: { backgroundColor: colors.primaryFill },
  backGlyph: { marginLeft: -2 },
  bigTitle: { flex: 1, minWidth: 0, fontFamily: fonts.playful, fontSize: 28, lineHeight: 36, letterSpacing: -0.3, color: playful.ink },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.playful, fontSize: 18, lineHeight: 24, color: playful.ink },
  hidden: { opacity: 0 },
  face: { marginHorizontal: SIDE, borderRadius: 30, overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%' },
  faceAvatar: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 70 },
  topLeft: { position: 'absolute', top: 14, left: 14 },
  faceFoot: { position: 'absolute', left: 20, right: 20, bottom: 18, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  faceName: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 32, lineHeight: 38 },
  faceLine: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  shadow: { textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  // Clear glass on a photo (HIG: the clear variant is for components over rich media).
  glass: {
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  glassOnHue: { backgroundColor: 'rgba(255,255,255,0.55)', borderColor: 'transparent' },
  glassText: { fontFamily: fonts.playfulBold, fontSize: 13, color: colors.onMedia },
  glassTextOnHue: { color: '#1F1A17' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: SIDE + space.sm },
  quickCenter: { justifyContent: 'center', gap: 36 },
  quick: { width: 76, alignItems: 'center', gap: 7 },
  quickRound: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.card },
  quickLabel: { fontFamily: fonts.playfulBold, fontSize: 13, color: playful.ink },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.primaryFill,
    borderWidth: 2,
    borderColor: playful.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.textOnPrimary },
  off: { opacity: 0.42 },
  peach: { height: 56, marginHorizontal: SIDE, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.primaryFill },
  // System bold: the button's words come in every script.
  peachText: { fontSize: 18, fontWeight: '700', color: colors.textOnPrimary },
  group: { marginTop: 14, marginHorizontal: SIDE, borderRadius: 24, backgroundColor: playful.card, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
  groupTitle: { fontFamily: fonts.playful, fontSize: 20, lineHeight: 26, color: playful.ink },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 18 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  rowPressed: { backgroundColor: playful.chip },
  // No colour here: Txt's `color` prop (red rows) must win, and ink is its default.
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  meta: { flexShrink: 1, maxWidth: '50%', color: colors.textSecondary },
  faceRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 18, paddingVertical: 10 },
  faceRowMeta: { marginTop: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  faceGlyph: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySofter },
  pick: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.borderStrong },
  pickOn: { borderWidth: 0, backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center' },
  choice: { gap: 10, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  segments: { flexDirection: 'row', padding: 3, borderRadius: 20, backgroundColor: playful.chip },
  segment: { flex: 1, minHeight: 36, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentOn: {
    backgroundColor: playful.card,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, default: { elevation: 1 } }),
  },
  segmentText: { fontFamily: fonts.playfulBold, fontSize: 14, color: colors.textSecondary },
  segmentTextOn: { color: playful.ink },
  bondHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: 18, paddingRight: 14, paddingTop: 16 },
  heart: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySofter },
  bondTitle: { fontFamily: fonts.playful, fontSize: 20, lineHeight: 26, color: playful.ink },
  bondLine: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textSecondary },
  track: { height: 8, marginHorizontal: 18, marginTop: 14, marginBottom: 16, borderRadius: 4, backgroundColor: playful.chip, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primaryFill },
  cardRound: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.chip },
});
