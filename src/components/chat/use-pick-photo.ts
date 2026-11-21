import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { apiBase } from '@/ai/server';
import { useAppStore } from '@/store/use-app-store';
import { showAlert } from '@/lib/alert';

/**
 * Picks a photo to send in a chat. With the model on, the photo goes to an outside AI service, so the
 * first time the user is asked, once (App Store rule 5.1.2(i)); "Not now" sends nothing.
 * The send comes with the tap, so screens can call the hook before their early returns.
 */
/** The picked photo and its width over its height. */
type Send = (uri: string, aspect?: number) => void;

export function usePickPhoto() {
  const { t } = useTranslation();
  const shared = useAppStore((s) => s.settings.photosToAi);
  const modelOn = useAppStore((s) => s.settings.realAi) && !!apiBase();
  const setSetting = useAppStore((s) => s.setSetting);

  const pick = async (send: Send) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const asset = result.canceled ? undefined : result.assets[0];
    // Its shape, so the bubble is right before the picture loads.
    if (asset?.uri) send(asset.uri, asset.width > 0 && asset.height > 0 ? Math.round((asset.width / asset.height) * 1000) / 1000 : undefined);
  };

  return (send: Send) => {
    if (!modelOn || shared) return void pick(send);
    showAlert(t('chat.photoConsent.title'), t('chat.photoConsent.body'), [
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
