# Offline play & sync audit

_Analysis only. No app code changed. Based on `main` @ `b239b25` (25 Oct 2026)._
Every claim below cites code on `main`. Line numbers refer to that commit.

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

| # | Sev | Likelihood | Risk | Where |
|---|-----|-----------|------|-------|
| 1 | S1 | High | **Offline completions never reach the leaderboard.** `submitScore` is fire-and-forget with no queue. Offline wins and losses are lost permanently, and there is no recovery from `game_states`. | `lib/leaderboard.ts:73-115`; `app/games/play-connections.tsx:165-176,199-208`; `app/games/play-crossword.tsx:234-` |
| 2 | S1 | High | **Score date is the UTC submission date, not the puzzle date.** Late-night BST plays (00:00-01:00) land on the previous day. Old puzzles played from the carousel get credited to today, and can overwrite today's real score through `shouldReplaceScore`. Crossword `gameDate` has the same UTC bug. (Related: TUB-235/236/237.) | `lib/leaderboard.ts:83,105`; `hooks/usePuzzle.ts:38` |
| 3 | S1 | Med | **Cache overwrite drops past puzzles.** Prefetch and `getDailyGame` write only today..+7, so the 7-day "recent" carousel and dated puzzles are empty offline. Opening the app at 23:59 and riding past midnight works only if tomorrow was published at prefetch time. | `lib/daily-games.ts:46-53,63-87,137-149,159-161,254-275` |
| 4 | S1 | Med | **Sync can regress local state.** Each queued op is a full snapshot. Replay writes each **older** snapshot back to local storage (`:234`, `:269`). If replay stops mid-queue, local storage is left on an old snapshot. If the server is newer, `handleConflict` silently replaces local progress (`:261-267`). LWW compares device clocks, so clock skew decides the winner. | `lib/offline-sync-manager.ts:194-270` |
| 5 | S1 | Med | **Queue read-modify-write races.** `addToSyncQueue` and `removeFromSyncQueueBatch` each do get→push→set with no lock. Fast crossword typing (one save per keystroke) or a sync running at the same time can drop queued ops. Ops added during a sync are not re-checked when it finishes. | `lib/storage-manager.ts:98-155`; `lib/offline-sync-manager.ts:137-189` |
| 6 | S2 | High | **Retry count never persists, and there is no backoff.** `operation.retryCount += 1` mutates an in-memory copy and is never written back, so the ">3 retries" drop never fires. A poison op (RLS reject, CHECK violation) stays forever and is retried in full on every reconnect. Meanwhile ops that fail for transient reasons wait for the next NetInfo flip or a manual retry. | `lib/offline-sync-manager.ts:156-176` |
| 7 | S2 | Med | **Sign-out leaves the queue and game states behind.** `signOut` doesn't clear `sync_queue` or `game_state_*` (only `deleteAccount` does). The next user's session replays the old user's ops. RLS rejects them because `user_id` doesn't match, and together with #6 they become permanent poison ops. Signing out before a sync also strands that data; there's no warning. | `stores/auth-store.ts:175-186` vs `:214-218`; `supabase/schema.sql:35-64` |
| 8 | S2 | Med | **Offline launch with an expired access token.** `getSession` tries a refresh, which fails offline. `checkSession` ignores the error and, when no session is returned, sets `user: null`. The game screens require `user`, so play is blocked. There is also no try/finally, so a throw leaves `loading: true`. Needs device verification. | `stores/auth-store.ts:222-256`; `app/games/play-connections.tsx:68` |
| 9 | S2 | Med | **Offline premium is fragile.** Any RevenueCat error resolves to free (`:22-26`), which shows the crossword premium gate (`play-crossword.tsx:80-91`). Whether `getCustomerInfo` serves its cache offline depends on the SDK and hasn't been tested here. | `stores/auth-store.ts:18-27`; `lib/revenuecat.ts:58-62` |
| 10 | S2 | High | **Home and Stats are wrong offline.** The streak and history puzzle lists are network-only, so offline they show streak 0 and empty history. The local `game_state_*` data that could answer them is ignored. Best time is also network-only. | `config/gameHistoryConfigs.ts:7-29`; `hooks/useUserStats.ts:71-119`; `lib/leaderboard.ts:183-195` |
| 11 | S2 | Med | **No fetch timeouts.** Patchy station Wi-Fi makes every puzzle open wait for the network-first fetch before it falls back to the cache, so the user sees a long spinner. | `lib/daily-games.ts:63-117,183-226` |
| 12 | S2 | Low | **Read-then-write leaderboard upsert.** `.single()` errors on zero rows and the error is ignored, so it works by accident. Two devices or a retry can insert duplicates unless there's a unique constraint on (user_id, game_type, game_date). Verify the constraint before adding retries. | `lib/leaderboard.ts:85-106` |
| 13 | S3 | Med | **Undeployed migration `20261024000002`.** The legacy fallback stores wins only. Losses are skipped (`:111`), so offline-to-online loss data is lost until the migration ships. | `lib/leaderboard.ts:108-113`; `supabase/migrations/20261024000002_leaderboard_result_mistakes_borough.sql` |
| 14 | S3 | Low | **No schema versioning for local state.** `game_state_*` and `sync_queue` carry no version, and new fields like `startTime` and `accumulatedPause` are optional. The puzzle cache is versioned by key (`games_cache_v3_`), but old keys are never deleted. | `lib/storage-manager.ts:3-8`; `lib/daily-games.ts:19-20` |
| 15 | S3 | Low | **Low storage.** Cache writes fail silently (`daily-games.ts:50-52`). `saveGameState` throws (`storage-manager.ts:18-21`), and `saveGame` callers don't catch it (`play-connections.tsx:213`, `play-crossword.tsx:145`), which surfaces as an unhandled rejection. The queue grows without limit (one snapshot per keystroke). | as cited |
| 16 | S3 | Low | **Mid-game kill.** AsyncStorage writes happen per move, so at most the in-flight move is lost. The crossword timer's `accumulatedPause` is only persisted on the next keystroke. | `play-crossword.tsx:126-145` |

## 3. Recommended fixes

| Fix | Addresses | Effort |
|-----|-----------|--------|
| Put score submissions into a durable outbox (same queue, `entity: 'score'`) carrying `puzzle_date`, result and mistakes. Better: derive scores server-side from completed `game_states` with an RPC or trigger, so one sync covers both. | 1, 13 | M |
| Pass the puzzle's `game_date` into `submitScore` and stop using `toISOString()` dates (also in `usePuzzle.ts:38`). Add a server-side check that `game_date` is a published puzzle. | 2 | S |
| Make the cache merge by `game_date` (union, then prune anything older than N days) instead of replacing it. Prefetch past 7 + next 7 days. Also prefetch on AppState foreground and on NetInfo reconnect. | 3 | S |
| Coalesce the queue to **one op per gameId** (latest snapshot). Don't write queued snapshots back to local storage. Merge by game semantics (union completed groups, keep finished state) instead of LWW on device clocks. Use server `now()` for `last_updated`. | 4, 5, 15 | M |
| Serialize queue mutations (an in-process mutex or promise chain). Loop sync until the queue is empty. | 5 | S |
| Persist `retryCount`. Add exponential backoff with a timer and an AppState trigger. Classify errors: drop or quarantine 4xx/RLS errors, retry network and 5xx errors. Report each dropped op to Sentry. | 6 | S-M |
| On sign-out: flush the queue if online, otherwise warn about N unsynced games. Then clear `sync_queue` and `game_state_*`. Filter queue ops by `session.user.id` before replaying them. | 7 | S |
| `checkSession`: if refresh fails offline, keep the cached `user`/session and retry on reconnect. Wrap the body in try/finally. | 8 | S |
| Cache the last known entitlement with an expiry, and use it when RevenueCat errors offline. | 9 | S |
| Build the streak and history from cached puzzles plus local `game_state_*` when the network fails. Cache best times. | 10 | M |
| Add an `AbortController` timeout (around 3 s) to puzzle fetches, or switch to cache-first with background revalidation. | 11 | S |
| Confirm or add a unique index on `leaderboard(user_id, game_type, game_date)` and use `upsert … onConflict`. (Not run here; this audit didn't execute any Supabase commands.) | 12 | S |
| Add a `schemaVersion` to stored game state and queue items, with a migration step at startup. Delete old `games_cache_v*` keys. | 14 | S |

## 4. Testing today vs gaps
- **Jest.** NetInfo is mocked globally (`jest-setup.ts:63`). Offline-adjacent coverage is limited to `__tests__/usePuzzle.test.ts`, `__tests__/play-connections.test.tsx`, `__tests__/game-store-crossword.test.ts` and `__tests__/SyncStatusRow.test.tsx` (presentation only). There are **no tests** for `lib/offline-sync-manager.ts`, `lib/storage-manager.ts` queue behaviour, or `lib/daily-games.ts` cache fallback.
- **Maestro.** `.maestro/flow.yaml` covers a logged-out home and the auth guard. `.maestro/auth_flow.yaml` covers auth. There are **no** airplane-mode or offline flows.
- **CI.** `.github/workflows/ci.yml` uses `paths-ignore: docs/**`, so docs PRs don't run CI.

Tests to add (effort):
1. Unit tests for the sync manager: queue coalescing, retry persistence, poison ops, concurrent adds, conflict merge, sign-out isolation (M).
2. Unit tests for `daily-games`: cache merge, offline fallback, midnight rollover with fake timers and a TZ of Europe/London around 00:30 BST (S).
3. A `submitScore` date test that asserts the puzzle date is used, not the UTC date (S).
4. Maestro: prefetch online → `setAirplaneMode: enabled` (or `toggleAirplaneMode`) → kill and relaunch → play Connections to completion → re-enable the network → assert the Profile sync row reaches "synced" and the leaderboard row exists (M).
5. Flaky-network simulation: a Jest fetch mock that drops or delays responses, plus Network Link Conditioner / emulator network throttling for manual QA (S-M).
