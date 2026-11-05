import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Alert, Linking } from 'react-native';

import { keepSelfie } from '@/lib/booth-selfies';

/**
 * The Photo Booth's shutter: the phone's front camera takes the user's half of the picture, as a
 * booth does (owner, 2026-11-05: "the user stood beside the character, in the phone's camera").
 * Gives the kept selfie's name, or undefined when the user closed the camera or it is not allowed;
 * a turned-off camera says so once, with the way to Settings.
 */
export function useTakeSelfie() {
  const { t } = useTranslation();

  return async (): Promise<string | undefined> => {
    try {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) {
        Alert.alert(t('photoBooth.cameraOff'), t('photoBooth.cameraOffBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('notifications.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
        return undefined;
      }
      const shot = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.front,
        quality: 0.7,
        exif: false,
      });
      const uri = shot.canceled ? undefined : shot.assets[0]?.uri;
      return uri ? await keepSelfie(uri) : undefined;
    } catch {
      return undefined;
    }
  };
}
