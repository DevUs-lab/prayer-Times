# Prayer Times 🕌

A React Native app (Android + iOS) for daily prayer times, the Islamic (Hijri) calendar and weather — in **English, Urdu, Hindi or Roman Urdu** (your choice on first launch).

## Features

- **First-run intro: language, then location** — a fresh install opens with **"Choose your language"** (English · اردو · हिन्दी · Roman Urdu), then **"Set your location"** (one-tap auto-detect or a manual city search, with a skip so you are never stuck). Every later open goes straight to Home; both choices stay changeable in **Settings**.
- **Full app in four languages** — every visible string (tabs, prayer names + glosses, countdown sentence, weather labels, errors, calendar) lives in `src/i18n/strings.js` with English fallback and `{{param}}` interpolation. Roman Urdu keeps the app's legacy copy, e.g. English shows **"Dhuhr ends in"** where Roman Urdu shows **"Zuhr ka waqt khatam hone mein"**. Urdu is rendered right-to-left inside the (still LTR) layout using the system's Naskh/Nastaliq fonts; Hindi uses Devanagari — no bundled font files.
- **Home** — mosque header with today's Hijri + Gregorian date and the location meta line (**Elevation 1338 ft · GMT +5.0**, "Bulandi …" in Roman Urdu), a **NOW / NEXT card**, and the full prayer table showing **both the start (adhan) and end time** of every prayer. Below that: current weather, hourly strip and a 7-day forecast. Pull-to-refresh.
- **NOW / NEXT card** — one merged timeline of prayers *and* the day's other events, so the section behaves like a Pakistani app: after Fajr it shows **Talu-e-Aftab** next, then **Ishraq**, **Duha-e-Sughra / Duha-e-Kubra**, **Zawal (Makrooh)**, **Dhuhr**… The big countdown runs to the end of whatever is running and says so — e.g. `04:11:23` under **"Zuhr ka waqt khatam hone mein"** (Roman Urdu; English: "Dhuhr ends in", Urdu: "ظہر کا وقت ختم ہونے میں") — with a `NEXT` line for what takes over, and a progress bar from the current entry to that moment. Before Fajr the card simply reads `NEXT · Fajr`; after midnight the night markers (**Nisf al-Layl**, **Aakhri third**) are what is running — they are calculated from the night length (Aladhan's `Midnight` / `Lastthird` as fallback).
- **Islamic Calendar** — browse any Hijri month, tap to pick from all 12 Islamic months and a year, see the matching Gregorian dates and highlight today.
- **Settings** — a **Language** section (the same four choices as the intro, applied instantly), one search box with **live place suggestions**: type `Jhang` and a list appears (`Jhang — Jhang District, Punjab, Pakistan`, `Jhang — Attock District, …`), tap one and it is saved. Or use the one-tap auto-detect button (GPS first, city-level IP fallback).
- **Location is asked for, not guessed** — the intro's location step runs the device GPS (satellite fix first, Wi-Fi/mobile-tower fix as the indoor fallback, so it still works without internet) and, if that is refused, falls back to an IP-based city lookup; you can also search by name or skip and set it later.
- **Prayer calculation is fixed** — the **Karachi (University of Islamic Sciences)** method, i.e. Fajr 18° / Isha 18°, which is what mosques and Pakistani prayer apps use, plus **always Hanafi Asr** (`school = 1`: shadow = 2× object). No method picker to get confused by.
- **The times themselves are calculated in the app, with seconds** — `solarTimes.js` runs the solar maths (declination + equation of time → hour angles), so the table reads `4:45:32` instead of Aladhan's rounded `04:46`, and sunrise/Maghrib use an **elevation-corrected horizon** (`0.833° + 0.0347·√metres`, elevation cached from Open-Meteo): Jhang sits 161 m up, so sunrise is `6:04:22`, not a flat-horizon `6:06`. Aladhan still supplies the Hijri date, the timezone anchor and the fallback minutes — a calculated time is only adopted when it lands within **30 minutes** of the timetable (real horizon/coordinate differences are ±2 min; a broken timezone or coordinate lands hours away).
- **A whole year on the phone, offline-friendly** — one pull-to-refresh downloads all 12 months for your location. Every later open syncs quietly in the background: missing months are filled, data older than 30 days is re-downloaded, fresh data is left alone. No internet? Nothing is fetched, the saved times stay on screen, and a note says `No internet — showing saved data` (Roman Urdu: `Internet nahi mila — saved (purana) data dikha rahe hain`). Logic decides by error *code*, never by parsing message text, so the note reads correctly in every language.
- **Tabs never reload** — a tab you have opened once stays mounted (hidden with `display: none`), so Home → Calendar → Home comes straight back with the times, weather and month already on screen: no spinner, internet or not. Only a screen's *first* open loads.

## Theming & icons

- Emerald green + gold Islamic theme, defined once in `src/Components/theme.js`.
- Ornamental dividers and geometric pattern bands are drawn with plain Views (`src/Components/Ornament.jsx`) — no image assets.
- All icons come from **react-native-vector-icons** (`MaterialCommunityIcons`), wrapped in `src/Components/icons.jsx`.
- Screens use `useSafeAreaInsets()` from `react-native-safe-area-context` for top/bottom insets.

> After pulling these changes run `npm install`, then rebuild — on iOS also `bundle exec pod install`.

## APIs (all free, no API key)

| Purpose | Service |
| --- | --- |
| Timetable, Hijri dates (clock times calculated in-app) | [Aladhan API](https://aladhan.com/prayer-times-api) |
| Place search (live suggestions) | [Photon](https://photon.komoot.io) (OpenStreetMap) |
| Place search fallback | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) |
| Weather forecast + site elevation | [Open-Meteo Forecast](https://open-meteo.com/en/docs) |
| Reverse geocoding (GPS) | BigDataCloud reverse-geocode-client |

Monthly prayer timetables and Hijri months are cached in `AsyncStorage`, so each month costs a single network request per location (cache keys include method + Asr school, so settings changes never show stale times).

**Offline / yearly sync.** `syncYear()` pulls a full year one month at a time (3 requests in flight) and records completion in a per-location `@pt/meta/…` key; `syncIfNeeded()` decides what to do: missing months → fill them, meta older than 30 days → refresh everything, `force: true` (pull-to-refresh or the header refresh button) → re-download regardless, otherwise nothing. It throws only when nothing could be downloaded, so the Home screen can fall back to the saved timetable and show a note instead of an empty screen. The cache keeps the current location's **entire year**, trims other locations to the current month (a city switch still shows today's times) and drops old years — including their metas — on the next write. Two callers asking for the same month (today + tomorrow) share a single in-flight request. The Calendar's Hijri months are cached as you visit them.

## Project structure

```
src/
  Components/        TabBar, shared UI (Card, buttons, chips), PlaceSearch (shared
                     suggestion box), icons, ornaments, theme
  Screens/
    index.jsx        App shell: language/location gate (first-run intro) + tabs
                     (Home / Calendar / Settings — kept mounted once opened,
                     so tab switches never reload a screen)
    Onboarding/      First-run steps: LanguageStep (4 languages), LocationStep
                     (auto-detect or manual search, with skip)
    Frontend/
      index.jsx      Home (NOW/NEXT card, meta line, prayer table with start+end, weather)
      Calendar/      Islamic month browser
      Settings/      Language picker, location search (live suggestions), auto-detect
    Services/
      prayerTimes.js Aladhan timetable (Karachi method, Hanafi Asr), Hijri calendar, normalisers,
                     day events (Talu-e-Aftab, Ishraq, Duha, zawal…) + computeNextItem
                     (merged now/next timeline behind the countdown card),
                     yearly offline sync (syncYear / syncIfNeeded)
      solarTimes.js  In-app prayer-time maths: seconds for every prayer and an
                     elevation-corrected horizon for sunrise/sunset
      elevation.js   Cached site elevation (Open-Meteo) for that horizon
      weather.js     Open-Meteo fetch, WMO codes, elevation/GMT helpers
      geocode.js     Place search (Photon → Open-Meteo), reverse geocode, GPS/IP auto-detect, labels
      location.js    GPS permission + coordinates
      locationStorage.js / onboarding.js
  i18n/
    strings.js       The four dictionaries (en/ur/hi/rom) + translate/t, prayer and
                     event names, Hijri-month names, RTL/locale helpers
    index.jsx        LanguageProvider + useLang() (active language, persistence)
  utils/date.js      Time parsing (HH:MM:SS), 12-hour format, countdown, timezone clock, shiftMinutes
```

## Aladhan response shapes (careful!)

The three endpoints do **not** agree on their shape — everything is normalised in
`src/Screens\Services/prayerTimes.js`:

| Endpoint | Item shape |
| --- | --- |
| `/calendar/{year}/{month}` | `{ timings, date: { hijri, gregorian }, meta }` |
| `/hToGCalendar/{month}/{year}` | `{ hijri, gregorian }` — **no `date` wrapper** |
| `/gToH/{dd-mm-yyyy}` | `{ hijri, gregorian }` — we return `.hijri` only |

Assuming the wrong shape crashes the screen; `__tests__/calendarDebug.test.js`
guards against a regression.

## Why timings can differ from another prayer app

Prayer times depend on three things. Two of them commonly differ between apps:

| Factor | This app | Typical Pakistani app |
| --- | --- | --- |
| Calculation method | **Karachi** (Fajr 18°, Isha 18°) | Karachi — matched (Isha is the visible one: with MWL's 17° it was 4 min early) |
| Asr opinion | Hanafi (2× shadow) | Hanafi — matched |
| Coordinates | GPS, or the point returned for the searched place | Their own GPS point / city centre |
| Sunrise & Maghrib model | elevation-corrected horizon (`0.833° + 0.0347·√m`) | some apps use a flat horizon → **±1–2 min on sunrise/Maghrib only** |
| Display precision | seconds (`4:45:32`) | Aladhan-style apps round to minutes (`04:46`) |

Dhuhr (solar noon) is the least sensitive value: if Dhuhr matches to the second
but sunrise/Maghrib are 1–2 minutes apart, it is the horizon model or a slightly
different coordinate — not a wrong location.

**Known quirk — Asr:** Aladhan's own service samples the sun's declination a
day late inside its Asr calculation (`asrTime()` in their PHP library), which is
why their Asr sits ~1 minute after the standard value — `adhan-js` agrees with
this app to a couple of seconds. Everything else agrees with Aladhan within the
±30 s of their minute rounding.

The event windows in the NOW/NEXT card are conventional (they are not
astronomy):

| Event | Rule used |
| --- | --- |
| Talu-e-Aftab | sunrise, as calculated |
| Ishraq | sunrise + 20 min |
| Duha-e-Sughra | `[sunrise + 20 min, ¼ of daylight]` |
| Duha-e-Kubra | `[¼ of daylight, Dhuhr − 10 min]` |
| Zawal (Makrooh) | `[Dhuhr − 10 min, Dhuhr]` — avoid nafl here |
| Nisf al-Layl / Aakhri third | sunset + ½ night / sunset + ⅔ night (Aladhan's `Midnight` / `Lastthird` as fallback) |

## Checks

```sh
npm test        # Jest (app render, prayer/time logic, i18n dictionaries, onboarding flow)
npm run lint    # ESLint
npx tsc --noEmit
```

## Native icon font setup (already configured here)

- **Android**: `android/app/build.gradle` applies `react-native-vector-icons/fonts.gradle` and copies only `MaterialCommunityIcons.ttf`.
- **iOS**: `Info.plist` → `UIAppFonts` lists `MaterialCommunityIcons.ttf` (run `bundle exec pod install` after changing).

---

The rest of this file is the original React Native CLI boilerplate.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
