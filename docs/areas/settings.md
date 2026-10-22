# Settings

Settings is the Profile tab: `app/(tabs)/profile.tsx`. The header title is Settings. Signed-out players get a short explanation and a button to `app/auth.tsx`.

## What is on the screen

- Email, and an avatar initial taken from that email
- Membership: **1st Class** when `user.isPremium` is true, otherwise **Free**
- City/Town, stored on `profiles` via `updateProfile`
- Sync status, with a button that runs `syncNow` on the game store
- Sign out
- Delete account
- The app version from Expo config

Membership and premium purchases are not edited here. Subscribe is the modal at `app/subscribe.tsx`, opened when a free player hits a premium game. RevenueCat remains the source of truth; this screen only displays the flag.

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
