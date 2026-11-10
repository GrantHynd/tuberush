# TubeRush Design Guidance

> Daily London puzzle game (iOS/Android). **"Beat the commute."**

Colour roles live in `constants/theme.ts`. Light chrome is Deep Teal. Dark chrome is Option A tonal teal. Dark crossword cells stay on V3. Light crossword cells are the approved light-tuned V3 (option C). This document does not authorise a roundel, tube-line colours, or Johnston-style type.

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
