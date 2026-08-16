# Noor Salah — Noor Salah | نور صلاة

An **offline-first prayer-times & adhan reminder app for Android**, wrapped in a calm
emerald-and-gold Islamic design. No accounts, no servers, no internet needed —
everything is computed on-device.

**Download:** grab `Noor-Salah.apk` from the [Releases](../../releases) page and install it
(allow "install from this source" when Android asks).

## Features

- **Prayer times on-device** — ISNA (default), Karachi, MWL, Egyptian, Umm al-Qura methods;
  Hanafi or Standard Asr; works fully offline.
- **Makkah adhan reminders** — the Masjid al-Haram adhan plays at prayer time even with the
  app closed, with **Pause / Resume / Mute / Mark-prayed** controls (notification + in-app panel).
  Plain notification-tone mode is also available.
- **Check off prayers** — reminders stop once a prayer is marked done; a prayer can't be checked
  before its time actually begins.
- **Home-screen widget** — Hijri + Gregorian dates, all prayer times, live countdown, next-prayer
  highlight, one-tap refresh.
- **Hijri + Solar calendar** in-app with Islamic-event labels and a **Pakistani calendar preset**
  (Umm al-Qura − 1) plus a one-tap moon-sighting adjustment (−2…+2 days) that updates
  everywhere — app and widget alike.
- **Location aware** — GPS or manual city entry, with an offline gazetteer (~34k cities) for
  place-name resolution.
- **Lightweight** — ~7.6 MB APK, no tracking, no ads, no network calls.

## Project layout

| Path | What it is |
| --- | --- |
| `web/` | The app UI & logic (vanilla JS/CSS/HTML, no framework): times engine, calendar, settings, azan panel |
| `android/` | Capacitor shell + native Java: widget provider, Hijri engine, adhan player/center/receiver, JS bridge |
| `assets/` | Launcher-icon source artwork |
| `capacitor.config.json`, `package.json` | Capacitor project config (`com.noor.salah`) |

## Building it yourself

Requirements: JDK 21, Android SDK (platform 35, build-tools 35), Node 20+.

```bash
npm ci
npx cap copy android          # sync web/ into the android shell
cd android
./gradlew assembleDebug       # outputs app/build/outputs/apk/debug/app-debug.apk
```

`REBUILD.md` in this repo is the detailed field runbook used for this project (environment
restoration, verification steps, signing notes).

## Credits

- Adhan recording: Masjid al-Haram (Makkah) — public-domain distribution via archive.org.
- Fonts: Amiri & Marcellus (SIL OFL) bundled in-app.
- City gazetteer derived from GeoNames data.

All icons and ornaments are hand-drawn inline SVG. No emojis anywhere — by design.
