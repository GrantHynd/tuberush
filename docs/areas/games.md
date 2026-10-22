# Games

TubeRush has two daily games, listed in `constants/Games.ts`.

| Game | Access | Play screen |
| --- | --- | --- |
| Connections | Free | `app/games/play-connections.tsx` |
| Crossword | TubeRush Pro | `app/games/play-crossword.tsx` |

The home tab (`app/(tabs)/index.tsx`) shows a short carousel of recent puzzles. Archive lists live at `app/games/connections-list.tsx` and `app/games/crossword-list.tsx`.

## Where puzzles come from

Published puzzles are rows in the `games` table. `lib/daily-games.ts` loads them and caches a window in AsyncStorage. Nightly AWS Lambdas fill that table (`lambda/generate-connections`, `lambda/generate-crossword`). The crossword grid is solved from a word list; Claude writes the clues.

A puzzle can also be loaded by id from `custom_puzzles` (`lib/custom-puzzles.ts`). Custom sessions save a score on that puzzle and stay off the daily leaderboard.

## Play state

`stores/game-store.ts` holds the current game. Creating a Connections game starts with four mistakes. Creating a Crossword game requires the puzzle and copies its grid and clues into the state.

Every move is saved locally first through `lib/offline-sync-manager.ts`, then pushed to Supabase when the device is online. Coming back online flushes the queue. Conflicts use last write wins.

Game ids:

- Connections: `connections_{userId}_{YYYY-MM-DD}`
- Crossword: `crossword_{userId}_{puzzleId}`

## Finishing a daily game

Connections is won when all four groups are found, and lost when mistakes run out. The time is `(endTime - startTime)` in seconds.

Crossword is won when the grid is filled correctly. The timer in `hooks/useCrosswordTimer.ts` subtracts time spent in the background (`accumulatedPause`) so a locked phone does not count.

A daily finish with a city on the profile submits that time to the leaderboard. Lower is better, and a later attempt the same day replaces the score only when it is faster (`lib/leaderboard.ts`). Custom puzzles call `saveCustomPuzzleScore` instead.

Crossword play is wrapped in `components/games/CrosswordErrorBoundary.tsx` so a bad puzzle does not take down the tab.

## Times on screen

Completion times use `formatScore` in `lib/display-utils.ts` (`M:SS`). Do not add another copy of that formatter.
