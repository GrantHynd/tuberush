# Settings

Settings is the Profile tab: `app/(tabs)/profile.tsx`. The header title is Profile. Signed-out players get a short explanation and a button to `app/auth.tsx`.

## What is on the screen

- Display name, and an avatar initial taken from that name (`getOwnDisplayName` / `getAvatarInitial`). With no chosen name this is `Commuter` plus a stable suffix, never the email
- Email, read-only
- A badge: **1st Class** when `user.isPremium` is true, otherwise **Free**. There is no Membership row
- City/Town, stored on `profiles` via `updateProfile`
- Sync status, with a button that runs `syncNow` on the game store
- Sign out
- Delete account
- The app version from Expo config

Premium is not edited here. See 1st Class on this screen calls `openPaywall('profile')`. A free player who opens a premium game also goes through `openPaywall` (`lib/paywall.ts`), which presents the RevenueCat paywall. `app/subscribe.tsx` is only the subscription-details modal, linked from here as "Subscription details & terms". A 1st Class player gets Manage subscription, which opens the store subscriptions page. RevenueCat remains the source of truth; this screen only displays the flag.

## Location

Choosing a city opens `components/ui/SearchSelect.tsx` over `constants/UKCities.ts`. London then asks for a borough from `constants/Boroughs.ts`. Any other city is saved with a null borough.

The row text comes from `formatSettingsLocation` in `lib/profile.ts`:

- no city → `Not set`
- London with a borough → `London, Camden`
- anywhere else → the city name

That string is for Settings. Leaderboards use `getLocationDisplay`, which prints the borough alone for London players.

## Account actions

Sign out clears the auth store and returns home. It also logs out of RevenueCat and resets analytics identity. See [Auth](auth.md).

Delete account asks for confirmation. Premium players get a link to App Store or Play subscriptions first, because deleting the TubeRush account does not cancel the store subscription. The button stays disabled while the request is in flight.
