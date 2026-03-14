# TubeRush 🎮

A React Native game platform with offline-first architecture, premium subscriptions, and cloud synchronization.

## Features

✅ **Two Games**
- Connections (Free)
- Crossword Puzzles (Premium)

✅ **Premium Membership**
- Stripe-powered subscriptions
- Unlock exclusive games
- Priority support

✅ **Offline-First**
- Play games without internet
- Automatic state persistence
- Background sync when online
- Conflict resolution

✅ **User Authentication**
- Email/password sign-up
- Secure session management
- Profile management

✅ **Cloud Sync**
- Real-time game state synchronization
- Multi-device support
- Automatic conflict resolution

## Tech Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Payments**: Stripe
- **Offline Storage**: AsyncStorage
- **Network Detection**: NetInfo

## Project Structure

```
tuberush-v2/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation
│   │   ├── index.tsx        # Home screen
│   │   └── profile.tsx      # Profile screen
│   ├── games/               # Game screens
│   │   ├── play-tictactoe.tsx
│   │   └── play-crossword.tsx
│   ├── auth.tsx             # Authentication modal
│   └── subscribe.tsx        # Subscription modal
├── components/
│   ├── games/               # Game components
│   │   ├── TicTacToe.tsx
│   │   └── Crossword.tsx
│   └── ui/                  # UI components
│       ├── GameCard.tsx
│       ├── SyncIndicator.tsx
│       └── PremiumBadge.tsx
├── lib/                     # Core utilities
│   ├── supabase-client.ts
│   ├── storage-manager.ts
│   └── offline-sync-manager.ts
├── stores/                  # Zustand stores
│   ├── auth-store.ts
│   └── game-store.ts
├── types/                   # TypeScript types
│   └── game.ts
├── constants/               # App constants
│   └── Games.ts
└── supabase/               # Backend
    ├── schema.sql          # Database schema
    ├── functions/          # Edge functions
    └── README.md           # Setup guide
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- Supabase account
- Stripe account (for payments)

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
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

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
- Automatic session persistence
- Profile auto-creation on signup

### Games
- **Connections**: Find groups of 4 related items
- **Crossword**: Premium puzzle game with clue display

### Subscriptions
- $4.99/month premium membership
- Stripe payment integration
- Webhook-based subscription management

### Sync System
- Optimistic updates for instant feedback
- Background synchronization
- Visual sync status indicators
- Manual sync option

## Configuration

### Supabase
See `supabase/README.md` for detailed setup instructions.

### Stripe
1. Create products in Stripe Dashboard
2. Set up webhook endpoint
3. Configure environment variables
4. Test with test mode cards

## Development

### Adding a New Game

1. Create game component in `components/games/`
2. Add game config to `constants/Games.ts`
3. Create play screen in `app/games/`
4. Update type definitions in `types/game.ts`

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
3. Complete subscription (use Stripe test cards)
4. Verify premium access granted

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
- Ensure using Stripe test mode
- Check webhook configuration
- Verify API keys in environment

## Future Enhancements

- [ ] Additional games
- [ ] Multiplayer support
- [ ] Leaderboards
- [ ] Social features
- [ ] Push notifications
- [ ] Analytics

## License

MIT

## Support

For issues or questions, contact support or create an issue in the repository.
