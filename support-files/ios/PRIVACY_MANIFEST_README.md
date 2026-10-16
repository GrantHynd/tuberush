# iOS Privacy Manifest (PrivacyInfo.xcprivacy)

## Overview

This document explains the privacy manifest implementation for TubeRush, required by Apple for App Store submission starting in 2024.

## What is a Privacy Manifest?

Apple requires apps to declare:
1. **Data collected by the app** - What user data is collected and why
2. **APIs accessed** - Which privacy-sensitive system APIs are used
3. **Third-party SDKs** - Which SDKs in the app require privacy declarations
4. **Tracking** - Whether the app tracks users across apps/websites

## Current Implementation

### Location: `/support-files/ios/PrivacyInfo.xcprivacy`

This file is automatically included in the iOS build via the Expo config plugin defined in `/plugins/withPrivacyManifest.js`.

The file is stored in `support-files/` instead of `ios/` because `npx expo prebuild` clears the `ios/` directory on each build.

## Third-Party SDKs Covered

### ✅ PostHog (posthog-react-native)
**Purpose:** Product analytics and feature flags  
**Data Types Declared:**
- Product Interaction Data (NSPrivacyCollectedDataTypeProductInteraction)
- Performance Data (NSPrivacyCollectedDataTypePerformanceData)

**Linked to User:** No  
**Used for Tracking:** No  
**Purpose:** Analytics and App Functionality

### ✅ RevenueCat (react-native-purchases)
**Purpose:** In-app purchase management  
**Data Types Declared:**
- Purchase History (NSPrivacyCollectedDataTypePurchaseHistory)
- User ID (NSPrivacyCollectedDataTypeUserID)

**Linked to User:** Yes (required for IAP)  
**Used for Tracking:** No  
**Purpose:** App Functionality

### ✅ Supabase (@supabase/supabase-js)
**Purpose:** Backend authentication and database  
**Data Types Declared:**
- User ID (NSPrivacyCollectedDataTypeUserID)

**Linked to User:** Yes (authentication)  
**Used for Tracking:** No  
**Purpose:** App Functionality

## System APIs Declared

### 1. UserDefaults (CA92.1)
**Reason:** Accessing user defaults to read and write small amounts of data  
**Usage:** Storing user preferences and app state

### 2. System Boot Time (35F9.1)
**Reason:** Measuring time or duration  
**Usage:** Analytics and performance monitoring

### 3. File Timestamp (C617.1)
**Reason:** Accessing file modification dates  
**Usage:** Cache management and data synchronization

### 4. Disk Space (E174.1)
**Reason:** Displaying disk space to user or for cache management  
**Usage:** Managing local storage and offline data

## Tracking Declaration

**NSPrivacyTracking:** `false`

The app does NOT engage in tracking as defined by Apple (linking user data from this app with data from other companies' apps or websites for targeted advertising or advertising measurement).

## App Store Connect Requirements

This privacy manifest satisfies the **code-level** requirements. You must also complete the **Privacy Nutrition Label** in App Store Connect, which describes the same information in a user-facing format.

### Steps to Complete:
1. Go to App Store Connect → Your App → App Privacy
2. Answer questions about data collection
3. The answers should match what's declared in this manifest
4. Key sections:
   - **Contact Info:** Email (for authentication)
   - **User Content:** Game data, saved progress
   - **Identifiers:** User ID (for authentication and IAP)
   - **Purchases:** Purchase history (for IAP)
   - **Usage Data:** Product interaction, analytics

## Apple Resources

- [Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Third-Party SDK List](https://developer.apple.com/support/third-party-SDK-requirements/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [API Reason Codes](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)

## Sentry Note

The Linear issue mentioned Sentry, but it is **not currently installed** in the project. If Sentry is added in the future, you will need to:

1. Add Sentry privacy manifest entries (usually handled by `@sentry/react-native` automatically)
2. Update this manifest to include error tracking data types
3. Add NSPrivacyCollectedDataTypeCrashData declarations

## Validation

To validate this manifest:

1. **Build the iOS app:**
   ```bash
   npx expo prebuild --platform ios
   npx expo run:ios --configuration Release
   ```

2. **Archive and upload to TestFlight**

3. **Check for warnings in App Store Connect:**
   - Navigate to the build in TestFlight
   - Look for "Privacy Manifest" warnings
   - Apple will flag any missing or incomplete entries

4. **Submit for review:**
   - Apps with missing privacy manifests are automatically rejected
   - Proper manifests pass Apple's automated checks

## Maintenance

When adding new third-party SDKs:

1. Check [Apple's SDK list](https://developer.apple.com/support/third-party-SDK-requirements/)
2. Check the SDK's documentation for required privacy entries
3. Update `/support-files/ios/PrivacyInfo.xcprivacy` with new declarations
4. Update this README

## Questions?

For privacy-related questions:
- Review [Apple's App Privacy Guidelines](https://developer.apple.com/app-store/app-privacy-details/)
- Check individual SDK documentation
- Test with a TestFlight build before final submission
