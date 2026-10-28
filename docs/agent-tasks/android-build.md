# Agent task: put the latest app on the owner's Android phone (no Expo Go)

Read `AGENTS.md` and the top of `HANDOFF.md` first. Reply to the owner in Uzbek, in plain words
(they do not read code). Everything in the repo stays in English.

## Goal

A release build of the latest `local-work` on the owner's Samsung A51 (Android 13), installed
over USB, working without the laptop: it talks to the cloud server (`https://sigmazam-api.fly.dev`,
the default in `src/ai/server.ts`; do not set `EXPO_PUBLIC_API_URL`).

## The proven path (2026-10-14, see HANDOFF: "Stage 3, Android")

`npx expo run:android --variant release --no-bundler` with the phone on USB (USB debugging on).
Java and the Android SDK are already on this laptop. `/android` is generated and git-ignored:
never commit it. Keep `android.package` `com.rafti.app`: the phone already has that app, so this
installs over it and keeps its data (the rename to Sigmazam is a separate step before the store).
Read https://docs.expo.dev/versions/v57.0.0/ (run:android, local builds) if something fails.

## One code change first

A release build hides Profile's "Development" section (`__DEV__` is false), and there the owner
turns on Real AI and Server chats; without them the app shows only stand-in replies.
In `src/app/profile.tsx`, make every `__DEV__` gate of that section (the `{__DEV__ ? (` block and
the `if (!__DEV__ || !settings.realAi)` check) also open when
`process.env.EXPO_PUBLIC_DEV_MENU === '1'`, with one shared constant. Build with
`EXPO_PUBLIC_DEV_MENU=1` set in the shell. Nothing else changes.

## After the install

Tell the owner: Profile → Development → turn on **Real AI** and **Server chats**, then send a chat
line and get a real reply. Check `adb logcat` for a red crash if the app closes on launch.

## Updates

This build carries its code inside: a later change reaches the phone only by running the same
build command again (phone on USB, a few minutes). Say this to the owner plainly. Automatic
updates over the air (EAS Update) need an Expo account and are not part of this task.

## Done means

`npx tsc --noEmit` clean, `npm test` passes, the app opens on the phone with a real reply.
Add `### 0z19` (or the next free number) to the top of `HANDOFF.md` with the exact build command,
commit only the `profile.tsx` change + the note to `local-work`, and push (pull first).
