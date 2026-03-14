# Build Verification Baseline (TUB-194)

Post-cleanup verification baseline for TubeRush v2. Use this document to compare bundle sizes and verify build health after future changes.

## Verification Checklist

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `npx expo export --clear --source-maps` completes successfully
- [ ] Local Expo build (`npx expo run:ios`) completes successfully
- [ ] App launches on simulator with no console errors for missing modules/assets
- [ ] All remaining screens are reachable (see Screen Walkthrough below)

## Bundle Size Baseline (Post-Cleanup)

**Recorded:** 2025-03-14

| Asset | Size |
|-------|------|
| iOS Hermes bundle (`.hbc`) | 2.66 MB |
| Source map (`.hbc.map`) | 8.89 MB |
| Total `dist/` folder | 11 MB |

### How to Record

```bash
# Flush Metro cache first (recommended)
npx expo start --clear  # Ctrl+C after cache clears, or use different port

# Export with source maps
npx expo export --clear --source-maps --platform ios

# Measure
du -sh dist
du -sh dist/_expo/static/js/ios/*.hbc
```

## Remaining Screens (Manual Walkthrough)

Verify each screen is reachable after app launch:

| Screen | Route | How to Reach |
|--------|-------|--------------|
| Home | `/(tabs)` | Default tab |
| Profile | `/(tabs)/profile` | Profile tab |
| Auth (Sign In) | `/auth` | "Sign In / Register" on home (when logged out) |
| Subscribe | `/subscribe` | Tap premium game when logged in, non-premium |
| Connections | `/games/play-connections` | Tap Connections card on home |
| Crossword | `/games/play-crossword` | Tap Crossword card on home (premium) |

## Quick Verification Commands

```bash
# Full verification (TypeScript + export + size report)
./scripts/verify-build.sh

# Or step-by-step:
npm run type-check
npx expo export --clear --source-maps --platform ios
```

## Out of Scope (per TUB-194)

- Game logic validation
- Auth flow validation (see `docs/AUTHENTICATION_TESTING.md`)
