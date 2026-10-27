# E2E Testing with Maestro

Flows in this directory run against a dev build with bundle id `com.tuberush.v2`. Each flow sets that `appId` itself.

## Prerequisites

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. Build the app:
   - iOS Simulator: `npx expo run:ios`
   - Android Emulator: `npx expo run:android`

## Running

Guest flow (no account):

```bash
maestro test .maestro/01_guest_start.yaml
```

Signed-in flows take their accounts from the environment:

- `02_interchange_play.yaml` and `03_crossword_paywall.yaml` use `MAESTRO_TEST_EMAIL` / `MAESTRO_TEST_PASSWORD` (free account)
- `04_crossword_play.yaml` uses `MAESTRO_PREMIUM_EMAIL` / `MAESTRO_PREMIUM_PASSWORD`

```bash
maestro test -e MAESTRO_TEST_EMAIL=… -e MAESTRO_TEST_PASSWORD=… .maestro/02_interchange_play.yaml
```

EAS (`.eas/workflows/e2e-tests.yml`) runs this directory and skips the `android-only` tag. The GitHub Actions Maestro job is deprecated and runs only `01_guest_start.yaml`.

## Flows

- `01_guest_start.yaml` (`critical`): logged-out launch. Home shows the today hero; tapping Connections opens the auth screen.
- `02_interchange_play.yaml` (`critical`): signs in with the free account and submits a Connections guess. If today's puzzle is already finished, it stops on the finished board.
- `03_crossword_paywall.yaml` (`critical`): free account taps Crossword and gets the RevenueCat paywall. The old subscribe screen is not shown.
- `04_crossword_play.yaml` (`critical`, `premium`): premium account opens today's crossword grid.
- `offline_airplane_flow.yaml` (`android-only`): local Android only. Signs in with `TEST_EMAIL` / `TEST_PASSWORD`, enables airplane mode, cold-starts, plays Connections from the cache, then reconnects and checks that Profile shows Synced. `setAirplaneMode` is Android-only, so CI does not run it.
- `subflows/sign_in.yaml`: shared sign-in from a fresh launch. Callers pass `EMAIL` and `PASSWORD`.

[Maestro Documentation](https://maestro.mobile.dev)
