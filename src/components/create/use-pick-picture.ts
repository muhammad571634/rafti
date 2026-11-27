import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { showAlert } from '@/lib/alert';
import { keepCharacterPicture } from '@/lib/character-picture';

/**
 * A character's picture from the gallery or the camera: any picture (owner, 2026-11-19), cropped 4:5,
 * made smaller and kept in the app's own folder; it stays on this phone (creator-ecosystem.md §0).
 * Gives the kept picture's URI, or undefined when the user cancels or the camera is off (that case
 * offers Settings). Throws when the picker fails, so the caller can say so.
 */
export function usePickCharacterPicture() {
  const { t } = useTranslation();
  return async (from: 'library' | 'camera'): Promise<string | undefined> => {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 5], exif: false };
    if (from === 'camera') {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) {
        showAlert(t('photoBooth.cameraOff'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notifications.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return undefined;
      }
    }
    const result = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    return asset ? keepCharacterPicture(asset.uri) : undefined;
  };
}
