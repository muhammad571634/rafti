import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SmallRound } from '@/components/create/kit';
import { InkText, PhotoGlassPill } from '@/components/ink';
import { ListRow, PressableScale, Sheet, Toggle, Txt } from '@/components/ui';
import { initialsOf } from '@/lib/create-form';
import { avatarGradients, colors, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

const SCRIM = ['rgba(9,9,13,0.20)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.45)', 'rgba(9,9,13,0.92)'] as const;
const SCRIM_STOPS = [0, 0.32, 0.62, 1] as const;
const FIELD_BG = '#0E0E14';
export const FIELD_RIM = 'rgba(255,255,255,0.10)';
const SHARE_TILE_BG = 'rgba(48,209,88,0.16)';
const HERO_H = 224;

/** Their avatar's colours without a picture, so the page, the meet moment and the chat look alike. */
export const gradientOf = (accent: number) => avatarGradients[accent % avatarGradients.length];

/** Cinema hero photo card matching Find: tap the photo or the top-right glass pill to set their picture. */
export function HeroCard({
  imageUri,
  fallback,
  name,
  tagline,
  accent,
  namePlaceholder,
  photoLabel,
  onPhoto,
  onLayout,
}: {
  imageUri?: string;
  /** The picture they wear without one of the user's (a story friend's painting). */
  fallback?: number;
  name: string;
  tagline: string;
  accent: number;
  namePlaceholder: string;
  photoLabel: string;
  onPhoto: () => void;
  onLayout?: (e: { nativeEvent: { layout: { y: number } } }) => void;
}) {
  return (
    <View onLayout={onLayout} style={styles.heroWrap}>
      <PressableScale onPress={onPhoto} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={photoLabel} style={styles.hero}>
        {imageUri || fallback != null ? (
          <Image source={imageUri ? { uri: imageUri } : fallback} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={imageUri ? 'center' : 'top'} transition={200} />
        ) : (
          <LinearGradient colors={gradientOf(accent)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.heroCenter]}>
            <Txt style={styles.initial} maxFontSizeMultiplier={1}>
              {initialsOf(name)}
            </Txt>
          </LinearGradient>
        )}
        <LinearGradient colors={SCRIM} locations={SCRIM_STOPS} style={StyleSheet.absoluteFill} />
        <View style={styles.heroFoot}>
          <InkText variant="card" color={colors.onMedia} lines={1} style={styles.heroName}>
            {name.trim() || namePlaceholder}
          </InkText>
          {tagline.trim() ? (
            <InkText variant="quote" color="rgba(255,255,255,0.78)" lines={2} style={styles.heroLine}>
              {tagline}
            </InkText>
          ) : null}
        </View>
      </PressableScale>
      <PhotoGlassPill ios="camera.fill" icon="camera" iconSize={14} label={photoLabel} onPress={onPhoto} style={styles.photoPill} />
    </View>
  );
}

/** Up to `max` short lines (more openings, first lines): each can be removed; a row adds the next. */
export function Lines({
  label,
  lines,
  onChange,
  max,
  size,
  placeholder,
  addLabel,
  action,
}: {
  label: string;
  lines: string[];
  onChange: (lines: string[]) => void;
  max: number;
  size: number;
  placeholder: string;
  addLabel: string;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.lines}>
      <View style={styles.fieldHead}>
        <Txt style={[styles.subLabel, styles.flex]}>{label}</Txt>
        {action}
      </View>
      {lines.map((line, index) => (
        <View key={index} style={styles.lineRow}>
          <TextInput
            value={line}
            onChangeText={(text) => onChange(lines.map((l, i) => (i === index ? text : l)))}
            placeholder={placeholder}
            placeholderTextColor={ink.placeholder}
            selectionColor={ink.accent}
            style={[styles.lineInput, styles.flex]}
            maxLength={size}
            multiline
            accessibilityLabel={placeholder}
          />
          <SmallRound icon="close" label={t('createCharacter.remove')} onPress={() => onChange(lines.filter((_, i) => i !== index))} color={ink.text2} />
        </View>
      ))}
      {lines.length < max ? (
        <InlineAction icon="add-circle" size={18} label={addLabel} onPress={() => onChange([...lines, ''])} />
      ) : null}
    </View>
  );
}

/** A quiet accent link under a field (add a line, add from the chat). */
export function InlineAction({ icon, size = 16, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; size?: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.inlineAction}>
      <Ionicons name={icon} size={size} color={ink.accent} />
      <Txt style={styles.inlineActionText}>{label}</Txt>
    </Pressable>
  );
}

/** The private sample dialog (More details): its head with the lock and ✦, then the field. */
export function DialogField({
  label,
  lockLabel,
  value,
  onChange,
  placeholder,
  max,
  action,
}: {
  label: string;
  lockLabel: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  max: number;
  action: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.fieldHead}>
        <Txt style={[styles.subLabel, styles.flex]}>{label}</Txt>
        <Ionicons name="lock-closed" size={13} color={ink.text2} accessibilityLabel={lockLabel} />
        {action}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={ink.placeholder}
        selectionColor={ink.accent}
        style={styles.dialog}
        maxLength={max}
        multiline
        textAlignVertical="top"
        accessibilityLabel={label}
      />
    </>
  );
}

/** Share in Find (0z300): the switch, what it means, and a shared character's review status. */
export function ShareRow({ share, onShare, editing }: { share: boolean; onShare: (on: boolean) => void; editing?: Character }) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.shareRow}>
        <View style={styles.shareTile}>
          <Ionicons name="globe-outline" size={17} color={systemColors.green} />
        </View>
        <View style={styles.flex}>
          <Txt style={styles.shareTitle}>{t('community.shareTitle')}</Txt>
          <Txt style={[styles.shareSub, share && styles.shareSubOn]}>{share ? t('community.shareNote') : t('createCharacter.privateNote')}</Txt>
        </View>
        <Toggle value={share} onChange={onShare} onColor={systemColors.green} accessibilityLabel={t('community.shareToggle')} />
      </View>
      {editing?.visibility === 'public' && editing.review ? (
        <Txt style={[styles.shareSub, styles.shareStatus, editing.review === 'rejected' && styles.shareRefused]}>
          {editing.review === 'pending'
            ? t('community.status.pending')
            : editing.review === 'approved'
              ? t('community.status.live')
              : t(`community.status.rejected.${editing.communityReason ?? 'harm'}`)}
        </Txt>
      ) : null}
    </>
  );
}

/** Their picture: the gallery, the camera, or none. */
export function PhotoSheet({
  visible,
  hasPhoto,
  canRemove = hasPhoto,
  removeLabel,
  onClose,
  onPick,
  onRemove,
}: {
  visible: boolean;
  hasPhoto: boolean;
  /** The last row shows only when there is a picture of the user's to drop (defaults to `hasPhoto`). */
  canRemove?: boolean;
  /** "Original photo" for a story friend, whose painting comes back; "Remove photo" otherwise. */
  removeLabel?: string;
  onClose: () => void;
  onPick: (from: 'library' | 'camera') => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const label = (key: string) => t(`createCharacter.${key}`);
  return (
    <Sheet visible={visible} onClose={onClose} title={label(hasPhoto ? 'flow.changePhoto' : 'flow.addPhoto')}>
      <ListRow title={label('flow.choosePhoto')} left={<Ionicons name="images-outline" size={22} color={colors.text} />} onPress={() => onPick('library')} />
      <ListRow title={label('flow.takePhoto')} left={<Ionicons name="camera-outline" size={22} color={colors.text} />} onPress={() => onPick('camera')} />
      {canRemove ? (
        removeLabel ? (
          <ListRow title={removeLabel} left={<Ionicons name="arrow-undo-outline" size={22} color={colors.text} />} onPress={onRemove} />
        ) : (
          <ListRow title={label('flow.removePhoto')} left={<Ionicons name="trash-outline" size={22} color={systemColors.red} />} onPress={onRemove} />
        )
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  heroWrap: { marginHorizontal: inkGutter, marginTop: 4 },
  hero: {
    height: HERO_H,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
  },
  heroCenter: { alignItems: 'center', justifyContent: 'center' },
  initial: { ...inkFace('display'), marginTop: -44, color: colors.white },
  heroFoot: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  heroName: { fontSize: 25, lineHeight: 30 },
  heroLine: { marginTop: 2, fontSize: 13.5, lineHeight: 19 },
  photoPill: { position: 'absolute', top: 12, right: 12, minHeight: 34, paddingHorizontal: 12 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  shareTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: SHARE_TILE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTitle: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.text },
  shareSub: { ...inkFace('caption'), fontWeight: '400', color: ink.text2, marginTop: 1 },
  shareSubOn: { color: systemColors.green },
  shareStatus: { marginTop: 10 },
  shareRefused: { color: systemColors.red },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 30, marginTop: space.sm, marginBottom: 6 },
  subLabel: { ...inkFace('footnoteStrong'), color: ink.text2 },
  dialog: {
    ...inkFace('body'),
    fontSize: 15,
    lineHeight: 21,
    minHeight: 140,
    padding: 13,
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: FIELD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
    color: ink.text,
  },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, alignSelf: 'flex-start' },
  inlineActionText: { ...inkFace('footnoteStrong'), fontSize: 14, color: ink.accent },
  lines: { marginTop: space.sm },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  lineInput: {
    ...inkFace('body'),
    fontSize: 15,
    lineHeight: 21,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: FIELD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
    color: ink.text,
  },
});
