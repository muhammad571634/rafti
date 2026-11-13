# Agent task: the app on the owner's Android phone, with updates over the air

Read `AGENTS.md` and the top of `HANDOFF.md` first. Reply to the owner in Uzbek, in plain words
(they do not read code). Everything in the repo stays in English.

## Goal

An APK built by EAS (Expo's cloud) that the owner installs once on their Samsung A51 (Android 13).
After that, every change reaches the phone by `eas update`: the app checks on launch and takes
the new code, with no laptop, Metro or USB. It talks to the cloud server (the default in
`src/ai/server.ts`; never set `EXPO_PUBLIC_API_URL` for these builds).

## Access

Expo account `sukuts-team`. The CLI signs in with `EXPO_TOKEN` (Windows user env; restart the
terminal if `npx eas-cli whoami` says "Not logged in"). `whoami` must show the role Developer or
Admin: with Viewer, stop and tell the owner to make a new token with the Developer role. Never
print the token or write it into a file.

Read first: https://docs.expo.dev/versions/v57.0.0/, https://docs.expo.dev/eas-update/getting-started/,
https://docs.expo.dev/build-reference/apk/.

## Steps

1. `npx expo install expo-updates`.
2. `npx eas-cli init` for the `sukuts-team` account: `app.json` gets `owner` and
   `extra.eas.projectId`. Keep `android.package` `com.rafti.app` (the Sigmazam rename is a separate
   step before the store).
3. `npx eas-cli update:configure`: `updates.url`, and `runtimeVersion` with the `appVersion`
   policy, so an update reaches only builds it fits.
4. `eas.json`, profile `preview`: `distribution: "internal"`, `android.buildType: "apk"`,
   `channel: "preview"`.
5. Profile's "Development" section (`src/app/profile.tsx`, the `{__DEV__ ? (` block and the
   `if (!__DEV__ || !settings.realAi)` check) is hidden in release builds, and there the owner
   turns on Real AI and Server chats. Open it with one shared constant:
   `__DEV__ || Updates.channel === 'preview'` (`import * as Updates from 'expo-updates'`).
   Nothing else in the UI changes.
6. `npx tsc --noEmit` and `npm test` pass; commit and push to `local-work` (pull first).
7. `npx eas-cli build -p android --profile preview`. On the first build let EAS generate the
   Android keystore (answer yes). `/android` is git-ignored: EAS makes it from `app.json`
   (the local module `modules/alarm-screen` and `react-native-notify-kit` come along).
8. Give the owner the build's install link (the build page has a QR code). Tell them to uninstall
   the old Sigmazam/rafti app first (a different signature cannot install over it), install the
   new one, then Profile → Development → turn on **Real AI** and **Server chats**.
9. Prove the update path: change nothing visible, run
   `npx eas-cli update --channel preview --message "first update"`, and check on the EAS dashboard
   that the build's runtime version matches the update's.

## From now on (write this into HANDOFF.md for every agent)

- A JS-only change (screens, logic, strings): after pushing it, run
  `npx eas-cli update --channel preview --message "<what changed>"`. The phone takes it the next
  time the app is closed and opened (sometimes a second reopen).
- A native change (a new native package, `app.json` plugins or permissions): bump `version` in
  `app.json` and make a new build (step 7); the owner installs it over the old one (same keystore).

## Done means

The app opens on the phone, a chat line gets a real reply, and the first update is published.
Add `### 0z19` (or the next free number) to the top of `HANDOFF.md` and a `docs/flows.md` row.
