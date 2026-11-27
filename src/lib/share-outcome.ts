/**
 * What a share through the system sheet really did, so shells pay only for a picture that went
 * somewhere (owner, 2026-11-08: "not for just pressing Share; for posting it on Instagram or
 * anywhere"). Pure, so it is tested without a phone.
 *
 * - iOS tells: the share sheet reports whether it completed and which app took it. A completed share
 *   to an app that sends or posts is `posted`; saving, copying or printing it is `kept` (no pay).
 * - Android does not tell which app was picked, or whether anything was sent. The sheet's promise
 *   comes back when the user returns: a cancel returns at once, picking an app and sending takes
 *   seconds. Away for `ANDROID_AWAY_MS` or longer counts as `posted`; quicker is `dismissed`.
 *   A native chooser callback (next APK) can replace this guess with the picked app.
 */
export type ShareOutcome = 'posted' | 'kept' | 'dismissed' | 'failed';

/** How long the user must be away in the picked app before an Android share pays. */
export const ANDROID_AWAY_MS = 4000;

/** iOS activities that keep the picture on the phone rather than send it to anyone. */
const KEEPS = [
  'com.apple.UIKit.activity.SaveToCameraRoll',
  'com.apple.UIKit.activity.CopyToPasteboard',
  'com.apple.UIKit.activity.Print',
  'com.apple.UIKit.activity.AssignToContact',
  'com.apple.UIKit.activity.AddToReadingList',
  'com.apple.UIKit.activity.MarkupAsPDF',
  'com.apple.DocumentManagerUICore.SaveToFiles',
  'com.apple.CloudDocsUI.AddToiCloudDrive',
];

export function iosShareOutcome(action: string, activityType: string | null | undefined): ShareOutcome {
  if (action !== 'sharedAction') return 'dismissed';
  if (activityType && KEEPS.includes(activityType)) return 'kept';
  return 'posted';
}

export function androidShareOutcome(awayMs: number): ShareOutcome {
  return awayMs >= ANDROID_AWAY_MS ? 'posted' : 'dismissed';
}

/** Today's paid-share keys: one card (a friend's chat, a bond) pays once a day at most. */
export function canPayShare(paidKeys: readonly string[] | undefined, key: string | undefined) {
  return !key || !(paidKeys ?? []).includes(key);
}
