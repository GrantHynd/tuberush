# Leaderboard

Scores are times in seconds. A lower time ranks higher. One score is stored per player, game, and calendar day.

## Screens

| Screen | Route | Role |
| --- | --- | --- |
| Overview | `app/(tabs)/trophy.tsx` | This week, across both games |
| Game board | `app/leaderboard/game.tsx` | One game, with week navigation |
| Boroughs | `app/leaderboard/boroughs.tsx` | London borough totals for the week |
| After a game | `components/ui/Leaderboard.tsx` | Today’s board, with All UK / All London / My Area |

Weeks run Monday to Sunday in the device timezone. Labels and shifting are in `lib/week-utils.ts`. The current week shows a live badge.

## Weekly data

`hooks/useLeaderboardOverview.ts` loads `get_weekly_leaderboard` for every game in `constants/Games.ts`. `lib/leaderboard-overview.ts` turns those rows into the overview:

- **Total score** is the sum of the player’s weekly totals.
- **Overall rank** is the average of the ranks for games they played, rounded.
- **Top percent** is that rank divided by the busiest game’s player count, and never below 1.
- Each card shows a window of nearby players (`getNearbyEntries`). Signed-out viewers see the top of the list.

The same RPCs back the game board, borough breakdown, and city list. They return usernames, not email addresses.

## Location

`getLocationDisplay` in `lib/leaderboard.ts` prints a London borough, otherwise the city. Filters:

- `london` — `city = London`
- `area` — the player’s city, and their borough when that city is London

A score is only submitted when the profile has a city. London scores also store the borough. Other cities store a null borough.

## Daily board

`Leaderboard` on the result modal reads today’s `leaderboard` rows directly (limit 50). That list is separate from the weekly RPCs.
