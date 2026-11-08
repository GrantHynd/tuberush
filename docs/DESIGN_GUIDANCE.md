# TubeRush Design Guidance

> Daily London puzzle game (iOS/Android). **"Beat the commute."**

Colour roles live in `constants/theme.ts`. Light chrome is Deep Teal. Dark chrome is Option A tonal teal. Crossword cells are the V3 subtle set in both schemes. This document does not authorise a roundel, tube-line colours, or Johnston-style type.

---

## Design Principles

- **Light and dark.** Follow the system scheme. Do not force a white canvas in dark mode.
- **Minimal and breathable.** Generous whitespace, clean hierarchy.
- **Colour is not the only cue.** Selection, groups, and errors also use a tick, a number, a label, or an X.
- **Crossbar Train mark.** The v01 symbol sits in the Home header, game header, and auth screens. Fira Sans for type.
- **Modern mobile-native feel.** Rounded cards (12px radius), a 1px border, no drop shadow on cards.

---

## Brand Colours

Use the named roles in `palette.light` and `palette.dark`. Do not introduce a compatibility alias for a retired name.

| Role | Light | Dark | Usage |
| ---- | ----- | ---- | ----- |
| background | `#FAF7F2` | `#0C1614` | Screen |
| surface | `#FFFFFF` | `#15201D` | Cards, tab bar |
| text | `#10201E` | `#F0F5F3` | Body |
| primary / onPrimary | `#0D5C55` / `#FAF7F2` | `#A8E8DC` / `#0C1614` | Buttons and the mark |
| game crossword | `#8B3A2F` | `#A8E8DC` | Crossword chrome, not the grid |
| premium / premiumText | `#C4922E` / `#10201E` | `#A8E8DC` / `#0C1614` | Premium chip |

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

## Brand mark

Crossbar Train symbol (`BrandMark`), 40px on Home and 32px in the game header. Auth, forgot-password, and reset-password use the same symbol at 64px plus the "TubeRush" title. No ring-and-bar mark.

---

## Screen Specifications

All screens designed as a single mobile frame (390 x 844, iPhone 14 Pro size).

---

### 1. Home Screen

**Header (top):**

- Left: Roundel logo + "TubeRush" (H2, black) + "Beat the commute" (caption, Grey Dark)
- Right: Circular avatar button (40px, primary background, white initial letter)

**Main content:** Two side-by-side game cards filling the width with a 12px gap.

#### Connections Card (left half)

- Background: primary
- Hub/network icon (white, 36px) at top-left of card
- "Connections" label (16px, 700, white)
- Live indicator: small green dot + "12.4k live" (12px, white 90% opacity)
- Card height: ~160px, border radius 12px

#### Crossword Card (right half)

- Background: error
- Star icon badge (top-right corner, gold `#FFD700`)
- Grid/crossword icon (white, 36px)
- "Crossword" label (16px, 700, white)
- "Premium" sublabel (12px, white 90% opacity)
- Card height: ~160px, border radius 12px

> **Colour usage note:** the two game cards are the ONLY bold colour elements on screen. Everything else is white/grey/black.

---

### 2. Auth Screen (Sign In / Sign Up)

Centred layout, vertically centred on screen.

- **Top:** Crossbar Train symbol (~64px) centred. Below: "TubeRush" title. Then "Welcome back!".
- **Email input:** White background, 1px Grey Medium border, 12px radius, 16px text, "Email" placeholder.
- **Password input:** Same style, "Password" placeholder.
- **Primary CTA:** Full-width, primary background, white "Sign In" text, 14px radius, 54px height — bold and confident.
- **Secondary link:** "Don't have an account? Sign Up" — primary text, no underline, small, centred.

> Overall feel: clean, calm, trustworthy. The blue CTA is the only colour moment.

---

### 3. Subscribe / Go Premium Screen

- **Hero area (~35% of screen):** Upward-gradient (white to very subtle warm grey). Centred: large Star icon with yellow (`#FFD300`) accent glow beneath it. "TubeRush Pro" in H1, black. "Unlock the full experience" caption in Grey Dark.

**Feature list (full-width):** Each row has a thin grey border bottom, 16px padding, checkmark icon in success on the left, feature text in body black on the right.

- Access to Crossword Puzzles
- More games coming soon
- Priority support
- Ad-free experience

**Pricing block:** Lightly bordered card (`#F9FAFB` background, Grey Medium border) showing "£X.XX / month" in H2 black, "or £XX.XX / year — save 40%" in caption grey.

**CTA:** Full-width, primary, white "Subscribe Now" text, bold, 54px height. Below: "Cancel anytime." in 12px grey caption centred.

---

### 4. Profile / Settings Screen

**Top bar:** Back chevron left + "Settings" (H3, black) centred as title.

**Profile header section (`#F9FAFB` background):**

- Large avatar circle (80px, primary, white initial letter)
- Email address below (H3, black)
- Premium badge (if applicable): small pill with yellow (`#FFD300`) background, "PRO" text in black, 500 weight

**Section: "PREFERENCES"** (all-caps label, Grey Dark)

- Setting row: "City/Town" label + selected value with a right chevron. White card background, grey border. Tapping opens a modal: SearchSelect for UK cities/towns. Selecting "London" shows a second step to pick borough; other cities complete immediately. Display: "London, Islington" for London+borough, city name for others, "Not set" when empty.

**Section: "ACCOUNT"** (all-caps label, Grey Dark)

- Membership row: "Membership" label + "TubeRush Pro" value. If free: small "Upgrade" pill button on right — yellow (`#FFD300`) background, black text.
- Sync Status row: label + status text. Sync icon (primary) on right.

**Danger zone:** Full-width outlined button — "Sign Out" in error text, error border, no fill. Bottom of screen.

**Footer:** "TubeRush v2.0.0" centred, 12px, grey.

---

### 5. Stats Screen

Tab screen. Header: "Stats" (H1, black).

**Summary row:** 3 stat tiles in a row — "Games Played", "Win Streak", "Best Time" — each in a `#F9FAFB` card. Stat number in H1 black, label in caption grey.

**Section: "Game History"** — a list of past game rows. Each row:

- Game type icon (tonal fill: Interchange or Crossword, with the game name as text)
- Date
- Result (Win/Loss in green/red text)
- Score
- Separated by grey dividers

**Bottom:** "More stats coming soon" caption in Grey Dark.

> Colour use: the game type pills use primary / error for identity — everything else is monochrome.

---

### 6. Leaderboard Screen

**Header:** "Leaderboard" (H1, black). Below: two filter pills — "Global" and "London" — horizontally scrollable. Active pill: primary background, white text. Inactive: grey border, grey text.

**Top 3 podium area:** Subtle flat podium graphic. 1st place in centre (slightly elevated), 2nd left, 3rd right. Each position: circular avatar (primary), username, score, position badge (1st = gold, 2nd = silver, 3rd = bronze — subtle colour fills).

**Ranked list (positions 4–10):** Each row:

- Position number (grey)
- Avatar initial circle (grey, small)
- Username (body black)
- Borough (caption grey)
- Score (H3 black, right-aligned)

Your own row is lightly highlighted with a primary left border accent.

---

### 7. Connections Game Screen (Play)

> **Dark game surface** (background `#1A1A1E`) — this screen intentionally breaks the light theme, creating drama.

**Top:** Back arrow (white), "Connections" title (white H2), current date (caption, grey).

**Game board:** 4x4 grid of word tiles. Each tile:

- **Default:** `#2C2C30` dark card, white text (16px, 600), 8px radius, subtle border
- **Selected:** primary background, white text
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
- "Submit" filled button (primary)
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
- Currently selected cell: `#C3EADF` fill, 1px `#527E70` ring inset 2px, plus a 2px `#0C1614` cursor
- Currently selected word: `#A8E8DC` fill with `#0C1614` ink
- Playable cells: `#526E64` with a 1px `#7E9B90` outline. Blocked cells: `#060B09` with no internal borders

**Clue strip (below grid):** Full-width pill showing current clue number + direction + clue text. primary left accent bar.

**Clue list (scrollable, below the grid strip):**

- Two-column tabs: "Across" | "Down" — active tab underlined in primary
- Each clue: number (bold, small), clue text (body)
- Completed clues: grey text with strikethrough

**Bottom:** Native iOS/Android keyboard — no custom keyboard needed.

---

## Visual Consistency Notes

- Every screen uses white (`#FFFFFF`) as the base. The crossword game matches this.
- Colour moments are intentional: game cards on Home, CTA buttons, status/game identity indicators, and the Connections dark game surface.
- No decorative gradients, no noise textures, no complex illustrations.
- **Icons:** SF Symbols style (clean, line-based, consistent weight).
- **Bottom tab bar:** White background, grey inactive icons, primary active icon, no labels (icon-only or with small labels below).
- All tap targets minimum **44 x 44pt**.
- Consistent **20px** horizontal page margins, **24px** section spacing.
