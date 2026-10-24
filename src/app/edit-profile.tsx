import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthdaySheet, InterestsSheet, OptionSheet, TextFieldSheet } from '@/components/profile/field-sheets';
import { GlassBar, IconRow, InsetGroup, PressableScale, Screen, Txt, UserAvatar, useScrolledPast } from '@/components/ui';
import {
  ABOUT_MAX,
  JOB_MAX,
  MAX_INTERESTS,
  NAME_MAX,
  birthdayLabel,
  profileCompletion,
} from '@/lib/profile';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import type { Pronouns } from '@/types';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PRONOUNS: Pronouns[] = ['she', 'he', 'they'];
const AVATAR = 104;
/** iOS system colours for the Settings-style row icons. */
const FILL = {
  name: systemColors.blue,
  pronouns: systemColors.purple,
  birthday: systemColors.red,
  born: systemColors.gray,
  job: systemColors.brown,
};

type Field = 'name' | 'pronouns' | 'birthday' | 'job' | 'interests' | 'about';

/**
 * What the characters know about the user, as an iOS Settings page on the grouped grey ground:
 * the photo, how full the profile is, then inset groups. Every row saves on its own sheet, so
 * there is no "Save changes" to forget.
 */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const { scrolled, onScroll } = useScrolledPast(AVATAR);

  const [open, setOpen] = useState<Field | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const close = () => setOpen(null);

  const interests = user.interests ?? [];
  const percent = profileCompletion(user);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const tooLarge = (asset.fileSize ?? 0) > MAX_PHOTO_BYTES;
    setPhotoError(tooLarge);
    if (!tooLarge) updateProfile({ avatarUri: asset.uri });
  };

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('editProfile.title')} scrolled={scrolled} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.hero}>
          <PressableScale
            onPress={() => void pickPhoto()}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={t('editProfile.photo')}>
            <UserAvatar user={user} size={AVATAR} />
            <View style={styles.camera} pointerEvents="none">
              <Ionicons name="camera" size={16} color={colors.white} />
            </View>
          </PressableScale>
          {photoError ? (
            <Txt style={styles.error}>{t('editProfile.photoTooLarge')}</Txt>
          ) : null}
        </View>

        <InsetGroup style={styles.meter}>
          <View style={styles.meterTop} accessible accessibilityLabel={`${t('editProfile.title')}, ${percent}%`}>
            <Txt style={styles.meterTitle}>{t('editProfile.title')}</Txt>
            <Txt style={styles.meterPercent}>{percent}%</Txt>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
        </InsetGroup>

        <Txt style={styles.sectionLabel}>{t('editProfile.basics')}</Txt>
        <InsetGroup>
          <IconRow icon="person" fill={FILL.name} title={t('editProfile.name')} meta={user.displayName} onPress={() => setOpen('name')} />
          <IconRow
            icon="chatbubble-ellipses"
            fill={FILL.pronouns}
            title={t('editProfile.pronouns')}
            meta={user.pronouns && t(`editProfile.pronounOptions.${user.pronouns}`)}
            onPress={() => setOpen('pronouns')}
          />
          <IconRow
            icon="gift"
            fill={FILL.birthday}
            title={t('editProfile.birthday')}
            meta={birthdayLabel(user.birthday)}
            onPress={() => setOpen('birthday')}
          />
          {/* The 18+ answer from onboarding; read-only. */}
          {user.birthYear ? (
            <IconRow icon="calendar" fill={FILL.born} title={t('editProfile.born')} meta={String(user.birthYear)} />
          ) : null}
          <IconRow icon="briefcase" fill={FILL.job} title={t('editProfile.job')} meta={user.job} onPress={() => setOpen('job')} last />
        </InsetGroup>

        <Txt style={styles.sectionLabel}>{t('editProfile.interests', { count: interests.length, max: MAX_INTERESTS })}</Txt>
        <InsetGroup>
          <View style={styles.pills}>
            {interests.map((interest) => (
              <Pressable
                key={interest}
                onPress={() => setOpen('interests')}
                accessibilityRole="button"
                accessibilityLabel={interest}
                style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
                <Txt style={styles.pillText}>{interest}</Txt>
              </Pressable>
            ))}
            {interests.length < MAX_INTERESTS ? (
              <PressableScale
                scaleTo={0.94}
                onPress={() => setOpen('interests')}
                accessibilityRole="button"
                accessibilityLabel={t('editProfile.interests', { count: interests.length, max: MAX_INTERESTS })}
                style={[styles.pill, styles.add]}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </PressableScale>
            ) : null}
          </View>
        </InsetGroup>

        <Txt style={styles.sectionLabel}>{t('editProfile.about')}</Txt>
        <InsetGroup>
          <Pressable
            onPress={() => setOpen('about')}
            accessibilityRole="button"
            accessibilityLabel={t('editProfile.about')}
            style={({ pressed }) => [styles.about, pressed && styles.pressed]}>
            {user.about ? (
              <Txt style={styles.aboutText}>{user.about}</Txt>
            ) : (
              <Ionicons name="add" size={22} color={colors.primary} />
            )}
          </Pressable>
        </InsetGroup>
      </ScrollView>

      <TextFieldSheet
        visible={open === 'name'}
        title={t('editProfile.name')}
        value={user.displayName}
        max={NAME_MAX}
        required
        onSave={(displayName) => updateProfile({ displayName })}
        onClose={close}
      />
      <OptionSheet
        visible={open === 'pronouns'}
        title={t('editProfile.pronouns')}
        options={PRONOUNS.map((value) => ({ value, label: t(`editProfile.pronounOptions.${value}`) }))}
        value={user.pronouns}
        onPick={(pronouns) => updateProfile({ pronouns })}
        onClose={close}
      />
      <BirthdaySheet
        visible={open === 'birthday'}
        value={user.birthday}
        onSave={(birthday) => updateProfile({ birthday })}
        onClose={close}
      />
      <TextFieldSheet
        visible={open === 'job'}
        title={t('editProfile.job')}
        value={user.job ?? ''}
        max={JOB_MAX}
        onSave={(job) => updateProfile({ job: job || undefined })}
        onClose={close}
      />
      <InterestsSheet
        visible={open === 'interests'}
        value={interests}
        onSave={(next) => updateProfile({ interests: next })}
        onClose={close}
      />
      <TextFieldSheet
        visible={open === 'about'}
        title={t('editProfile.about')}
        value={user.about ?? ''}
        max={ABOUT_MAX}
        multiline
        onSave={(about) => updateProfile({ about: about || undefined })}
        onClose={close}
      />
    </Screen>
  );
}

const CAMERA = 32;

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.sm, paddingBottom: space.xs },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: CAMERA,
    height: CAMERA,
    borderRadius: CAMERA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  error: { fontSize: 13, color: systemColors.red },
  meter: { marginTop: 22, paddingHorizontal: space.lg, paddingVertical: 14 },
  meterTop: { flexDirection: 'row', alignItems: 'center' },
  meterTitle: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  meterPercent: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  track: { height: 6, marginTop: 10, borderRadius: 3, overflow: 'hidden', backgroundColor: systemColors.fill },
  fill: { height: '100%', borderRadius: 3, backgroundColor: systemColors.green },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: 14 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: systemColors.fill },
  pillText: { fontSize: 15, letterSpacing: -0.2, color: colors.text },
  add: { width: 52, alignItems: 'center', paddingHorizontal: 0 },
  pressed: { backgroundColor: colors.surfaceAlt },
  about: { minHeight: 50, paddingHorizontal: space.lg, paddingVertical: 14, justifyContent: 'center', alignItems: 'flex-start' },
  aboutText: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
});
