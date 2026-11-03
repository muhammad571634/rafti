import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { apiBase } from '@/ai/server';
import { useAppStore } from '@/store/use-app-store';

/**
 * Picks a photo to send in a chat. With the model on, the photo goes to an outside AI service, so the
 * first time the user is asked, once (App Store rule 5.1.2(i)); "Not now" sends nothing.
 * The send comes with the tap, so screens can call the hook before their early returns.
 */
export function usePickPhoto() {
  const { t } = useTranslation();
  const shared = useAppStore((s) => s.settings.photosToAi);
  const modelOn = useAppStore((s) => s.settings.realAi) && !!apiBase();
  const setSetting = useAppStore((s) => s.setSetting);

  const pick = async (send: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) send(uri);
  };

  return (send: (uri: string) => void) => {
    if (!modelOn || shared) return void pick(send);
    Alert.alert(t('chat.photoConsent.title'), t('chat.photoConsent.body'), [
      { text: t('chat.photoConsent.notNow'), style: 'cancel' },
      {
        text: t('chat.photoConsent.allow'),
        onPress: () => {
          setSetting('photosToAi', true);
          void pick(send);
        },
      },
    ]);
  };
}
