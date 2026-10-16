#!/usr/bin/env python3
"""
Rebuild src/word-list.json: common British English words (3-9 letters) for the grid solver.

Pipeline
  1. Take the top-N English words by frequency (wordfreq, data CC-BY-SA 4.0).
  2. Keep words the en_GB Hunspell dictionary accepts in lowercase. This drops US spellings
     (COLOR, CENTER), proper nouns (LONDON) and most abbreviations (NBA).
  3. Drop profanity (better-profanity list), scripts/word-blocklist.txt, words with no
     vowel (LTD, MPH) and roman numerals (III, XIV).
  4. Write uppercase words in frequency order (most common first).

Requirements
  pip install wordfreq better-profanity
  npm i --no-save nspell@2.1.5 dictionary-en-gb@2.4.0   (run in this folder)

Usage
  python3 scripts/build-word-list.py [--top 60000]
"""
import argparse, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Real words that also parse as roman numerals.
COMMON_ROMAN_LOOKALIKES = {'mix', 'mid', 'dim', 'lid', 'did', 'mild', 'mill', 'civil', 'livid', 'vivid', 'mimic', 'dill', 'mid', 'lix'}

CHECK_JS = r"""
const fs = require('fs');
const nspell = require('nspell');
const dir = require.resolve('dictionary-en-gb/index.dic').replace(/index\.dic$/, '');
const sp = nspell({ aff: fs.readFileSync(dir + 'index.aff'), dic: fs.readFileSync(dir + 'index.dic') });
const words = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
fs.writeFileSync(process.argv[3], words.filter(w => sp.correct(w)).join('\n'));
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=60000)
    args = ap.parse_args()

    import wordfreq, better_profanity

    cands = [w for w in wordfreq.top_n_list('en', args.top) if re.fullmatch(r'[a-z]{3,9}', w)]

    with tempfile.TemporaryDirectory() as tmp:
        src, dst, js = (os.path.join(tmp, n) for n in ('in.txt', 'out.txt', 'check.js'))
        open(src, 'w').write('\n'.join(cands))
        open(js, 'w').write(CHECK_JS)
        env = dict(os.environ, NODE_PATH=os.path.join(ROOT, 'node_modules'))
        subprocess.run(['node', js, src, dst], check=True, env=env)
        gb = [w for w in open(dst).read().split('\n') if w]

    pdir = os.path.dirname(better_profanity.__file__)
    blocked = set()
    for f in os.listdir(pdir):
        if f.endswith('.txt'):
            blocked |= {l.strip().lower() for l in open(os.path.join(pdir, f)) if l.strip()}
    blocklist = os.path.join(HERE, 'word-blocklist.txt')
    for line in open(blocklist):
        blocked |= {w.lower() for w in line.split('#')[0].split()}

    roman = re.compile(r'^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$')
    words = [
        w.upper()
        for w in gb
        if w not in blocked
        and re.search(r'[aeiouy]', w)  # no vowel = abbreviation (LTD, MPH, RPM)
        and not (len(w) <= 5 and roman.match(w) and w not in COMMON_ROMAN_LOOKALIKES)
    ]
    out = os.path.join(ROOT, 'src', 'word-list.json')
    with open(out, 'w') as fh:
        json.dump(words, fh, separators=(',', ':'))
    print(f'{len(cands)} candidates -> {len(gb)} en_GB -> {len(words)} after blocklist -> {out}')


if __name__ == '__main__':
    sys.exit(main())
