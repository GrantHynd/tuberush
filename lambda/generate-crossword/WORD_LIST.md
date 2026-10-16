# Crossword word list

`src/word-list.json` holds ~27.8k common British English words (3–9 letters), most frequent first.
The grid solver uses the first `MAX_RANK` (22,000) of them, after the hand-vetted `src/word-bank.json`.

## How it is built

`npm run build-word-list` (see `scripts/build-word-list.py` for setup):

1. Top 60,000 English words by frequency from **wordfreq**.
2. Keep words the **en_GB Hunspell dictionary** accepts in lowercase — drops US spellings
   (COLOR, CENTER), proper nouns (LONDON) and most abbreviations.
3. Drop the **better-profanity** list, `scripts/word-blocklist.txt`, words with no vowel (LTD, MPH)
   and roman numerals.

When the Lambda logs a `clue_rejects` entry (Claude judged an answer unsuitable), add the word to
`scripts/word-blocklist.txt` if you agree, then rebuild.

## Sources and licences

| Source | Used for | Licence |
|---|---|---|
| [wordfreq](https://github.com/rspeer/wordfreq) data | Word selection and frequency order | CC BY-SA 4.0 |
| [dictionary-en-gb](https://github.com/wooorm/dictionaries) (SCOWL / LibreOffice en_GB) | Spelling filter (not shipped) | MIT AND BSD |
| [better-profanity](https://github.com/snguyenthanh/better_profanity) | Profanity filter (not shipped) | MIT |

`word-list.json` is derived from wordfreq data, so it is shared under CC BY-SA 4.0 with
attribution: *wordfreq by Robyn Speer, https://github.com/rspeer/wordfreq*.
