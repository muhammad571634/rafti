import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { showAlert } from '@/lib/alert';
import { syncMemories } from '@/store/memory-sync';
import { restoreFromServer, syncMessages } from '@/store/message-sync';
import { useAppStore } from '@/store/use-app-store';

/** Turns on the chat backup: reads the account's copy back first (an empty phone), then sends what is new. */
export async function startChatBackup() {
  await restoreFromServer();
  return Promise.all([syncMessages(), syncMemories()]);
}

/**
 * The one ask before anything the user writes reaches the AI service (App Store 5.1.2(i)): who gets it
 * (Google Gemini) and that the chats are backed up to their account. Agreeing turns the backup on.
 * Photos and voice messages keep their own asks (`usePickPhoto`, `useVoiceNote`).
 * `canWait` adds "Not now" (onboarding, where nothing has been sent yet); without it the only way on is
 * to agree (someone who was chatting before this ask existed).
 */
export function useAiConsent() {
  const { t } = useTranslation();
  const agreed = useAppStore((s) => !!s.settings.aiConsentAt);
  const setSetting = useAppStore((s) => s.setSetting);

  const ask = useCallback(
    (onAgree: () => void, canWait: boolean) => {
      showAlert(t('aiConsent.title'), t('aiConsent.body'), [
        ...(canWait ? [{ text: t('aiConsent.notNow'), style: 'cancel' as const }] : []),
        {
          text: t('aiConsent.agree'),
          onPress: () => {
            setSetting('aiConsentAt', new Date().toISOString());
            setSetting('serverMessages', true);
            void startChatBackup();
            onAgree();
          },
        },
      ]);
    },
    [t, setSetting],
  );

  return { agreed, ask };
}
