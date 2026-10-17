# TubeRush 🎮

A daily word game app for British commuters, built with React Native/Expo, offline-first architecture, premium subscriptions, and cloud sync.

## Features

✅ **Two Games**
- Connections (Free) — find groups of 4 related items
- Crossword Puzzles (Premium) — daily 9x9 crossword

✅ **Custom Puzzles**
- Play Connections/Crossword puzzles loaded from a `custom_puzzles` table outside the daily flow
- Score saved separately from the daily leaderboard; leaderboard UI hidden for these sessions

✅ **Leaderboards**
- Weekly leaderboards by game and by London borough/UK city
- Personal rank, podium, and borough breakdown views

✅ **Automated Daily Games**
- Daily puzzles generated nightly by two AWS Lambdas (`lambda/generate-connections`, `lambda/generate-crossword`)
- Crossword grids are filled by a seeded solver from a word bank + common British word list; Claude writes the clues
- A Supabase edge function (`schedule-daily-games`) remains for manual/edge-triggered generation

✅ **Premium Membership**
- RevenueCat subscriptions (Monthly & Yearly)
- TubeRush Pro entitlement
- Unlock exclusive games, Customer Center for management

✅ **Offline-First**
- Play games without internet
- Automatic state persistence
- Background sync when online
- Conflict resolution

✅ **User Authentication**
- Email/password sign-up, forgot/reset password flow
- Secure session management
- Profile management

✅ **Analytics**
- PostHog product analytics via `hooks/useAnalytics.ts`

✅ **Cloud Sync**
- Real-time game state synchronization
- Multi-device support
- Automatic conflict resolution

## Tech Stack

- **Frontend**: React Native with Expo (SDK 54), Expo Router
- **Language**: TypeScript
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Scheduled Jobs**: AWS Lambda (SAM) for daily puzzle generation
- **Payments**: RevenueCat (react-native-purchases)
- **Analytics**: PostHog
- **Offline Storage**: AsyncStorage
- **Network Detection**: NetInfo
- **Testing**: Jest (unit/integration), Maestro (E2E)

## Project Structure

```
tuberush-v2/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation: index, profile, stats, trophy
│   ├── games/               # connections-list, crossword-list, play-connections, play-crossword
│   ├── leaderboard/         # boroughs.tsx, game.tsx
│   ├── auth.tsx / forgot-password.tsx / reset-password.tsx
│   └── subscribe.tsx        # Subscription modal
├── components/
│   ├── games/               # Connections, Crossword, grid previews, error boundary, history list
│   ├── home/                # PuzzleCard, SectionHeader, StatCard
│   ├── leaderboard/         # Avatar, BoroughList, Podium, RankedList, WeekNavigator, etc.
│   └── ui/                  # GameCard, GameTypeBadge, PremiumBadge, SyncIndicator, etc.
├── hooks/                    # useAnalytics, useGameHistory, useLeaderboardOverview,
│                             # useBoroughRank, useCrosswordTimer, usePuzzleCarousel, ...
├── lib/                      # supabase-client, custom-puzzles, daily-games, leaderboard,
│                             # offline-sync-manager, storage-manager, posthog, revenuecat
├── stores/                   # Zustand: auth-store, game-store
├── constants/                 # Games, ConnectionsData, CrosswordData, Boroughs, UKCities, theme
├── types/                    # TypeScript types (game.ts, database.types.ts in lib/)
├── lambda/generate-connections/  # AWS Lambda (SAM): nightly Connections puzzle
├── lambda/generate-crossword/    # AWS Lambda (SAM): nightly crossword (grid solver + Claude clues)
└── supabase/                 # Backend
    ├── migrations/          # 12 migrations
    ├── functions/           # schedule-daily-games
    ├── schema.sql / seed.sql
    └── README.md            # Setup guide
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a project at https://supabase.com
   - Run the SQL schema from `supabase/schema.sql`
   - Follow the guide in `supabase/README.md`

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your credentials:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_REVENUECAT_API_KEY` (from RevenueCat dashboard)
   - `EXPO_PUBLIC_POSTHOG_API_KEY` (from PostHog project settings)

   The `schedule-daily-games` edge function/Lambda also needs its own secrets (`ANTHROPIC_API_KEY`, `ANTHROPIC_DAILY_PUZZLE_SKILL_ID`, etc.) — see `.env.example` for the full list.

4. **Start the development server**
   ```bash
   npm run start
   ```

5. **Run on device/simulator**
   - iOS: Press `i` or `npm run ios`
   - Android: Press `a` or `npm run android`
   - Web: Press `w` or `npm run web`

## How It Works

### Offline-First Architecture

1. **Local Storage**: All game states are saved to AsyncStorage
2. **Sync Queue**: Offline operations are queued for later sync
3. **Network Detection**: NetInfo monitors connection status
4. **Automatic Sync**: When online, pending operations sync to Supabase
5. **Conflict Resolution**: Last-write-wins strategy for conflicts

### Game State Management

```typescript
// Game state is automatically saved on every move
const handleMove = async (index: number) => {
  // Update local state
  const newState = calculateNewState(index);
  
  // Save to local storage (immediate)
  await StorageManager.saveGameState(gameId, newState);
  
  // Sync to server (when online)
  await offlineSyncManager.saveGameState(newState);
};
```

### Premium Access Control

```typescript
// Premium features are gated
if (game.isPremium && !user?.isPremium) {
  router.push('/subscribe');
  return;
}
```

## Features in Detail

### Authentication
- Email/password signup and login
- Forgot/reset password flow
- Automatic session persistence
- Profile auto-creation on signup

### Games
- **Connections**: Find groups of 4 related items (free)
- **Crossword**: Premium 9x9 puzzle game with clue display and timer
- **Custom Puzzles**: Either game type can also be loaded by ID from the `custom_puzzles` table (e.g. shared or AI-generated puzzles), scored separately from the daily leaderboard

### Leaderboards
- Weekly leaderboard per game, plus borough/city ranking views
- Personal summary card and podium UI

### Daily Puzzle Generation
- `lambda/generate-connections` and `lambda/generate-crossword` (AWS Lambda, SAM-deployed via `template.yaml`) run nightly at 02:00 / 02:30 UTC
- Crossword: a solver fills the day's template so every crossing is valid, then Claude writes the title and clues (see `lambda/generate-crossword/WORD_LIST.md`)
- `supabase/functions/schedule-daily-games` provides the same generation logic as an edge function

### Subscriptions
- RevenueCat-powered subscriptions (Monthly & Yearly)
- TubeRush Pro entitlement
- RevenueCat Paywall UI, Customer Center for subscription management

### Sync System
- Optimistic updates for instant feedback
- Background synchronization
- Visual sync status indicators
- Manual sync option

## Configuration

### Supabase
See `supabase/README.md` for detailed setup instructions.

### RevenueCat
1. Create a project at https://app.revenuecat.com
2. Configure products (Monthly, Yearly) and entitlement "TubeRush Pro"
3. Create an Offering and Paywall in the dashboard
4. Add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`

## Development

### Adding a New Game

1. Create game component in `components/games/`
2. Add game config to `constants/Games.ts` (id, name, description, `isPremium`, icon, colour)
3. Create list + play screens in `app/games/`
4. Update type definitions in `types/game.ts`
5. If it should support daily generation, extend `lib/daily-games.ts` and the `schedule-daily-games` function/Lambda

### Modifying Sync Logic

The sync manager is in `lib/offline-sync-manager.ts`. Key methods:
- `saveGameState()`: Save with optimistic update
- `syncPendingOperations()`: Process sync queue
- `handleConflict()`: Resolve sync conflicts

## Testing

### Automated Testing

We use **Jest** for unit/integration testing and **Maestro** for E2E testing.

#### Unit & Integration Tests (Jest)

These tests run in a Node environment and verify component logic and navigation flows.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

#### End-to-End Tests (Maestro)

These tests run against a real simulator/emulator and verify the app from a user's perspective.

1. Install Maestro: `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. Ensure your simulator is running.
3. Run the flow:
   ```bash
   maestro test .maestro/flow.yaml
   ```

See `.maestro/README.md` for more details.

### Offline Mode Testing
1. Enable airplane mode on device
2. Play games and make moves
3. Close and reopen app (verify persistence)
4. Disable airplane mode (verify sync)

### Premium Flow Testing
1. Create account
2. Try accessing premium game (should prompt)
3. Complete subscription via RevenueCat Paywall (use Sandbox/Test Store)
4. Verify premium access granted; use Customer Center to manage

## Deployment

### iOS
```bash
eas build --platform ios
eas submit --platform ios
```

### Android
```bash
eas build --platform android
eas submit --platform android
```

## Troubleshooting

### Sync Issues
- Check network connection
- Verify Supabase credentials
- Check console for sync errors
- Try manual sync in profile

### Authentication Issues
- Clear app data and retry
- Check Supabase dashboard for user
- Verify email confirmation

### Payment Issues
- Ensure using RevenueCat Test Store or platform Sandbox for testing
- Verify products (Monthly, Yearly) and entitlement "TubeRush Pro" in RevenueCat dashboard
- Check that a current Offering and Paywall are configured

## Future Enhancements

- [ ] Additional games
- [ ] Multiplayer support
- [ ] Social features
- [ ] Push notifications

## License

MIT

## Support

For issues or questions, contact support or create an issue in the repository.
