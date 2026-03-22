# TubeRush v2

## Project Overview
React Native / Expo mobile app using Expo Router, Supabase backend, and TypeScript.

## Tech Stack
- **Framework**: Expo SDK 54 with Expo Router
- **Language**: TypeScript
- **Backend**: Supabase (auth, database, edge functions)
- **State**: Zustand (stores/)
- **Testing**: Jest
- **Analytics**: PostHog
- **Styling**: React Native StyleSheet

## Project Structure
- `app/` - Expo Router pages and layouts
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- `lib/` - Utility libraries and Supabase client
- `stores/` - Zustand state stores
- `config/` - App configuration
- `types/` - TypeScript type definitions
- `supabase/` - Supabase migrations and edge functions
- `__tests__/` - Test files

## Common Commands
- `npm start` - Start Expo dev server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run Jest tests
- `npm run ios` - Run on iOS simulator

## Conventions
- Use functional components with hooks
- Keep business logic in hooks/ and stores/, not in components
- Use date-fns for date manipulation
- Supabase types are in lib/database.types.ts
