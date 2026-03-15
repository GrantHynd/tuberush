# TubeRush Design Guidance

> A London Underground-themed daily puzzle game (iOS/Android). **"Beat the commute."**

---

## Design Principles

- **Light mode only.** White (`#FFFFFF`) backgrounds, near-black (`#111111`) text.
- **Minimal and breathable.** Generous whitespace, clean hierarchy.
- **Colour is used sparingly** — white canvas with rare, deliberate punches of brand colour that feel premium and intentional, not decorative.
- **Inspired by the TfL design language:** the roundel, bold type, strong grid, functional elegance.
- **Modern mobile-native feel.** Rounded cards (12px radius), subtle shadows, clean list rows.

---

## Brand Colours

> Use sparingly — colour should feel intentional, not decorative.

| Name         | Hex       | Usage                                   |
| ------------ | --------- | --------------------------------------- |
| TfL Red      | `#E32017` | Primary accent, danger, Central Line    |
| TfL Blue     | `#003688` | Interactive elements, CTAs, Piccadilly  |
| TfL Yellow   | `#FFD300` | Premium/upgrade moments, Circle Line    |
| TfL Green    | `#00782A` | Success states, District Line           |
| TfL Black    | `#111111` | Body text                               |
| Grey Light   | `#F9FAFB` | Card/surface backgrounds                |
| Grey Medium  | `#E5E7EB` | Borders, dividers                       |
| Grey Dark    | `#4B5563` | Secondary labels, captions              |

---

## Typography

| Style            | Size | Weight | Notes                          |
| ---------------- | ---- | ------ | ------------------------------ |
| H1               | 32px | 700    | -0.5 tracking                  |
| H2               | 24px | 600    | -0.5 tracking                  |
| H3               | 20px | 600    |                                |
| Body             | 16px | 400    | 24px line height               |
| Caption          | 14px | 400    | Grey Dark                      |
| Label (all-caps) | 12px | 500    | 1px letter spacing, Grey Dark  |

---

## Roundel Logo Component

A small TfL-style roundel: red circle (`#E32017`), white inner ring, horizontal blue (`#003688`) bar cutting through the centre. Used in the top-left of the header.

---

## Screen Specifications

All screens designed as a single mobile frame (390 x 844, iPhone 14 Pro size).

---

### 1. Home Screen

**Header (top):**

- Left: Roundel logo + "TubeRush" (H2, black) + "Beat the commute" (caption, Grey Dark)
- Right: Circular avatar button (40px, TfL Blue background, white initial letter)

**Main content:** Two side-by-side game cards filling the width with a 12px gap.

#### Connections Card (left half)

- Background: TfL Blue (`#003688`)
- Hub/network icon (white, 36px) at top-left of card
- "Connections" label (16px, 700, white)
- Live indicator: small green dot + "12.4k live" (12px, white 90% opacity)
- Card height: ~160px, border radius 12px

#### Crossword Card (right half)

- Background: TfL Red (`#E32017`)
- Star icon badge (top-right corner, gold `#FFD700`)
- Grid/crossword icon (white, 36px)
- "Crossword" label (16px, 700, white)
- "Premium" sublabel (12px, white 90% opacity)
- Card height: ~160px, border radius 12px

> **Colour usage note:** the two game cards are the ONLY bold colour elements on screen. Everything else is white/grey/black.

---

### 2. Auth Screen (Sign In / Sign Up)

Centred layout, vertically centred on screen.

- **Top:** TubeRush roundel icon (large, ~60px) centred. Below: "TubeRush" wordmark (H1, black). Then "Welcome back!" (H2, Grey Dark).
- **Email input:** White background, 1px Grey Medium border, 12px radius, 16px text, "Email" placeholder.
- **Password input:** Same style, "Password" placeholder.
- **Primary CTA:** Full-width, TfL Blue (`#003688`) background, white "Sign In" text, 14px radius, 54px height — bold and confident.
- **Secondary link:** "Don't have an account? Sign Up" — TfL Blue text, no underline, small, centred.

> Overall feel: clean, calm, trustworthy. The blue CTA is the only colour moment.

---

### 3. Subscribe / Go Premium Screen

- **Hero area (~35% of screen):** Upward-gradient (white to very subtle warm grey). Centred: large Star icon with yellow (`#FFD300`) accent glow beneath it. "TubeRush Pro" in H1, black. "Unlock the full experience" caption in Grey Dark.

**Feature list (full-width):** Each row has a thin grey border bottom, 16px padding, checkmark icon in TfL Green (`#00782A`) on the left, feature text in body black on the right.

- Access to Crossword Puzzles
- More games coming soon
- Priority support
- Ad-free experience

**Pricing block:** Lightly bordered card (`#F9FAFB` background, Grey Medium border) showing "£X.XX / month" in H2 black, "or £XX.XX / year — save 40%" in caption grey.

**CTA:** Full-width, TfL Blue (`#003688`), white "Subscribe Now" text, bold, 54px height. Below: "Cancel anytime." in 12px grey caption centred.

---

### 4. Profile / Settings Screen

**Top bar:** Back chevron left + "Settings" (H3, black) centred as title.

**Profile header section (`#F9FAFB` background):**

- Large avatar circle (80px, TfL Blue, white initial letter)
- Email address below (H3, black)
- Premium badge (if applicable): small pill with yellow (`#FFD300`) background, "PRO" text in black, 500 weight

**Section: "PREFERENCES"** (all-caps label, Grey Dark)

- Setting row: "London Borough" label + selected value ("Islington") with a right chevron. White card background, grey border.

**Section: "ACCOUNT"** (all-caps label, Grey Dark)

- Membership row: "Membership" label + "TubeRush Pro" value. If free: small "Upgrade" pill button on right — yellow (`#FFD300`) background, black text.
- Sync Status row: label + status text. Sync icon (TfL Blue) on right.

**Danger zone:** Full-width outlined button — "Sign Out" in TfL Red (`#E32017`) text, TfL Red border, no fill. Bottom of screen.

**Footer:** "TubeRush v2.0.0" centred, 12px, grey.

---

### 5. Stats Screen

Tab screen. Header: "Stats" (H1, black).

**Summary row:** 3 stat tiles in a row — "Games Played", "Win Streak", "Best Time" — each in a `#F9FAFB` card. Stat number in H1 black, label in caption grey.

**Section: "Game History"** — a list of past game rows. Each row:

- Game type icon (coloured pill: blue for Connections, red for Crossword)
- Date
- Result (Win/Loss in green/red text)
- Score
- Separated by grey dividers

**Bottom:** "More stats coming soon" caption in Grey Dark.

> Colour use: the game type pills use TfL Blue / TfL Red for identity — everything else is monochrome.

---

### 6. Leaderboard Screen

**Header:** "Leaderboard" (H1, black). Below: two filter pills — "Global" and "London" — horizontally scrollable. Active pill: TfL Blue background, white text. Inactive: grey border, grey text.

**Top 3 podium area:** Subtle flat podium graphic. 1st place in centre (slightly elevated), 2nd left, 3rd right. Each position: circular avatar (TfL Blue), username, score, position badge (1st = gold, 2nd = silver, 3rd = bronze — subtle colour fills).

**Ranked list (positions 4–10):** Each row:

- Position number (grey)
- Avatar initial circle (grey, small)
- Username (body black)
- Borough (caption grey)
- Score (H3 black, right-aligned)

Your own row is lightly highlighted with a TfL Blue left border accent.

---

### 7. Connections Game Screen (Play)

> **Dark game surface** (background `#1A1A1E`) — this screen intentionally breaks the light theme, creating drama.

**Top:** Back arrow (white), "Connections" title (white H2), current date (caption, grey).

**Game board:** 4x4 grid of word tiles. Each tile:

- **Default:** `#2C2C30` dark card, white text (16px, 600), 8px radius, subtle border
- **Selected:** TfL Blue (`#003688`) background, white text
- **Solved:** Tiles disappear and stack as a coloured banner row above the grid

**Solved group banners (stacked at top of grid):**

| Group              | Colour          |
| ------------------ | --------------- |
| Group 1 (easiest)  | Amber `#F59E0B` |
| Group 2            | Emerald `#10B981` |
| Group 3            | Indigo `#6366F1` |
| Group 4 (hardest)  | Pink `#EC4899`  |

Each banner: full-width pill with category name + 4 words listed below in a compact row.

**Bottom controls:**

- "Shuffle" outline button
- "Deselect All" outline button
- "Submit" filled button (TfL Blue)
- All white outlined style on dark background

**Lives remaining:** 4 small filled circles (white) = remaining guesses.

---

### 8. Crossword Game Screen (Play)

Light background (`#FFFFFF`) — this game uses the light theme.

**Top:** Back arrow, "Crossword" title (H2), current date (caption). Premium crown badge (gold star) next to title.

**Crossword grid:**

- Clean black-bordered cells on white
- Black squares: solid black
- White squares: light grey (`#F9FAFB`) background, entered letters in black (H3)
- Currently selected cell: TfL Blue highlight
- Currently selected word: light TfL Blue tint (`#E8EEFF`) across all cells

**Clue strip (below grid):** Full-width pill showing current clue number + direction + clue text. TfL Blue left accent bar.

**Clue list (scrollable, below the grid strip):**

- Two-column tabs: "Across" | "Down" — active tab underlined in TfL Blue
- Each clue: number (bold, small), clue text (body)
- Completed clues: grey text with strikethrough

**Bottom:** Native iOS/Android keyboard — no custom keyboard needed.

---

## Visual Consistency Notes

- Every screen uses white (`#FFFFFF`) as the base. The crossword game matches this.
- Colour moments are intentional: game cards on Home, CTA buttons, status/game identity indicators, and the Connections dark game surface.
- No decorative gradients, no noise textures, no complex illustrations.
- **Icons:** SF Symbols style (clean, line-based, consistent weight).
- **Bottom tab bar:** White background, grey inactive icons, TfL Blue active icon, no labels (icon-only or with small labels below).
- All tap targets minimum **44 x 44pt**.
- Consistent **20px** horizontal page margins, **24px** section spacing.
