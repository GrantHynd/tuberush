# Area guides

Short maps of the main product areas. Each page says what the area does, where the code lives, and the rules that are easy to get wrong.

| Area | What it covers |
| --- | --- |
| [Auth](auth.md) | Sign-in, session restore, premium, account deletion |
| [Games](games.md) | Daily Connections and Crossword, custom puzzles, offline play |
| [Leaderboard](leaderboard.md) | Weekly ranks, location filters, score submission |
| [Stats](stats.md) | Streak, best time, and the history list |
| [Settings](settings.md) | Profile, location, sync, and account actions |

Shared helpers that more than one area uses:

- `lib/display-utils.ts` — names, avatar initials, `M:SS` times, player counts
- `lib/week-utils.ts` — local `YYYY-MM-DD` dates and Monday–Sunday weeks
- `lib/offline-sync-manager.ts` — local game state, then Supabase when online
