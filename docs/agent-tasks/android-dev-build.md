# Task for an agent: build and install the Android development build of Rafti

You are working on the user's Windows PC in `C:\Users\joray\BIMOBIMO` (branch `local-work`).
Read `AGENTS.md` first. Reply to the user in **Uzbek**; anything you write into the repo is in English.

## Goal

Install a **development build** of Rafti on the user's Android phone over USB, so that local push
notifications work (they cannot work in Android Expo Go: `expo-notifications` was removed from
Expo Go in SDK 53). Done means: the Rafti app (not Expo Go) is on the phone, loads the JS from
Metro, and Profile → Developer → **Test pushes** delivers notifications.

## Scope: do only this

- Do **not** change anything under `src/`, `assets/`, `docs/` (except this file's "Result" section)
  or any approved screen. If the build fails because of app code, stop and report; do not fix it.
- Allowed changes: `app.json` (only the `android.package` line below), `package.json` and
  `package-lock.json` (only by `npx expo install expo-dev-client`). The generated `android/`
  folder is git-ignored; never commit it.
- Do not stop or kill processes you did not start. The user's Metro runs on port **8083**; something
  else holds **8081**. Leave both alone.
- Never paste keys or tokens anywhere.

## Steps

1. **Environment for this shell** (PowerShell). The SDK is installed but `ANDROID_HOME` is not set:
   ```
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:Path = "$env:ANDROID_HOME\platform-tools;$env:JAVA_HOME\bin;$env:Path"
   ```
   Use the SDK's `adb` (in `platform-tools`), not the one from scrcpy: two different adb versions
   kill each other's server. Check with `Get-Command adb` that the path is under `Android\Sdk`.

2. **Phone.** Run `adb devices`. You need one line ending in `device`.
   - Empty list: ask the user (in Uzbek) to plug in the USB cable, turn on Developer options →
     USB debugging, and choose "File transfer" if the phone asks. Wait for them.
   - `unauthorized`: ask the user to accept the "Allow USB debugging?" prompt on the phone.

3. **Android package name.** `app.json` → `expo.android` has no `package`, and `run:android`
   would stop to ask for one. Add `"package": "com.rafti.app",` inside `expo.android` (the
   user confirmed this name; if they told you another one, use theirs). Change nothing else in
   `app.json`.

4. **Dev client:** `npx expo install expo-dev-client`.

5. **Build and install** (the first build takes 10-20 minutes; Gradle downloads a lot):
   ```
   npx expo run:android --port 8085
   ```
   Port 8085 keeps it clear of the user's Metro (8083) and of 8081. When it asks which device,
   pick the phone. If it asks anything else you cannot answer from this file, ask the user.
   When it finishes, the Rafti app opens on the phone and loads from Metro on 8085. Keep that
   terminal running; it is the Metro the dev build uses.

6. **Check on the phone** (ask the user to do it and tell you what they see):
   - Rafti opens without a red error screen.
   - The system asks for notification permission (or allow it in the app's Android settings).
   - Profile → Developer → **Test pushes**: the row says "N on the way" and about 8-10
     notifications arrive, 8 seconds apart, each with a character name and a line.
   - Tapping one opens the right chat or screen.

7. **Commit** `app.json`, `package.json`, `package-lock.json` to `local-work` with a short
   English message ("Android dev build: package name and expo-dev-client") and the attribution
   line your tool requires; push to `origin local-work`. Nothing else.

8. **Write the result** under "Result" at the end of this file (date, success or the exact
   failing step and the last ~30 lines of the error), commit it the same way, then tell the
   user in Uzbek in 3-5 short lines.

## If something fails

| Symptom | Do |
| --- | --- |
| `SDK location not found` / `ANDROID_HOME` | Step 1 was not applied in this shell; redo it. |
| `JAVA_HOME is not set` or wrong Java version | Use Android Studio's `jbr` as in step 1. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | An older Rafti with another signature is on the phone: ask the user to uninstall it, run again. |
| `INSTALL_FAILED_USER_RESTRICTED` (Xiaomi/Redmi/POCO) | Ask the user to turn on "Install via USB" in Developer options, run again. |
| Metro port busy | Pick another free port (8086...), never kill the user's processes. |
| Gradle download/timeouts | Run the same command again once. |
| Path too long (`Filename longer than 260 characters`) | Stop and report; do not move the project. |
| Anything in app code (`src/`) | Stop and report the error; do not edit code. |

You may run `npx expo prebuild --clean --platform android` once if the native project looks broken,
then step 5 again. Do not try anything beyond this table without asking the user.

## Result

(fill in)
