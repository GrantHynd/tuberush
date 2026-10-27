# Offline play & sync audit

_Analysis only. No app code changed. Section 1 is `main` @ `b239b25` (25 Oct 2026); its line numbers refer to that commit._
Sections 2–4 were revised after the follow-ups. Fixed items from the 25 Oct list are removed.

## 1. How it works today

### 1.1 Puzzle download (prefetch)
- On launch, `app/_layout.tsx:78-79` calls `prefetchDailyGames('connections', 7)` and `prefetchDailyGames('crossword', 7)` without awaiting them. They run after RevenueCat and PostHog init (`:61-72`) and `checkSession()` (`:75`).
- `lib/daily-games.ts:63-87` fetches published `games` rows for **today..today+7** (local date via `toLocalDateString`) and writes them to one AsyncStorage key per game type, `games_cache_v3_<type>` (`:20`, `:46-53`). The write **replaces** the whole entry.
- The cache TTL is 6 h (`:21`). The TTL only triggers a background refetch (`:170-172`). Stale data is still served.
- Premium crosswords use the same cache as Connections. Download is not gated on entitlement. The gate is applied at play time (`app/games/play-crossword.tsx:80-91`).
- Custom puzzles (`getCustomPuzzle`) are not cached at all.
- Nothing refreshes the cache except a cold start or a puzzle open. There is no AppState/foreground, background-fetch or NetInfo-driven prefetch.

### 1.2 Loading a puzzle
- Every reader tries the network first and falls back to the cache second: `getDailyGame` (`daily-games.ts:154-178`), `getGameByDate` (`:183-210`), `getCrosswordByPuzzleId` (`:215-244`) and `getRecentAndUpcomingGames` (`:254-278`).
- None of these calls has a timeout. On a weak or captive connection, the screen waits as long as the fetch takes before it falls back.
- Connections offline miss: the alert "Puzzle unavailable… isn't available offline" (`app/games/play-connections.tsx:86-95`).

### 1.3 Game state persistence
- There is no Zustand `persist` middleware anywhere. `stores/game-store.ts:17` is a plain `create`. Durable state lives in AsyncStorage under `game_state_<id>`, managed by `lib/storage-manager.ts:14-22`.
- Game ids: Connections uses `connections_<uid>_<puzzleDate>` (`play-connections.tsx:97-99`, `config/gameHistoryConfigs.ts:72`). Crossword uses `crossword_<uid>_<puzzleId>` (`play-crossword.tsx:96-98`, `gameHistoryConfigs.ts:124`). Ids are deterministic, so `game_states` rows are idempotent per puzzle.
- Every guess (Connections, `play-connections.tsx:213-217`) and every cell keystroke (Crossword, `play-crossword.tsx:126-145`) calls `saveGame` → `offlineSyncManager.saveGameState`. That call writes locally first (`lib/offline-sync-manager.ts:76`), then upserts to `game_states` if online (`:78-102`), or else enqueues (`:103-106`).

### 1.4 Sync queue
- The queue is one JSON array under `sync_queue` (`storage-manager.ts:98-155`). Each save appends a full snapshot. Operation id = `<gameId>_<Date.now()>` (`offline-sync-manager.ts:113-120`).
- Trigger: only a NetInfo transition from offline to online (`:27-40`). `isOnline` starts as `false` (`:7`), so the first NetInfo event at launch also triggers a sync. The other trigger is the manual "retry" in Profile, via `SyncStatusRow` (`app/(tabs)/profile.tsx:55,301`) → `forceSync` (`:322-326`).
- Replay: ops run sequentially. For each one, the client SELECTs the server row, then either upserts with `version+1` or runs `handleConflict` (last-write-wins on `last_updated`) (`:194-270`).
- There is no backoff, no timer, and no AppState trigger.

### 1.5 Leaderboard / scores
- `leaderboard.submitScore` (`lib/leaderboard.ts:73-115`) is called fire-and-forget on win or loss (`play-connections.tsx:165-176, 199-208`; `play-crossword.tsx:234-`).
- It is **not** queued. A failure is only `console.error`'d.
- It stamps `game_date` with the **UTC** date of submission (`leaderboard.ts:83`, `new Date().toISOString().split('T')[0]`), not the puzzle's date.
- It uses read-then-insert/update (`:85-106`), with a fallback for the undeployed `result`/`mistakes` columns from migration `20261024000002` (`:108-113`). Losses are dropped while that migration is missing (`:111`).

### 1.6 Auth, entitlements, stats
- The Supabase client persists the session in AsyncStorage with `autoRefreshToken` (`lib/supabase-client.ts:20-27`).
- `checkSession` (`stores/auth-store.ts:222-256`) awaits `getSession`, RevenueCat login, a `profiles` fetch and `hasActiveEntitlement()`. It ignores the `error` from `getSession` and has no try/finally.
- Premium comes from RevenueCat only. Any error is treated as **not premium** (`auth-store.ts:18-27`).
- Home streak (`hooks/useUserStats.ts:71-119`) and history lists (`hooks/useGameHistoryList.ts:111`) get the puzzle list from the network only (`config/gameHistoryConfigs.ts:7-29`). On failure, they return `[]`.
- Best time comes from the `leaderboard` table (`lib/leaderboard.ts:183-195`). That read is network-only.

## 2. Risks (ranked)

Severity runs S1 (data loss or wrong scores) to S3 (UX). Likelihood is for a daily commuter on the Underground.

Shipped since 25 Oct, and removed from this list: the score outbox (`lib/score-outbox.ts`), puzzle-date scores, cache merge of past 7 and next 7 days, semantic merge instead of last-write-wins, a locked one-op-per-game queue, persisted retries with backoff and a dead-letter list, sign-out flush plus `clearLocalAccountData`, and a 3s puzzle fetch timeout.

| # | Sev | Likelihood | Risk | Where |
|---|-----|-----------|------|-------|
| 8 | S2 | Med | **Offline launch with an expired access token.** `getSession` tries a refresh, which fails offline. `checkSession` ignores the error and, when no session is returned, sets `user: null`. Game screens send the player to auth when `user` is missing, so play is blocked. There is no try/finally, so a throw leaves `loading: true`. | `stores/auth-store.ts` `checkSession`; `app/games/play-connections.tsx` redirects when `!user` |
| 9 | S2 | Med | **Offline premium is fragile.** Any RevenueCat error resolves to free, which shows the crossword premium gate. Whether `getCustomerInfo` serves a cache offline has not been tested here. | `resolvePremiumStatus` in `stores/auth-store.ts`; `hasActiveEntitlement` in `lib/revenuecat.ts` |
| 10 | S2 | High | **Streak and history are still empty offline.** Puzzle dates come only from the network (`fetchPuzzlesFromDB` returns `[]` on failure), so local `game_state_*` rows are never matched. Best time is also network-only (`getUserBestScore`). | `config/gameHistoryConfigs.ts`; `hooks/useUserStats.ts`; `lib/leaderboard.ts` |
| 12 | S2 | Low | **Leaderboard unique index may be absent.** `submitScore` upserts on `leaderboard_user_game_date_key`. If Postgres returns `42P10`, it falls back to read-then-insert/update. Migration `20261025000001` is in the repo and marked not applied. | `lib/leaderboard.ts` `submitScore`; `supabase/migrations/20261025000001_leaderboard_unique_user_game_date.sql` |
| 13 | S3 | Med | **Losses are skipped when `result` / `mistakes` are missing.** The legacy payload stores wins only. | `writeWithSchemaFallback` in `lib/leaderboard.ts`; `supabase/migrations/20261024000002_leaderboard_result_mistakes_borough.sql` |
| 14 | S3 | Low | **No schema version on local game state.** `game_state_*` and `sync_queue` carry no version. The puzzle cache key is `games_cache_v3_`, and old keys are not deleted. | `lib/storage-manager.ts`; `lib/daily-games.ts` |
| 15 | S3 | Low | **Low storage.** Puzzle cache writes fail silently. | `lib/daily-games.ts` cache write |
| 16 | S3 | Low | **Mid-game kill.** AsyncStorage writes happen per move, so at most the in-flight move is lost. | `handleCellChange` in `app/games/play-crossword.tsx` |

## 3. Recommended fixes

| Fix | Addresses | Effort |
|-----|-----------|--------|
| `checkSession`: if refresh fails offline, keep the cached `user`/session and retry on reconnect. Wrap the body in try/finally. | 8 | S |
| Cache the last known entitlement with an expiry, and use it when RevenueCat errors offline. | 9 | S |
| When the puzzle-date query fails, build streak and history from the cached `games` window plus local `game_state_*`. Cache best times. | 10 | M |
| Apply `20261025000001` so the unique index exists. The client already upserts on it. | 12 | S |
| Apply `20261024000002` so losses can be stored. Until those columns exist, the client skips losses. | 13 | S |
| Add a `schemaVersion` to stored game state and queue items, with a migration step at startup. Delete old `games_cache_v*` keys. | 14 | S |

## 4. Testing today vs gaps
- **Jest.** NetInfo is mocked globally (`jest-setup.ts`). Coverage now includes `__tests__/offline-sync-queue.test.ts` (coalesce, lock, merge, retry, dead-letter), `__tests__/daily-games-cache.test.ts` (cache merge, offline carousel, prefetch on foreground and reconnect, fetch timeout), `__tests__/score-outbox.test.ts`, `__tests__/phase5-backend.test.ts` (puzzle date and upsert), `__tests__/auth-store-sign-out.test.ts`, and `__tests__/game-store-save-failure.test.ts`. `__tests__/usePuzzle.test.ts`, `__tests__/play-connections.test.tsx`, `__tests__/game-store-crossword.test.ts`, and `__tests__/SyncStatusRow.test.tsx` are still there.
- **Maestro.** `.maestro/01_guest_start.yaml` is the logged-out home and auth guard. `.maestro/02_interchange_play.yaml`, `.maestro/03_crossword_paywall.yaml`, and `.maestro/04_crossword_play.yaml` cover signed-in play and the paywall. `.maestro/offline_airplane_flow.yaml` is the Android-only airplane flow and is not run in CI. There is no `flow.yaml` or `auth_flow.yaml`.
- **CI.** `.github/workflows/ci.yml` ignores `**.md` and `docs/**`, so docs PRs do not run CI. Its iOS Maestro job is deprecated and runs only `01_guest_start.yaml`, and only on demand or with the `e2e-test` label. `.eas/workflows/e2e-tests.yml` runs `.maestro` and skips the `android-only` tag.

Still untested: `checkSession` when an offline refresh fails, whether RevenueCat serves the entitlement from its cache offline, and streak or history when the puzzle-date query fails.
