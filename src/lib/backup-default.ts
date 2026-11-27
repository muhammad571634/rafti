import type { AppSettings } from '@/types';

/**
 * True when an account already agreed to the AI consent card (`aiConsentAt`, which explains that
 * chats are backed up to their account) and has never explicitly turned backup off in Profile.
 * Explicit `false` is always respected.
 */
export function shouldEnableBackup(settings: Pick<AppSettings, 'aiConsentAt' | 'serverMessages'>): boolean {
  return Boolean(settings.aiConsentAt) && settings.serverMessages === undefined;
}

/**
 * True when the app should run a background restore + outbox sync once after hydration: the user
 * has consented to AI & backup and has not turned Profile → Chat backup off.
 */
export function shouldSyncOnLaunch(settings: Pick<AppSettings, 'aiConsentAt' | 'serverMessages'>): boolean {
  return Boolean(settings.aiConsentAt) && settings.serverMessages !== false;
}
