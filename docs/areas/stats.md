# Stats

The Stats tab (`app/(tabs)/stats.tsx`) shows three numbers and a history list.

| Stat | Source |
| --- | --- |
| Games played | Count of the player’s `leaderboard` rows |
| Win streak | Local game states for recent daily puzzles |
| Best time | Lowest submitted time, either game |

Both numbers come from hooks. `useUserStats` loads the streak and best time. `useGameHistory` loads the list. They refresh when the signed-in user id changes. Signed-out players see zeros and an empty list.

## Streak

`loadUserStreak` in `hooks/useUserStats.ts` looks at the last 60 published puzzles for each game. A Connections win is `status === 'won'`. A Crossword win is `completed === true`. The puzzle’s calendar date is what counts, not the moment the app was opened.

`calculateStreakFromDates` in `lib/user-stats.ts` counts consecutive local days. Today is still open: if today has no win yet, the streak is the run ending yesterday. A missed yesterday breaks it. The count stops at 365 days.

## Best time

`selectBestTime` compares the best Connections time with the best Crossword time. The lower number wins. A tie stays on Connections. The label is `M:SS` via `formatScore`.

## History list

Each leaderboard row becomes one line through `lib/game-history.ts`.

- **Win** means the submitted time is under 10 minutes (`HISTORY_WIN_UNDER_SECONDS`). A longer time is shown as a loss. This is independent of the in-game win/loss flag.
- **Points** use the same bands for both games: 32 under a minute, then 18, 8, 4, 3, and 2 from five minutes upward.

The list is ordered by game date, then by when the row was created.
