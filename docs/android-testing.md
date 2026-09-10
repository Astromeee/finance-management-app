# Android APK testing

Pocket Ledger uses the existing React/Vite source for the website and an Android
Capacitor app. Keep using the same GitHub repository. `npm run dev` and
`npm run build` retain their web behavior, including the website's PWA support.
Nothing is published to a store by these commands.

## Build an APK

Install Node 22+, JDK 21, Android SDK Platform 36 and Build Tools 36.0.0.
Android Studio can install the SDK and provide Java. For a Mac command-line setup:

```sh
brew install openjdk@21 android-commandlinetools
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
npm ci
npm run android:apk
```

The build helper detects the standard Apple Silicon/Intel Homebrew Java location
or Android Studio's bundled Java. Set `JAVA_HOME` and `ANDROID_HOME` for other locations.
The output is `artifacts/pocket-ledger-debug.apk` (ignored by Git).
This build supports Android 7.0/API 24 and later. Keep Android System WebView updated.

`npm run android:sync` builds to `dist-native` and copies it into the Android
project. `npm run android:open` opens Android Studio if installed. Vercel keeps
using the separate `dist` web build. Service worker generation is disabled only
for the native build; app updates arrive through a rebuilt APK.

## Configuration and login

The native build reads `.env`, `.env.local`, `.env.native`, and `.env.native.local`
using Vite's normal precedence. It does not load `.env.development.local` or
`.env.production.local`. Configure `VITE_SUPABASE_URL` and the public
`VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key). Never put a service-role key,
server secret, or signing key in a VITE variable or the repository.

The APK uses the existing online backend. Existing website sessions are not copied
to the app. Email/password and Google sign-in are supported. Native Google sign-in
uses PKCE and returns through `app.pocketledger.mobile://auth/callback`. Add this
exact URI to Supabase Authentication > URL Configuration > Redirect URLs.
Public signup follows `VITE_PUBLIC_SIGNUP_ENABLED`, which defaults to false.

Email verification and password reset links finish on the website; return to the
APK afterward to log in. `VITE_PUBLIC_WEB_URL` defaults to
`https://pocket-ledger-seven-phi.vercel.app`; change it if the website moves.
If enabling Turnstile, its allowed hostnames and backend CAPTCHA settings must
support the native origin (`https://localhost`). Do not disable backend CAPTCHA
to work around a failed native login.

## Install without a cable

1. Transfer the APK to your phone (for example, a private drive or file transfer).
2. Open it and allow installation from that browser/file manager when prompted.
3. Install Pocket Ledger and log in with your existing email/password.
4. For the next build, install the new APK over the existing app.

Keep the application ID `app.pocketledger.mobile` and the Mac's
`~/.android/debug.keystore` unchanged to preserve the update signing identity.
Do not uninstall the app between updates if you want to retain local preferences
and the session. Debug signing is for testing, not a production release strategy.
Neither an Android phone connection nor a Play developer account is required.

## Phone testing checklist

- Log in, close and reopen the app, and confirm the session persists.
- Check balances and transactions match the same account on the website.
- Add, edit, and delete a small test transaction; confirm each change on the web.
- Open a sheet and press Android Back: the sheet should close before navigating.
- Check tabs, keyboard, system bars, and navigation with your phone's font size.
- Export CSV and JSON: Android should offer destinations to save/share the file.
- Turn off internet, check error handling, reconnect, and verify saved data.
- Sign out and verify the private ledger is no longer accessible.
- Install an updated APK over this version and confirm preferences/session remain.

The interface is bundled locally, but authenticated ledger access and changes
still need the existing backend. Offline editing/sync is not added by Capacitor.
Daily check-ins and bill reminders use Android local notifications and can fire
while the app is closed. Android 13+ asks for notification permission. Bill
reminders are refreshed whenever the signed-in ledger loads; up to 50 upcoming
unpaid bills are scheduled for 9:00 AM on their due date. Successful compilation
does not replace this phone checklist. iOS and store publishing remain follow-up work.
