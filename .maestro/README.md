# E2E Testing with Maestro

This directory contains Maestro flows for automated E2E testing of the TubeRush app.

## Prerequisites

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
2. Build your app (recommended):
   - For iOS Simulator: `npx expo run:ios`
   - For Android Emulator: `npx expo run:android`
   - Or build standalone with EAS: `eas build --profile development --platform ios`

## Running Tests

1. Ensure your simulator/emulator is running.
2. Update the `appId` in `.maestro/flow.yaml` to match your app's bundle identifier (e.g., `com.tuberush.v2` or `host.exp.exponent` if testing inside Expo Go).
3. Run the flow:
   ```bash
   maestro test .maestro/flow.yaml
   ```

## Flows

- `flow.yaml`: Basic smoke test (Launch -> Home -> Game -> Auth).

For more info, visit [Maestro Documentation](https://maestro.mobile.dev).
