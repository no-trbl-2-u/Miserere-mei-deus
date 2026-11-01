# iPhone beta (TestFlight)

The runbook for putting the game on iPhones: T's own phone and friends', through
TestFlight only. Brief: `plan/README.md`. IO1b follows
steps 1-5 once; IO1d follows steps 6-8 for the first build. Every later beta
round is steps 6-8 again.

**One build serves every tester.** There is no ad hoc channel and no device is
ever registered (`eas device:create` is never run). An ad hoc build installs
only on iPhones registered before it was built, so each new tester would cost
another build against the monthly Expo cap; a TestFlight build installs on any
iPhone a tester invites.

## What is already in the repo

- `app.json` `ios`: bundle id `com.axiomancer.mobile` (the Android package
  name, permanent once the App Store Connect record exists), iPhone only
  (`supportsTablet: false`; iPads run it in compatibility mode), and
  `config.usesNonExemptEncryption: false`, so App Store Connect stops asking
  the export-compliance question on every build. The app uses only HTTPS and
  the OS's own crypto.
- `eas.json`: the `beta` profile (iOS, `distribution: store`, `autoIncrement:
  buildNumber`) and `submit.beta.ios.ascAppId`. `cli.appVersionSource` is
  `remote`: EAS keeps the build numbers, so `app.json`'s `buildNumber: "1"` is
  only the seed and never needs a hand bump.
- `npm run deploy:ios-beta -w axiomancer-mobile`: the mobile verify gate, then
  `eas build --platform ios --profile beta --auto-submit` (loads `.env` through
  `scripts/with-env.mjs`, as `deploy:preview` does).

`ascAppId` holds a placeholder (`IO1B_FILLS_THE_APP_STORE_CONNECT_APP_ID`)
until step 3 below; a submit fails on it until then.

## 1. Enroll in the Apple Developer Program (once)

- Enroll as an **individual** at developer.apple.com/programs with T's Apple
  ID. An organization needs a D-U-N-S number and takes weeks. TestFlight shows
  T's legal name as the seller.
- The fee is yearly. Apple's approval can take a day or more; nothing below
  works until it lands.

No Mac is needed at any step: EAS builds iOS in the cloud.

## 2. Make the iOS credentials (once, on T's machine)

```bash
cd axiomancer-mobile
npx eas-cli@latest credentials -p ios
```

Pick the `beta` build profile, log in with the Apple ID when asked, and let EAS
generate the **distribution certificate** and the **App Store provisioning
profile**. Do not add devices and do not make an ad hoc profile. This is the
only step that uses T's Apple ID login; everything after it runs on an API key.

## 3. Create the App Store Connect app record (once)

In App Store Connect → Apps → **+** → New App: platform iOS, name "Miserere
Mei, Deus", bundle id `com.axiomancer.mobile`, a SKU of T's choosing. Then open
the app's **App Information** page and copy its **Apple ID** (a number). Hand it
to the session finishing IO1b, which writes it into `eas.json`
`submit.beta.ios.ascAppId` in place of the placeholder.

## 4. Make the App Store Connect API key (once)

App Store Connect → Users and Access → Integrations → App Store Connect API →
**Team Keys** → generate a key with the **App Manager** role. Download the
`.p8` file (it downloads once only) and note the **Key ID** and the **Issuer
ID** shown above the list.

Store it twice:

- **As GitHub repo secrets**, read by `preview-build.yml`'s submit (phase IO1c):

  ```bash
  gh secret set ASC_API_KEY_P8 < AuthKey_<KEYID>.p8
  gh secret set ASC_API_KEY_ID --body <KEYID>
  gh secret set ASC_API_ISSUER_ID --body <ISSUER-ID>
  ```

- **On EAS**, for a submit run from T's machine: `npx eas-cli@latest
  credentials -p ios` → App Store Connect: Manage your API Key → add the same
  key.

Then delete the local `.p8`. Never commit it or paste its contents anywhere.

## 5. The TestFlight groups (once)

In App Store Connect → the app → TestFlight:

- **Internal testing**: create a group and add T (an App Store Connect user).
  Internal testers get a build as soon as it finishes processing, with no Beta
  App Review.
- **External testing**: create a group named **Friends**. Turn on its **public
  link** once its first build has passed Beta App Review (step 7).

## 6. Build and submit

From GitHub Actions (after IO1c): dispatch `preview-build.yml` with `platform:
ios`, `profile: beta`, `submit: true`. Or from T's machine:

```bash
npm run deploy:ios-beta -w axiomancer-mobile
```

Either way EAS builds, bumps the build number, and uploads the build to App
Store Connect. Apple processes it for a few minutes to an hour.

## 7. Install it

- **T**: install the TestFlight app, accept the internal-group invite, install
  the build. Play to the end of one combat round and note anything that looks
  wrong only on iOS: safe areas around the notch and home indicator, fonts,
  haptics, the splash.
- **Friends**: add the build to the **Friends** group and submit it for **Beta
  App Review** (the first build of each version needs it; later builds of the
  same version usually pass at once). When it is approved, either add a friend
  by email to the group or send them the public link. They install the
  TestFlight app, open the link, and install.

Up to 10,000 external testers can join by public link.

## 8. The 90-day expiry

A TestFlight build stops launching **90 days** after upload. Run step 6 again
before then; testers get the new build in the TestFlight app. Each new build
counts once against the Expo build cap, however many testers there are.

## Friends' builds post no play data

A `beta` build carries no `EXPO_PUBLIC_PUZZLE_API_*` values (the workflow skips
them for `beta` as it does for `production`, phase IO1c), so neither the puzzle
API poster (BE1) nor the card play log (BE2) can send anything. Phase BE2's DoD
holds play logging back from anyone but T until BE1's playtester follow-up
(device ids, a privacy note) is plotted. Sentry crash reports still flow, as
they do from every build.

Friends' builds keep the dev menu, as the Android preview APK does, so a tester
can skip past a block: `app.config.ts` turns the dev tools off only for the
`production` profile.
