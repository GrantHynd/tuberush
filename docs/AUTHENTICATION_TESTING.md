# Authentication Testing Documentation

This document outlines the authentication setup for TubeRush v2 and provides comprehensive testing procedures for the authentication flow.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication Setup](#authentication-setup)
- [E2E Testing](#e2e-testing)
- [Running Tests](#running-tests)
- [Recording Test Results](#recording-test-results)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Technology Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: Zustand
- **E2E Testing**: Maestro
- **Unit Testing**: Jest + React Native Testing Library

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Auth UI (app/auth.tsx)                         │
│  - Email/Password Input                                     │
│  - Sign Up / Sign In Toggle                                 │
│  - Form Validation                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Auth Store (stores/auth-store.ts)                   │
│  - signUp(email, password)                                  │
│  - signIn(email, password)                                  │
│  - signOut()                                                │
│  - checkSession()                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│       Supabase Client (lib/supabase-client.ts)              │
│  - Auth Configuration                                       │
│  - AsyncStorage for Session Persistence                     │
│  - Auto Token Refresh                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Backend                               │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │  Auth Service  │  │  PostgreSQL    │                    │
│  │  - User Mgmt   │  │  - Profiles    │                    │
│  │  - JWT Tokens  │  │  - Game States │                    │
│  │  - Sessions    │  │  - RLS         │                    │
│  └────────────────┘  └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Setup

### 1. Supabase Configuration

**Location**: `lib/supabase-client.ts`

**Environment Variables Required**:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anonymous key

**Key Features**:
- **Session Persistence**: Uses AsyncStorage to persist sessions across app restarts
- **Auto Token Refresh**: Automatically refreshes JWT tokens before expiration
- **URL Polyfill**: Ensures compatibility with React Native environment

```typescript
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
```

### 2. Database Schema

**Location**: `supabase/schema.sql`

#### Profiles Table
Stores user profile information and premium status.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  borough TEXT,
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Auto Profile Creation
A database trigger automatically creates a profile when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_premium)
  VALUES (NEW.id, NEW.email, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Row Level Security (RLS)
All tables have RLS enabled to ensure users can only access their own data:

- Users can view/update their own profile
- Users can view/insert/update/delete their own game states
- Users can view their own subscriptions

### 3. Auth Store (State Management)

**Location**: `stores/auth-store.ts`

The auth store manages authentication state using Zustand:

**State**:
```typescript
{
  user: User | null,
  session: any,
  loading: boolean
}
```

**Key Methods**:

#### `signUp(email, password)`
- Creates a new user account via Supabase Auth
- Profile is automatically created by database trigger
- Sets user state with default values (isPremium: false)
- May show alert for email verification

#### `signIn(email, password)`
- Authenticates user with Supabase
- Fetches profile data from `profiles` table
- Updates state with user info and premium status
- Persists session in AsyncStorage

#### `signOut()`
- Signs out from Supabase Auth
- Clears user and session state
- Removes session from AsyncStorage

#### `checkSession()`
- Called on app startup
- Validates existing session
- Fetches fresh profile data
- Restores user state if valid session exists

#### `refreshPremiumStatus()`
- Polls profile table for premium status updates
- Used after subscription flow completes

### 4. UI Components

#### Auth Screen (`app/auth.tsx`)

**Features**:
- Toggle between Sign In / Sign Up modes
- Email and password inputs
- Form validation
- Loading states
- Error handling via alerts
- Modal presentation

**TestIDs** (for E2E testing):
- `auth-email-input` - Email input field
- `auth-password-input` - Password input field
- `auth-submit-button` - Sign In / Sign Up button
- `auth-switch-button` - Toggle between modes

#### Profile Screen (`app/(tabs)/profile.tsx`)

**Features**:
- Displays user email and premium status
- Borough selection
- Sign out functionality
- Empty state when not logged in

**TestIDs**:
- `profile-sign-out-button` - Sign out button

---

## E2E Testing

### Testing Strategy

The authentication flow is tested using **Maestro**, a mobile UI testing framework that simulates real user interactions.

### Test Coverage

#### Auth Flow Test (`.maestro/auth_flow.yaml`)

This comprehensive test covers the complete authentication lifecycle:

**1. Initial State Verification**
- ✅ Verifies app loads correctly
- ✅ Confirms user is logged out
- ✅ Checks "Sign In / Register" button is visible

**2. Sign Up Flow**
- ✅ Navigates to auth screen
- ✅ Switches to sign-up mode
- ✅ Enters email and password
- ✅ Submits form
- ✅ Handles success alert
- ✅ Verifies user is logged in
- ✅ Confirms home screen updates

**3. Profile Verification**
- ✅ Navigates to profile tab
- ✅ Verifies user email is displayed
- ✅ Confirms membership status (Free)

**4. Sign Out Flow**
- ✅ Taps sign out button
- ✅ Confirms sign out in alert
- ✅ Verifies user is logged out
- ✅ Checks profile shows empty state
- ✅ Confirms home screen updates

**5. Sign In Flow**
- ✅ Navigates to auth screen
- ✅ Enters same credentials
- ✅ Submits form
- ✅ Verifies user is logged in again

**6. Session Persistence**
- ✅ Confirms profile data loads correctly
- ✅ Verifies session state is maintained

**7. Authenticated Game Access**
- ✅ Tests access to free game while authenticated
- ✅ Confirms no auth modal appears

### Test Data

The test uses dynamic test emails to avoid conflicts:
```
test_user_${MAESTRO_ITERATION}@example.com
```

Each test run increments `MAESTRO_ITERATION`, ensuring unique email addresses.

---

## Running Tests

### Prerequisites

1. **Supabase Project Setup**
   - Create a Supabase project
   - Run the schema from `supabase/schema.sql`
   - Apply the migration from `supabase/migrations/update_schema.sql`
   - Disable email verification for test accounts (optional, for easier testing)

2. **Environment Variables**
   Create a `.env` file in the project root:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Install Maestro**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$HOME/.maestro/bin:$PATH"
   ```

### Running Unit Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Running E2E Tests Locally

#### iOS

1. **Build the app**:
   ```bash
   npx expo prebuild --platform ios --clean
   cd ios && pod install && cd ..
   ```

2. **Start Metro bundler**:
   ```bash
   npm start
   ```

3. **Open simulator**:
   ```bash
   open -a Simulator
   ```

4. **Build and install app**:
   ```bash
   cd ios
   xcodebuild -workspace tuberushv2.xcworkspace \
     -scheme tuberushv2 \
     -configuration Release \
     -sdk iphonesimulator \
     -destination 'platform=iOS Simulator,name=iPhone 16' \
     -derivedDataPath build
   
   xcrun simctl boot "iPhone 16" || true
   
   APP_PATH=$(find build/Build/Products/Release-iphonesimulator -name "*.app" | head -n 1)
   xcrun simctl install booted "$APP_PATH"
   ```

5. **Run Maestro tests**:
   ```bash
   # Run auth flow test
   maestro test .maestro/auth_flow.yaml
   
   # Run all tests
   maestro test .maestro/
   
   # With video recording
   maestro test .maestro/auth_flow.yaml --format junit --output report.xml
   ```

#### Android

1. **Build the app**:
   ```bash
   npx expo prebuild --platform android --clean
   cd android && ./gradlew assembleRelease && cd ..
   ```

2. **Start emulator**:
   ```bash
   emulator -avd Pixel_7_API_34
   ```

3. **Install and run**:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   maestro test .maestro/auth_flow.yaml
   ```

### Running Tests in CI

Tests run automatically on every push/PR via GitHub Actions (`.github/workflows/ci.yml`):

**Jobs**:
1. **validate** - Runs lint, typecheck, and unit tests
2. **e2e-test** - Builds iOS app and runs Maestro flows

**E2E Test Process**:
- Uses macOS runner with iPhone 16 simulator
- Installs dependencies and Maestro
- Prebuilds iOS project
- Builds release app
- Runs all Maestro flows (including auth_flow.yaml)
- Uploads test artifacts on failure

---

## Recording Test Results

### Manual Recording (macOS)

1. **Start screen recording**:
   ```bash
   # Built-in screenshot tool
   # Press: Cmd + Shift + 5
   # Select: Record Selected Portion (or Entire Screen)
   # Click: Options > Show Mouse Clicks
   ```

2. **Run the test**:
   ```bash
   maestro test .maestro/auth_flow.yaml
   ```

3. **Stop recording**:
   - Click the stop button in the menu bar
   - Video saves to Desktop

### Maestro Studio (Interactive Testing)

```bash
# Launch Maestro Studio
maestro studio

# This opens a web interface where you can:
# - Record interactions
# - Run flows step-by-step
# - Capture screenshots automatically
# - Export video recordings
```

### CI Artifacts

GitHub Actions automatically uploads artifacts on test completion:
- `report.xml` - JUnit test results
- `~/.maestro/tests/**/*` - Screenshots and logs

To download:
1. Go to GitHub Actions run
2. Scroll to "Artifacts" section
3. Download "maestro-artifacts"

---

## Troubleshooting

### Common Issues

#### 1. "Supabase URL not configured"
**Solution**: Ensure `.env` file exists with correct values:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

#### 2. "Profile not found after sign up"
**Possible causes**:
- Database trigger not created
- RLS policies blocking insert

**Solution**: Run the complete `supabase/schema.sql` in your Supabase SQL editor.

#### 3. "Email already registered" in tests
**Solution**: Tests use `test_user_${MAESTRO_ITERATION}@example.com` which auto-increments. If running manually, either:
- Delete the test user from Supabase Auth dashboard
- Use a different email in the test
- Clear simulator state: `xcrun simctl erase "iPhone 16"`

#### 4. Maestro can't find elements
**Solution**: 
- Ensure testIDs are properly set in components
- Verify the app is running: `maestro test --debug .maestro/auth_flow.yaml`
- Check simulator is responsive

#### 5. Tests timeout
**Solution**:
- Increase timeout in test: `extendedWaitUntil` with higher timeout value
- Check network connectivity
- Verify Supabase is accessible

### Debug Mode

Run Maestro in debug mode for more verbose output:
```bash
maestro test --debug .maestro/auth_flow.yaml
```

This shows:
- Each step being executed
- Elements found on screen
- Screenshots at each step
- Network requests (if enabled)

### Viewing Maestro Logs

```bash
# View recent test runs
ls -la ~/.maestro/tests/

# View specific test screenshots
open ~/.maestro/tests/<timestamp>/
```

---

## Validation Checklist

Use this checklist to verify the authentication setup:

### Backend Setup
- [ ] Supabase project created
- [ ] `schema.sql` executed successfully
- [ ] Migrations applied
- [ ] RLS policies enabled and tested
- [ ] Auto profile creation trigger working

### Frontend Setup
- [ ] Environment variables configured
- [ ] Supabase client initialized
- [ ] Auth store connected to UI
- [ ] Session persistence working
- [ ] Error handling implemented

### Testing
- [ ] Unit tests passing (`npm test`)
- [ ] TypeScript checks passing (`npm run type-check`)
- [ ] Linting passing (`npm run lint`)
- [ ] E2E tests passing locally
- [ ] CI pipeline green

### User Experience
- [ ] Sign up creates account and profile
- [ ] Sign in works with valid credentials
- [ ] Sign out clears session
- [ ] Session persists across app restarts
- [ ] Profile data displays correctly
- [ ] Game access gated properly
- [ ] Error messages clear and helpful

---

## Additional Resources

### Supabase Documentation
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)

### Maestro Documentation
- [Maestro Docs](https://maestro.mobile.dev/)
- [Writing Flows](https://maestro.mobile.dev/getting-started/writing-your-first-flow)
- [Best Practices](https://maestro.mobile.dev/best-practices)

### React Native Testing
- [Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

## Contact & Support

For issues or questions about authentication:
1. Check this documentation
2. Review Supabase logs
3. Check Maestro test artifacts
4. Review CI logs in GitHub Actions

---

**Last Updated**: March 8, 2026
**Test Coverage**: ✅ Sign Up | ✅ Sign In | ✅ Sign Out | ✅ Session Persistence
