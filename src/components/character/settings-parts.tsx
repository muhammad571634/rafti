import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FACE_AT, portraitOf, stretchLeft } from '@/components/chat/chat-ground';
import { InkText } from '@/components/ink';
import { CharacterAvatar, PressableScale, Toggle, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { colors, friendColor, hitSlop, systemColors, type Accent } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const HERO_RIM = 'rgba(255,255,255,0.10)';
const ROW_PRESSED = 'rgba(255,255,255,0.045)';
const ROW_LINE = 'rgba(255,255,255,0.08)';
const SEG_TRACK_BG = '#0E0E14';
const SEG_TRACK_RIM = 'rgba(255,255,255,0.06)';
const INFO_BG = 'rgba(255,255,255,0.07)';
const INFO_RIM = 'rgba(255,255,255,0.10)';
const PEACH_BADGE_BG = 'rgba(235,173,132,0.22)';
const PEACH_BADGE_RIM = 'rgba(235,173,132,0.44)';
const RADIO_RING = 'rgba(255,255,255,0.24)';
const HERO_VERT_SCRIM = ['rgba(9,9,13,0.18)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.45)', 'rgba(9,9,13,0.92)'] as const;
const HERO_VERT_STOPS = [0, 0.3, 0.6, 1] as const;
const HERO_SIDE_SCRIM = ['rgba(9,9,13,0.68)', 'rgba(9,9,13,0.28)', 'rgba(9,9,13,0)'] as const;
const HERO_SIDE_STOPS = [0, 0.46, 0.76] as const;

/**
 * Cinema hero photo card for Chat Settings: trailing portrait framing (`sceneFocus`), multi-stop
 * vertical + leading scrims, top-left dark-glass live mood badge with friend-accent dot, and
 * bottom-left editorial serif identity. Falls back cleanly to friend hue + avatar when no photo exists.
 */
export function SettingsHeroCard({
  character,
  name,
  moodLine,
  sinceLine,
  accent,
}: {
  character: Character;
  name: string;
  moodLine: string;
  sinceLine?: string | null;
  accent: Accent;
}) {
  const { width: screen } = useWindowDimensions();
  const width = Math.max(240, screen - inkGutter * 2);
  const height = Math.round(Math.min(Math.max(width * 0.6, 188), 220));
  const picture = portraitOf(character, width / height, FACE_AT);
  const stretch = picture?.stretch ?? 1;
  const hue = friendColor(character.id);

  return (
    <View style={[styles.hero, { height, backgroundColor: picture ? ink.card : hue.fill }]}>
      {picture ? (
        <>
          <Image
            source={picture.source}
            contentPosition={picture.position}
            contentFit="cover"
            transition={150}
            style={
              stretch > 1
                ? [styles.stretched, { width: width * stretch, left: stretchLeft(width, stretch, FACE_AT, picture.faceX) }]
                : StyleSheet.absoluteFill
            }
            accessible={false}
          />
          <LinearGradient colors={HERO_VERT_SCRIM} locations={HERO_VERT_STOPS} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <LinearGradient
            colors={HERO_SIDE_SCRIM}
            locations={HERO_SIDE_STOPS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      ) : (
        <View style={styles.heroAvatarWrap}>
          <CharacterAvatar character={character} size={96} />
        </View>
      )}

      <View style={styles.moodPill}>
        <View style={[styles.moodDot, { backgroundColor: accent.strong }]} />
        <Txt style={styles.moodText} lines={1} maxFontSizeMultiplier={1.2}>
          {moodLine}
        </Txt>
      </View>

      <View style={[styles.heroFoot, picture && styles.heroFootLeading]}>
        <Txt
          style={[styles.heroName, picture && styles.heroShadow, { color: picture ? ink.text : hue.ink }]}
          lines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header">
          {name}
        </Txt>
        {sinceLine ? (
          <Txt
            style={[styles.heroSince, picture && styles.heroShadow, { color: picture ? 'rgba(255,255,255,0.74)' : hue.ink }]}
            lines={1}
            maxFontSizeMultiplier={1.25}>
            {sinceLine}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/** Apple Contacts-style dark-glass quick action tile with semantic colored glyph and optional peach badge. */
export function SettingsQuickTile({
  icon,
  iconColor,
  label,
  badge,
  onPress,
}: {
  icon: IoniconName;
  iconColor: string;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <PressableScale
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      onPress={onPress}
      style={styles.quickTile}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Txt
        style={styles.quickLabel}
        center
        lines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        maxFontSizeMultiplier={1.2}>
        {label}
      </Txt>
      {badge && badge > 0 ? (
        <View style={styles.quickBadge}>
          <Txt style={[styles.quickBadgeText, styles.tabular]} lines={1} maxFontSizeMultiplier={1.1}>
            {badge > 99 ? '99+' : badge}
          </Txt>
        </View>
      ) : null}
    </PressableScale>
  );
}

/** Hairline-rimmed Ink Night+ inset card container. */
export function SettingsCard({ children, gap = true }: { children: ReactNode; gap?: boolean }) {
  return <View style={[styles.card, gap && styles.cardGap]}>{children}</View>;
}

/** Closeness / Relationship card with faint diagonal friend-accent wash, 6 pt track, and inset picker row. */
export function SettingsClosenessCard({
  accent,
  stageTitle,
  levelLine,
  progress,
  relationshipLabel,
  relationshipValue,
  infoLabel,
  onInfo,
  onPickRelationship,
}: {
  accent: Accent;
  stageTitle: string;
  levelLine: string;
  progress: number;
  relationshipLabel: string;
  relationshipValue: string;
  infoLabel: string;
  onInfo: () => void;
  onPickRelationship: () => void;
}) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <View style={[styles.card, styles.cardGap]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${accent.strong}1C`, 'rgba(22,22,30,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.72, y: 0.85 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.closenessBody}>
        <View style={styles.closenessHead}>
          <View style={[styles.heartRing, { backgroundColor: `${accent.strong}24`, borderColor: `${accent.strong}55` }]}>
            <Ionicons name="heart" size={18} color={accent.strong} />
          </View>
          <View style={styles.flex}>
            <InkText variant="cardSmall" style={styles.stageTitle} lines={2}>
              {stageTitle}
            </InkText>
            <Txt style={[styles.levelLine, styles.tabular]} lines={1} maxFontSizeMultiplier={1.25}>
              {levelLine}
            </Txt>
          </View>
          <PressableScale
            scaleTo={0.9}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={infoLabel}
            onPress={onInfo}
            style={styles.infoBtn}>
            <Ionicons name="information" size={17} color={ink.text2} />
          </PressableScale>
        </View>

        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: accent.strong }]} />
        </View>
      </View>

      <Pressable
        onPress={onPickRelationship}
        accessibilityRole="button"
        accessibilityLabel={`${relationshipLabel}, ${relationshipValue}`}
        style={({ pressed }) => [styles.relRow, pressed && styles.rowPressed]}>
        <Txt style={styles.rowTitle} maxFontSizeMultiplier={1.3}>
          {relationshipLabel}
        </Txt>
        <View style={styles.relTrailing}>
          <View style={[styles.relPill, { backgroundColor: `${accent.strong}20` }]}>
            <Txt style={[styles.relPillText, { color: accent.strong }]} lines={1} maxFontSizeMultiplier={1.2}>
              {relationshipValue}
            </Txt>
          </View>
          <Ionicons name="chevron-forward" size={15} color={ink.text3} />
        </View>
      </Pressable>
    </View>
  );
}

/** Semantic iOS colored-tile switch row (purple Voice, green Reach out, orange Animations). */
export function SettingsSwitchRow({
  icon,
  fill,
  label,
  value,
  disabled,
  last,
  onChange,
}: {
  icon: IoniconName;
  fill: string;
  label: string;
  value: boolean;
  disabled?: boolean;
  last?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder, disabled && styles.disabled]}>
      <View style={[styles.iconTile, { backgroundColor: fill }]}>
        <Ionicons name={icon} size={17} color={colors.white} />
      </View>
      <Txt style={styles.rowTitle} maxFontSizeMultiplier={1.3}>
        {label}
      </Txt>
      <Toggle value={value} disabled={disabled} onChange={onChange} onColor={systemColors.green} accessibilityLabel={label} />
    </View>
  );
}

/** Ink Night+ reply preference block with crisp white active segment thumb. */
export function SettingsChoiceBlock<T extends string>({
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
  onChange: (next: T) => void;
}) {
  return (
    <View style={[styles.choiceBlock, !last && styles.rowBorder]}>
      <Txt style={styles.choiceLabel} maxFontSizeMultiplier={1.25}>
        {label}
      </Txt>
      <View style={styles.segTrack} accessibilityRole="tablist" accessibilityLabel={label}>
        {options.map((opt) => {
          const on = opt.value === value;
          return (
            <PressableScale
              key={opt.value}
              scaleTo={0.97}
              dimOnPress={false}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              aria-selected={on}
              onPress={() => {
                if (on) return;
                haptic.selection();
                onChange(opt.value);
              }}
              style={[styles.segBtn, on && styles.segBtnOn]}>
              <Txt
                style={[styles.segText, on && styles.segTextOn]}
                lines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
                maxFontSizeMultiplier={1.25}>
                {opt.label}
              </Txt>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** Semantic iOS colored-tile navigation row with Russian-safe wrapping title and right-aligned value. */
export function SettingsLinkRow({
  icon,
  fill,
  label,
  meta,
  last,
  onPress,
}: {
  icon: IoniconName;
  fill: string;
  label: string;
  meta?: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.rowPressed]}>
      <View style={[styles.iconTile, { backgroundColor: fill }]}>
        <Ionicons name={icon} size={17} color={colors.white} />
      </View>
      <Txt style={styles.rowTitle} maxFontSizeMultiplier={1.3}>
        {label}
      </Txt>
      <View style={styles.linkTrailing}>
        {meta ? (
          <Txt style={[styles.linkMeta, styles.tabular]} lines={1} maxFontSizeMultiplier={1.25}>
            {meta}
          </Txt>
        ) : null}
        <Ionicons name="chevron-forward" size={15} color={ink.text3} />
      </View>
    </Pressable>
  );
}

/** Clean destructive row with subtle red outline icon and label. */
export function SettingsDangerRow({
  icon,
  label,
  last,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.dangerRow, !last && styles.rowBorder, pressed && styles.rowPressed]}>
      <Ionicons name={icon} size={18} color={ink.danger} style={styles.dangerIcon} />
      <Txt style={styles.dangerLabel} maxFontSizeMultiplier={1.3}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Ink Night+ inset sheet option row for Relationship and Persona pickers. */
export function SettingsSheetOption({
  title,
  meta,
  selected,
  locked,
  link,
  checkColor = colors.bond,
  checkInk = ink.ground,
  last,
  onPress,
}: {
  title: string;
  meta?: string;
  selected?: boolean;
  locked?: boolean;
  link?: boolean;
  checkColor?: string;
  checkInk?: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!locked }}
      accessibilityLabel={meta ? `${title}, ${meta}` : title}
      style={({ pressed }) => [
        styles.sheetRow,
        !last && styles.rowBorder,
        locked && styles.locked,
        pressed && !locked && styles.rowPressed,
      ]}>
      <View style={styles.flex}>
        <Txt style={[styles.sheetTitle, link && styles.sheetLinkTitle]} maxFontSizeMultiplier={1.3}>
          {title}
        </Txt>
        {meta ? (
          <Txt style={styles.sheetMeta} maxFontSizeMultiplier={1.25}>
            {meta}
          </Txt>
        ) : null}
      </View>
      {link ? (
        <Ionicons name="chevron-forward" size={15} color={ink.text3} />
      ) : locked ? (
        <Ionicons name="lock-closed" size={15} color={ink.text3} />
      ) : selected ? (
        <View style={[styles.checkCircle, { backgroundColor: checkColor }]}>
          <Ionicons name="checkmark" size={13} color={checkInk} />
        </View>
      ) : (
        <View style={styles.radioOff} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  disabled: { opacity: 0.48 },
  locked: { opacity: 0.45 },

  hero: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HERO_RIM,
  },
  stretched: { position: 'absolute', top: 0, bottom: 0 },
  heroAvatarWrap: { position: 'absolute', top: 24, right: 20 },
  moodPill: {
    position: 'absolute',
    top: 12,
    left: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
  moodDot: { width: 6, height: 6, borderRadius: 3 },
  moodText: { ...inkFace('caption'), fontSize: 12, lineHeight: 15, fontWeight: '600', color: ink.text },
  heroFoot: { position: 'absolute', left: 16, right: 16, bottom: 15 },
  heroFootLeading: { right: '38%' },
  heroName: { ...inkFace('title'), fontSize: 28, lineHeight: 32 },
  heroSince: { ...inkFace('footnote'), fontSize: 13, lineHeight: 17, marginTop: 3 },
  heroShadow: { textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },

  quickTile: {
    flex: 1,
    minHeight: 68,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  quickLabel: { ...inkFace('caption'), fontSize: 11.5, lineHeight: 14, color: ink.text2, maxWidth: '100%' },
  quickBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: PEACH_BADGE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PEACH_BADGE_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadgeText: { fontSize: 10.5, lineHeight: 12, fontWeight: '700', color: ink.accent },

  card: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  cardGap: { marginTop: 14 },

  closenessBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  closenessHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heartRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitle: { lineHeight: 24 },
  levelLine: { ...inkFace('footnote'), fontSize: 13, lineHeight: 17, color: ink.text2, marginTop: 2 },
  infoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: INFO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: INFO_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: ink.hairlineFill,
    marginTop: 13,
    overflow: 'hidden',
  },
  trackFill: { height: 6, borderRadius: 3 },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ROW_LINE,
  },
  relTrailing: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '50%' },
  relPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 1 },
  relPillText: { ...inkFace('footnoteStrong'), fontSize: 13, lineHeight: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ROW_LINE },
  rowPressed: { backgroundColor: ROW_PRESSED },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...inkFace('body'), fontSize: 16, lineHeight: 21, fontWeight: '500', color: ink.text, flex: 1, minWidth: '45%' },
  linkTrailing: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '44%' },
  linkMeta: { ...inkFace('sub'), fontSize: 14.5, lineHeight: 19, color: ink.text2, flexShrink: 1 },

  choiceBlock: { paddingHorizontal: 15, paddingVertical: 14 },
  choiceLabel: { ...inkFace('footnoteStrong'), fontSize: 13, lineHeight: 17, color: ink.text2, marginBottom: 9 },
  segTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: SEG_TRACK_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SEG_TRACK_RIM,
  },
  segBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 11,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segBtnOn: {
    backgroundColor: ink.pill,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      default: { elevation: 2 },
    }),
  },
  segText: { ...inkFace('sub'), fontSize: 14, lineHeight: 18, fontWeight: '600', color: ink.text2 },
  segTextOn: { color: ink.onPill, fontWeight: '700' },

  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dangerIcon: { opacity: 0.92 },
  dangerLabel: { ...inkFace('body'), fontSize: 16, lineHeight: 21, fontWeight: '500', color: ink.danger, flex: 1 },

  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  sheetTitle: { ...inkFace('body'), fontSize: 15.5, lineHeight: 20, fontWeight: '600', color: ink.text },
  sheetLinkTitle: { color: ink.accent },
  sheetMeta: { ...inkFace('caption'), fontSize: 12.5, lineHeight: 16, fontWeight: '400', color: ink.text2, marginTop: 2 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOff: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: RADIO_RING,
  },
});
