import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CompletionMeter } from '@/components/profile/completion-meter';
import { BirthdaySheet, InterestsSheet, OptionSheet, TextFieldSheet } from '@/components/profile/field-sheets';
import { Chip, Divider, Header, ListRow, PressableScale, Screen, SectionLabel, Txt, UserAvatar } from '@/components/ui';
import {
  ABOUT_MAX,
  JOB_MAX,
  MAX_INTERESTS,
  NAME_MAX,
  birthdayLabel,
  profileCompletion,
} from '@/lib/profile';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Pronouns } from '@/types';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PRONOUNS: Pronouns[] = ['she', 'he', 'they'];

type Field = 'name' | 'pronouns' | 'birthday' | 'job' | 'interests' | 'about';

/**
 * What the characters know about the user. Every row saves on its own sheet,
 * so there is no "Save changes" to forget; the meter fills as rows are done.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const updateProfile = useAppStore((s) => s.updateProfile);

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

  const row = (field: Field, title: string, meta?: string) => (
    <ListRow title={title} meta={meta} chevron onPress={() => setOpen(field)} />
  );

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('editProfile.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <PressableScale
            onPress={() => void pickPhoto()}
            scaleTo={0.95}
            accessibilityLabel={t('editProfile.photo')}>
            <UserAvatar user={user} size={96} />
            <View style={styles.camera}>
              <Ionicons name="camera" size={16} color={colors.textOnPrimary} />
            </View>
          </PressableScale>
          {photoError ? (
            <Txt variant="small" color={colors.danger}>
              {t('editProfile.photoTooLarge')}
            </Txt>
          ) : null}
          <View style={styles.meter}>
            <CompletionMeter percent={percent} />
          </View>
        </View>

        <SectionLabel tone="section" title={t('editProfile.basics')} />
        {row('name', t('editProfile.name'), user.displayName)}
        <Divider inset={space.lg} />
        {row('pronouns', t('editProfile.pronouns'), user.pronouns && t(`editProfile.pronounOptions.${user.pronouns}`))}
        <Divider inset={space.lg} />
        {row('birthday', t('editProfile.birthday'), birthdayLabel(user.birthday))}
        {user.birthYear ? (
          <>
            <Divider inset={space.lg} />
            {/* The 18+ answer from onboarding; read-only. */}
            <ListRow title={t('editProfile.born')} meta={String(user.birthYear)} />
          </>
        ) : null}
        <Divider inset={space.lg} />
        {row('job', t('editProfile.job'), user.job)}

        <SectionLabel tone="section" title={t('editProfile.interests', { count: interests.length, max: MAX_INTERESTS })} />
        <View style={styles.chips}>
          {interests.map((interest) => (
            <Chip key={interest} label={interest} onPress={() => setOpen('interests')} />
          ))}
          <PressableScale
            scaleTo={0.94}
            onPress={() => setOpen('interests')}
            accessibilityLabel={t('editProfile.interests', { count: interests.length, max: MAX_INTERESTS })}
            style={styles.add}>
            <Ionicons name="add" size={20} color={colors.text} />
          </PressableScale>
        </View>

        <SectionLabel tone="section" title={t('editProfile.about')} />
        <PressableScale scaleTo={0.98} onPress={() => setOpen('about')} style={styles.about}>
          {user.about ? (
            <Txt variant="body">{user.about}</Txt>
          ) : (
            <Ionicons name="add" size={22} color={colors.text} />
          )}
        </PressableScale>
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

const CAMERA = 30;

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.huge },
  top: { alignItems: 'center', gap: space.md, paddingTop: space.md, paddingHorizontal: space.lg },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: CAMERA,
    height: CAMERA,
    borderRadius: CAMERA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.bgPlain,
  },
  meter: { alignSelf: 'stretch', paddingHorizontal: space.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg },
  // Secondary chip: white with a hairline, like the secondary button.
  add: {
    width: 56,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  about: {
    marginHorizontal: space.lg,
    minHeight: 64,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});
