# Store Setup Guide

## Prerequisites
- EAS CLI installed and authenticated
- Apple Developer Account (for iOS)
- Google Play Developer Account (for Android)  
- Production signing certificates configured

## App Store Connect Setup (iOS)

### 1. Create App Record
1. Log into [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to "My Apps" → "+" → "New App"
3. Fill in app information:
   - **Platform**: iOS
   - **Name**: Axiomancer Mobile
   - **Language**: English (U.S.)
   - **Bundle ID**: com.axiomancer.mobile (must match app.json)
   - **SKU**: axiomancer-mobile-ios (internal identifier)

### 2. App Information
- **Name**: Axiomancer Mobile
- **Subtitle**: Dark Gothic TTRPG Companion
- **Category**: Games > Role Playing
- **Description**: [Use content from store-assets/metadata/app-description.md]
- **Keywords**: [Use keywords from app-description.md]
- **Support URL**: [Project repository or support site]
- **Privacy Policy URL**: [Host privacy-policy.md content]

### 3. Pricing and Availability
- **Price**: Free
- **Availability**: All territories (or specific regions as needed)

### 4. App Review Information
- **Contact Information**: Development team contact details
- **Review Notes**: "This is a single-player tabletop RPG companion app with turn-based combat mechanics. No online features or user-generated content."

### 5. Version Information
- **Version Number**: 1.0.0 (matches app.json)
- **Release Type**: Manual release after approval
- **Screenshots**: Upload from store-assets/ios/screenshots/

## Google Play Console Setup (Android)

### 1. Create App
1. Log into [Google Play Console](https://play.google.com/console)
2. "Create app" → Fill in details:
   - **App name**: Axiomancer Mobile
   - **Default language**: English (United States)
   - **App or game**: Game
   - **Free or paid**: Free

### 2. App Details
- **Short description**: [80-char version from app-description.md]
- **Full description**: [Full description from app-description.md]
- **App icon**: 512x512 version of app icon
- **Feature graphic**: 1024x500 promotional banner (create from app branding)
- **Screenshots**: Upload from store-assets/android/screenshots/

### 3. Store Listing
- **Category**: Role Playing
- **Tags**: RPG, Turn-based, Strategy, Offline, Single-player
- **Contact details**: Developer email and website

### 4. Content Rating
Complete questionnaire focusing on:
- Simulated gambling: No
- Violence: Mild (fantasy combat)
- Mature/suggestive themes: No
- User-generated content: No
- Social features: No
- Data collection: None (local storage only)

### 5. App Content
- **Privacy Policy**: [Link to hosted privacy policy]
- **App category**: Games
- **Target audience**: Everyone / Teen (depending on content rating)
- **Data safety**: No data collected, no data shared

## EAS Build Integration

### 1. Production Build Setup
Ensure `eas.json` has production profiles:
```json
{
  "build": {
    "production": {
      "ios": {
        "distribution": "store",
        "autoIncrement": "buildNumber"
      },
      "android": {
        "distribution": "store", 
        "autoIncrement": "versionCode",
        "buildType": "app-bundle"
      }
    }
  }
}
```

The committed `eas.json` `production` profile is the tester APK, not a store
build: Android is a sideloadable APK with DEV TOOLS off, and it posts the
testers' play (stamped `human`) when `preview-build` baked in the puzzle API
URL and token, which it does for `platform: android` only. `preview-build`
refuses `platform: all` with `production`, so the token never reaches an App
Store build, and the `beta` iOS build posts nothing. The Data safety answer
above is for a store listing that carries no token.

### 2. Building for Stores
```bash
# Build for both platforms (by hand; preview-build refuses this for production)
eas build --platform all --profile production

# Build iOS only  
eas build --platform ios --profile production

# Build Android only
eas build --platform android --profile production
```

### 3. Uploading Builds

#### iOS Upload
1. Download .ipa from EAS Build dashboard
2. Use Xcode or Transporter to upload to App Store Connect
3. Wait for processing (can take 10-60 minutes)
4. Select build in App Store Connect for review submission

#### Android Upload  
1. Download .aab from EAS Build dashboard
2. Upload to Google Play Console Release → Production track
3. Complete release notes and rollout configuration
4. Submit for review

## Internal Testing Setup

### TestFlight (iOS)
1. In App Store Connect, go to TestFlight tab
2. Create "Internal Testing" group
3. Add team members by email
4. Configure automatic build distribution
5. Upload build and assign to internal group
6. Testers receive invitation emails automatically

### Play Internal Track (Android)
1. In Google Play Console, go to Release → Testing → Internal testing
2. Create new release with uploaded AAB
3. Add internal testers by email or Google Group
4. Configure release notes for testers
5. Roll out to internal track (100% when ready)
6. Share testing link with team

## Environment Variables and Secrets

### Required EAS Secrets
```bash
# Set these via `eas secret:create`
eas secret:create --scope project --name EXPO_TOKEN --value <token>
eas secret:create --scope account --name APPLE_TEAM_ID --value <team-id>
eas secret:create --scope account --name APPLE_APP_STORE_CONNECT_API_KEY --value <api-key>
```

### Local Environment (.env)
```bash
# For deploy gate checking
EXPO_TOKEN=<expo-token>
EAS_PROJECT_ID=9c0490bb-d0b7-4ec7-b0f5-c6373fed524c
```

## Common Issues and Solutions

### iOS Issues
- **Certificate Problems**: Ensure Apple Developer account has valid certificates
- **Provisioning**: Check Bundle ID matches across Xcode, App Store Connect, and app.json
- **Review Rejection**: Address App Store Review Guidelines, especially for gaming content

### Android Issues
- **API Level**: Ensure target API meets current Google Play requirements
- **App Bundle**: Use AAB format for production uploads, not APK
- **Permissions**: Justify all requested permissions in store listing

### EAS Build Issues
- **Authentication**: Verify `eas login` and credentials are current
- **Configuration**: Check eas.json syntax and profile configuration
- **Dependencies**: Ensure all native dependencies are compatible with EAS Build

## Monitoring and Maintenance

### App Store Connect
- Monitor app status and review feedback
- Track download and crash analytics (if enabled)
- Respond to user reviews appropriately

### Google Play Console  
- Monitor release dashboard for errors and ANRs
- Review user feedback and crash reports
- Maintain content rating and policy compliance

### EAS Build Dashboard
- Monitor build success/failure rates
- Keep track of build artifacts and distribution
- Maintain production certificate validity

## Support Resources
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Expo Forums](https://forums.expo.dev/) for EAS-specific questions