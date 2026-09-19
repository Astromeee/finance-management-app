# Run Pocket Ledger on an iPhone

The iOS app uses the same React code and Supabase account as the web and Android apps. Google is the app's sign-in method; no Sign in with Apple button is required for this personal test build.

## One-time Mac and iPhone setup

1. Open Xcode once and accept its license and first-run component setup. If Xcode asks, install the iOS platform support.
2. In **Xcode → Settings → Accounts**, sign in with a personal Apple Account. A paid Apple Developer Program membership is not required for testing on your own device. This account signs the native app; it is separate from Pocket Ledger's Google login.
3. Connect your iPhone to the Mac, trust the computer, and enable **Developer Mode** on the iPhone if prompted. You can later use Xcode's wireless pairing if desired.

## Build and install

From the repository root:

```sh
npm install
npm run ios:sync
npm run ios:open
```

In Xcode, select the **App** target, open **Signing & Capabilities**, leave **Automatically manage signing** enabled, and choose your **Personal Team**. Select your connected iPhone as the run destination, then click **Run**. Xcode will sign, install, and open Pocket Ledger. If Xcode reports that the bundle identifier is unavailable for your team, choose a unique identifier in Xcode and also update `appId` in `capacitor.config.ts` before syncing again; preserve the `app.pocketledger.mobile` URL scheme for Google sign-in.

After any web-code change, run `npm run ios:sync` again before building in Xcode. The web app and Android project use the same source files and remain available.

## What to expect

- Google sign-in returns from the browser to the iPhone app through the `app.pocketledger.mobile` URL scheme. The web login continues to use its normal callback.
- Bill and daily reminders use iOS local notifications. Allow notifications when asked. Tapping a notification opens the app.
- Android home-screen widgets and Pixel Quick Tap are Android-specific; this first iPhone build opens the full app.
- An Android APK cannot install on an iPhone. A native iPhone build needs Xcode signing for that specific device, so this repository does not contain a universal installable IPA.
