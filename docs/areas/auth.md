# Auth

Email and password accounts live in Supabase Auth. The signed-in player, their profile, and their premium flag live in the Zustand store `stores/auth-store.ts`.

## What the player can do

- Create an account and sign in (`app/auth.tsx`)
- Request a reset email (`app/forgot-password.tsx`) and set a new password (`app/reset-password.tsx`)
- Stay signed in across launches
- Delete the account from Settings

`app/_layout.tsx` calls `checkSession` on launch. The same layout reads auth links such as `tuberushv2://#access_token=...`. A `type=recovery` link opens the reset-password screen and sets `pendingPasswordReset`. Any other valid link restores the session.

## How a user object is built

Sign-in and session restore do the same three steps:

1. Log the Supabase user into RevenueCat (native only) so purchases follow the account.
2. Read the `profiles` row.
3. Ask RevenueCat whether the **TubeRush Pro** entitlement is active.

`lib/profile.ts` turns that row into the in-memory user:

- A username comes from the profile.
- A borough-only row from before cities existed is treated as London.
- A borough that is not in `constants/Boroughs.ts` is dropped.
- `isPremium` is the RevenueCat result. Web is always free. A failed lookup is free, not a crash.

Premium is not stored on the profile. `refreshPremiumStatusFromRevenueCat` re-reads it after a purchase. See `lib/revenuecat.ts`.

## Side effects

Signing in identifies the player in PostHog and Sentry. Signing out, and deleting an account, clears both and logs out of RevenueCat.

`deleteAccount` calls the `delete-account` edge function, then clears local game data even if RevenueCat or the now-dead session rejects logout. Deleting an account does not cancel an App Store or Play subscription. Settings says so before the player confirms.

## Where to change things

| Change | Start here |
| --- | --- |
| Sign-in or profile mapping | `stores/auth-store.ts`, `lib/profile.ts` |
| Premium entitlement | `lib/revenuecat.ts` |
| Password reset links | `app/_layout.tsx`, `constants/Games.ts` (`APP_SCHEME`) |
| Account deletion | `supabase/functions/delete-account`, `deleteAccount` in the auth store |
