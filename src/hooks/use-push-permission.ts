import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { pushPermission, type PushPermission } from '@/notifications/sync';

/**
 * The phone's notification permission, read again whenever the app comes back to the
 * front (the user may have changed it in the phone's settings meanwhile).
 */
export function usePushPermission() {
  const [status, setStatus] = useState<PushPermission | undefined>();
  const refresh = useCallback(() => {
    void pushPermission().then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { status, refresh };
}
