import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group, LinkRow, ProgressCard, TitleTop } from '@/components/character/kit';
import { BirthdaySheet, InterestsSheet, OptionSheet, TextFieldSheet } from '@/components/profile/field-sheets';
import { PressableScale, Screen, Txt, UserAvatar } from '@/components/ui';
import {
  ABOUT_MAX,
  JOB_MAX,
  MAX_INTERESTS,
  NAME_MAX,
  birthdayLabel,
  profileCompletion,
} from '@/lib/profile';
import { phrase } from '@/i18n';
import { useAppStore } from '@/store/use-app-store';
import { colors, fonts, playful, space, systemColors } from '@/theme';
import type { Pronouns } from '@/types';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PRONOUNS: Pronouns[] = ['she', 'he', 'they'];
const AVATAR = 112;
/** iOS system colours for the rows' icon tiles (owner 2026-11-08: keep the coloured icons). */
const FILL = {
  name: systemColors.blue,
  pronouns: systemColors.purple,
  birthday: systemColors.red,
  born: systemColors.gray,
  job: systemColors.brown,
};

type Field = 'name' | 'pronouns' | 'birthday' | 'job' | 'interests' | 'about';

/**
 * What the characters know about the user, in the merged look (0z156): cream ground, a heavy title,
 * the photo, how full the profile is, then white cards. Every row saves on its own sheet, so there
 * is no "Save changes" to forget.
 */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [open, setOpen] = useState<Field | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const close = () => setOpen(null);

  const interests = user.interests ?? [];
  const percent = profileCompletion(user);
  const interestsTitle = t('editProfile.interests', { count: interests.length, max: MAX_INTERESTS });

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
    <Screen background={playful.ground}>
      <TitleTop title={t('editProfile.title')} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: space.xs, paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.hero}>
          <PressableScale onPress={() => void pickPhoto()} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={t('editProfile.photo')}>
            <View style={styles.ring}>
              <UserAvatar user={user} size={AVATAR} />
            </View>
            <View style={styles.camera} pointerEvents="none">
              <Ionicons name="camera" size={17} color={colors.textOnPrimary} />
            </View>
          </PressableScale>
          {photoError ? <Txt style={styles.error}>{t('editProfile.photoTooLarge')}</Txt> : null}
        </View>

        <ProgressCard title={percent < 100 ? t('profile.completeTitle') : t('editProfile.title')} percent={percent} />

        <Group title={t('editProfile.basics')}>
          <LinkRow icon="person" fill={FILL.name} label={t('editProfile.name')} meta={user.displayName} onPress={() => setOpen('name')} />
          <LinkRow
            icon="chatbubble-ellipses"
            fill={FILL.pronouns}
            label={t('editProfile.pronouns')}
            meta={user.pronouns && t(`editProfile.pronounOptions.${user.pronouns}`)}
            onPress={() => setOpen('pronouns')}
          />
          <LinkRow
            icon="gift"
            fill={FILL.birthday}
            label={t('editProfile.birthday')}
            meta={birthdayLabel(user.birthday, i18n.language)}
            onPress={() => setOpen('birthday')}
          />
          {/* The 18+ answer from onboarding; read-only. */}
          {user.birthYear ? <LinkRow icon="calendar" fill={FILL.born} label={t('editProfile.born')} meta={String(user.birthYear)} /> : null}
          <LinkRow icon="briefcase" fill={FILL.job} label={t('editProfile.job')} meta={user.job} onPress={() => setOpen('job')} last />
        </Group>

        <Group title={interestsTitle}>
          <View style={styles.chips}>
            {interests.map((interest) => (
              <Pressable
                key={interest}
                onPress={() => setOpen('interests')}
                accessibilityRole="button"
                accessibilityLabel={phrase(interest)}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                <Txt style={styles.chipText} maxFontSizeMultiplier={1.3}>
                  {phrase(interest)}
                </Txt>
              </Pressable>
            ))}
            {interests.length < MAX_INTERESTS ? (
              <PressableScale
                scaleTo={0.94}
                onPress={() => setOpen('interests')}
                accessibilityRole="button"
                accessibilityLabel={interestsTitle}
                style={[styles.chip, styles.add]}>
                <Ionicons name="add" size={20} color={colors.brandText} />
              </PressableScale>
            ) : null}
          </View>
        </Group>

        <Group title={t('editProfile.about')}>
          <Pressable
            onPress={() => setOpen('about')}
            accessibilityRole="button"
            accessibilityLabel={t('editProfile.about')}
            style={({ pressed }) => [styles.about, pressed && styles.aboutPressed]}>
            {user.about ? (
              <Txt style={styles.aboutText}>{user.about}</Txt>
            ) : (
              <View style={[styles.chip, styles.add]}>
                <Ionicons name="add" size={20} color={colors.brandText} />
              </View>
            )}
          </Pressable>
        </Group>
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

const CAMERA = 34;

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.xs, paddingBottom: space.xs },
  // A white ring lifts the photo off the cream.
  ring: { padding: 4, borderRadius: AVATAR / 2 + 4, backgroundColor: playful.card },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: CAMERA,
    height: CAMERA,
    borderRadius: CAMERA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFill,
    borderWidth: 3,
    borderColor: playful.ground,
  },
  error: { fontSize: 13, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: playful.chip },
  chipPressed: { opacity: 0.7 },
  chipText: { fontFamily: fonts.playfulBold, fontSize: 14, color: playful.ink },
  add: { width: 52, alignItems: 'center', paddingHorizontal: 0, backgroundColor: colors.primarySofter },
  about: { minHeight: 54, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18, justifyContent: 'center', alignItems: 'flex-start' },
  aboutPressed: { backgroundColor: playful.chip },
  aboutText: { fontSize: 17, lineHeight: 23, letterSpacing: -0.4, color: colors.text },
});
