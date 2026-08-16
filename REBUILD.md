# Noor Salah — Rebuild & Verify Runbook

## Toolchain (re-download if pruned)
- JDK21: `/home/user/opt/jdk21` — `curl -sL -o /tmp/j.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse" && mkdir -p ~/opt && tar xzf /tmp/j.tar.gz -C ~/opt && mv ~/opt/jdk-21* ~/opt/jdk21`
- SDK: `/home/user/android-sdk` — cmdline-tools `https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip`, then `sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"` (use `cmdline-tools/latest/bin/sdkmanager` layout).
- Deps: `cd /home/user/noor-salah && npm ci` (node v20, CLI 7.6.8).

## Restore app module if pruned
`cd /home/user/noor-salah && tar xzf app-module-backup.tar.gz` (contains all java/res/manifest/gradle customizations incl. kotlin-stdlib-jdk7/8 exclude fix in android/build.gradle).

## Build (RAM ~1.9GB — never raise heap; daemon=false already pinned)
```
cd /home/user/noor-salah/android
export JAVA_HOME=/home/user/opt/jdk21 ANDROID_HOME=/home/user/android-sdk
./gradlew assembleDebug --no-daemon --console=plain --max-workers=1 -q
```
- Kill stray java with `pkill -9 -f "[j]dk21/bin"` (never `pkill -f java` — kills own shell).
- If gradle says UP-TO-DATE after restoring sources, run `./gradlew clean` first.

## VERIFY (do this EVERY build — multidex traps!)
APK has ~9 dex files; app classes land in classes8.dex, NOT classes.dex!
```
python3 - <<'PY'
import zipfile
z=zipfile.ZipFile('app/build/outputs/apk/debug/app-debug.apk')
app=b''.join(z.read(n) for n in z.namelist() if n.startswith('classes') and n.endswith('.dex'))
for s in [b'com/noor/salah/MainActivity',b'NoorWidgetProvider',b'AzanCenter',b'AzanPlayer',b'AzanReceiver',b'PrayerMath',b'Hijri']:
    assert s in app, s
print('classes OK')
PY
/home/user/android-sdk/build-tools/35.0.0/aapt dump badging app-debug.apk | head -1
```
aapt xmltree prints `A: android:name(0x...)= "..."` — grep the Raw form, not `name="`.

## Signing
Debug keystore: `/home/user/.android/debug.keystore` (SHA-256 61:d7:72:6a:03:34:e4:15:...) — insurance copy at `noor-salah/keys/debug.keystore` (same file). All shipped builds use it → in-place updates work; if a future build somehow changes key, user must uninstall first.

## Ship
`cp app/build/outputs/apk/debug/app-debug.apk /home/user/Noor-Salah.apk`, bump versionCode/versionName in `android/app/build.gradle`, then refresh backup: `tar czf app-module-backup.tar.gz android/app/src android/app/build.gradle android/build.gradle android/gradle.properties android/settings.gradle android/capacitor.settings.gradle android/variables.gradle android/gradlew* android/gradle` (adjust as needed).

## Web preview
`cd /home/user/noor-salah/web && python3 -m http.server 8080 --bind 0.0.0.0` (start_process).
