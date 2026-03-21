// Supabase Edge Function: Schedule Daily Games
// Creates connections and crossword games for upcoming days.
// Triggered daily via pg_cron at 01:00 UTC, or manually via POST.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Connections puzzle pool — rotating themed groups
// ---------------------------------------------------------------------------
const CONNECTIONS_THEMES = [
  [
    { category: 'TUBE LINES', items: ['BAKERLOO', 'CENTRAL', 'DISTRICT', 'NORTHERN'], difficulty: 1 },
    { category: 'ROYAL PARKS', items: ['HYDE', 'REGENT', 'GREEN', 'ST JAMES'], difficulty: 2 },
    { category: 'LONDON AIRPORTS', items: ['HEATHROW', 'GATWICK', 'STANSTED', 'LUTON'], difficulty: 3 },
    { category: 'MONOPOLY STREETS', items: ['VINE', 'BOW', 'FLEET', 'STRAND'], difficulty: 4 },
  ],
  [
    { category: 'TEA TYPES', items: ['EARL GREY', 'CHAMOMILE', 'PEPPERMINT', 'MATCHA'], difficulty: 1 },
    { category: 'CURRENCY', items: ['POUND', 'DOLLAR', 'YEN', 'EURO'], difficulty: 2 },
    { category: 'CARD SUITS', items: ['HEARTS', 'CLUBS', 'DIAMONDS', 'SPADES'], difficulty: 3 },
    { category: 'BEATLES', items: ['JOHN', 'PAUL', 'GEORGE', 'RINGO'], difficulty: 4 },
  ],
  [
    { category: 'WEATHER', items: ['SUNNY', 'RAINY', 'CLOUDY', 'WINDY'], difficulty: 1 },
    { category: 'SEASONS', items: ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'], difficulty: 2 },
    { category: 'PLANETS', items: ['MARS', 'VENUS', 'SATURN', 'JUPITER'], difficulty: 3 },
    { category: 'PRIME MINISTERS', items: ['BLAIR', 'BROWN', 'CAMERON', 'MAY'], difficulty: 4 },
  ],
  [
    { category: 'FRUITS', items: ['APPLE', 'ORANGE', 'BANANA', 'GRAPE'], difficulty: 1 },
    { category: 'COLORS', items: ['RED', 'BLUE', 'GREEN', 'YELLOW'], difficulty: 2 },
    { category: 'SHAPES', items: ['CIRCLE', 'SQUARE', 'TRIANGLE', 'OVAL'], difficulty: 3 },
    { category: 'NUMBERS', items: ['ONE', 'TWO', 'THREE', 'FOUR'], difficulty: 4 },
  ],
  [
    { category: 'LONDON BRIDGES', items: ['TOWER', 'WATERLOO', 'WESTMINSTER', 'BLACKFRIARS'], difficulty: 1 },
    { category: 'BRITISH BANDS', items: ['OASIS', 'BLUR', 'COLDPLAY', 'RADIOHEAD'], difficulty: 2 },
    { category: 'SHAKESPEARE PLAYS', items: ['HAMLET', 'OTHELLO', 'MACBETH', 'TEMPEST'], difficulty: 3 },
    { category: 'CRICKET TERMS', items: ['WICKET', 'OVER', 'MAIDEN', 'BOUNDARY'], difficulty: 4 },
  ],
  [
    { category: 'LONDON MARKETS', items: ['BOROUGH', 'CAMDEN', 'PORTOBELLO', 'BRICK LANE'], difficulty: 1 },
    { category: 'HARRY POTTER', items: ['WAND', 'SNITCH', 'HORCRUX', 'PATRONUS'], difficulty: 2 },
    { category: 'CHESS PIECES', items: ['KING', 'QUEEN', 'BISHOP', 'KNIGHT'], difficulty: 3 },
    { category: 'PHONETIC ALPHABET', items: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'], difficulty: 4 },
  ],
];

const TFL_COLORS = {
  red: '#DC241F',
  green: '#007D32',
  blue: '#0019A8',
  yellow: '#FFD329',
};
const GROUP_COLORS = [TFL_COLORS.red, TFL_COLORS.green, TFL_COLORS.blue, TFL_COLORS.yellow];

// ---------------------------------------------------------------------------
// Crossword puzzle pool — mini crosswords
// ---------------------------------------------------------------------------
const CROSSWORD_POOL = [
  {
    title: 'London Mini',
    rows: 5,
    cols: 5,
    grid: [
      [{ letter: 'T', number: 1, isBlack: false }, { letter: 'A', isBlack: false }, { letter: 'B', number: 2, isBlack: false }, { letter: 'S', isBlack: false }, { letter: null, isBlack: true }],
      [{ letter: 'U', isBlack: false }, { letter: null, isBlack: true }, { letter: 'I', isBlack: false }, { letter: null, isBlack: true }, { letter: 'A', number: 3, isBlack: false }],
      [{ letter: 'B', number: 4, isBlack: false }, { letter: 'A', isBlack: false }, { letter: 'K', isBlack: false }, { letter: 'E', isBlack: false }, { letter: 'R', isBlack: false }],
      [{ letter: 'E', isBlack: false }, { letter: null, isBlack: true }, { letter: 'E', isBlack: false }, { letter: null, isBlack: true }, { letter: 'T', isBlack: false }],
      [{ letter: null, isBlack: true }, { letter: 'A', number: 5, isBlack: false }, { letter: 'S', isBlack: false }, { letter: 'K', isBlack: false }, { letter: 'S', isBlack: false }],
    ],
    clues: {
      across: [
        { number: 1, clue: 'Keep these open in your browser', answer: 'TABS', row: 0, col: 0, length: 4 },
        { number: 4, clue: '___ Street, home of Sherlock Holmes', answer: 'BAKER', row: 2, col: 0, length: 5 },
        { number: 5, clue: 'Poses questions', answer: 'ASKS', row: 4, col: 1, length: 4 },
      ],
      down: [
        { number: 1, clue: "London's Underground railway", answer: 'TUBE', row: 0, col: 0, length: 4 },
        { number: 2, clue: "Boris ___: London's cycle hire scheme", answer: 'BIKES', row: 0, col: 2, length: 5 },
        { number: 3, clue: "South Bank is London's centre for the ___", answer: 'ARTS', row: 1, col: 4, length: 4 },
      ],
    },
  },
  {
    title: 'London Parks',
    rows: 5,
    cols: 5,
    grid: [
      [{ letter: 'P', number: 1, isBlack: false }, { letter: 'A', isBlack: false }, { letter: 'R', number: 2, isBlack: false }, { letter: 'K', isBlack: false }, { letter: null, isBlack: true }],
      [{ letter: 'I', isBlack: false }, { letter: null, isBlack: true }, { letter: 'I', isBlack: false }, { letter: null, isBlack: true }, { letter: 'P', number: 3, isBlack: false }],
      [{ letter: 'N', number: 4, isBlack: false }, { letter: 'A', isBlack: false }, { letter: 'V', isBlack: false }, { letter: 'E', isBlack: false }, { letter: 'L', isBlack: false }],
      [{ letter: 'T', isBlack: false }, { letter: null, isBlack: true }, { letter: 'E', isBlack: false }, { letter: null, isBlack: true }, { letter: 'U', isBlack: false }],
      [{ letter: null, isBlack: true }, { letter: 'D', number: 5, isBlack: false }, { letter: 'R', isBlack: false }, { letter: 'U', isBlack: false }, { letter: 'G', isBlack: false }],
    ],
    clues: {
      across: [
        { number: 1, clue: 'Green space in the city', answer: 'PARK', row: 0, col: 0, length: 4 },
        { number: 4, clue: 'Belly button', answer: 'NAVEL', row: 2, col: 0, length: 5 },
        { number: 5, clue: 'Pharmacy purchase', answer: 'DRUG', row: 4, col: 1, length: 4 },
      ],
      down: [
        { number: 1, clue: 'Beer measure in a London pub', answer: 'PINT', row: 0, col: 0, length: 4 },
        { number: 2, clue: 'Thames, for one', answer: 'RIVER', row: 0, col: 2, length: 5 },
        { number: 3, clue: 'Connect to charge', answer: 'PLUG', row: 1, col: 4, length: 4 },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse optional days_ahead from request body
    let daysAhead = 8;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.days_ahead && typeof body.days_ahead === 'number' && body.days_ahead > 0) {
          daysAhead = body.days_ahead;
        }
      } catch {
        // No body or invalid JSON — use default
      }
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const results: { date: string; game_type: string; action: string }[] = [];
    const errors: { date: string; game_type: string; error: string }[] = [];

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = addDays(today, i);
      const dateStr = formatDate(targetDate);

      // --- Connections ---
      try {
        const { data: existing } = await supabase
          .from('daily_games')
          .select('id')
          .eq('game_type', 'connections')
          .eq('game_date', dateStr)
          .maybeSingle();

        if (existing) {
          results.push({ date: dateStr, game_type: 'connections', action: 'skipped' });
        } else {
          // Get next puzzle ID from sequence
          const { data: seqData } = await supabase.rpc('nextval_text', { seq_name: 'connections_puzzle_id_seq' }).single();
          const puzzleId = seqData ?? String(248 + i);

          const themeIndex = i % CONNECTIONS_THEMES.length;
          const theme = CONNECTIONS_THEMES[themeIndex];
          const puzzleData = {
            id: String(puzzleId),
            date: dateStr,
            groups: theme.map((group, idx) => ({
              ...group,
              color: GROUP_COLORS[idx],
            })),
          };

          const { error: insertErr } = await supabase.from('daily_games').insert({
            game_type: 'connections',
            game_date: dateStr,
            puzzle_data: puzzleData,
            is_published: true,
          });

          if (insertErr) {
            errors.push({ date: dateStr, game_type: 'connections', error: insertErr.message });
          } else {
            results.push({ date: dateStr, game_type: 'connections', action: 'created' });
          }
        }
      } catch (err) {
        errors.push({ date: dateStr, game_type: 'connections', error: String(err) });
      }

      // --- Crossword ---
      try {
        const { data: existing } = await supabase
          .from('daily_games')
          .select('id')
          .eq('game_type', 'crossword')
          .eq('game_date', dateStr)
          .maybeSingle();

        if (existing) {
          results.push({ date: dateStr, game_type: 'crossword', action: 'skipped' });
        } else {
          const { data: seqData } = await supabase.rpc('nextval_text', { seq_name: 'crossword_puzzle_id_seq' }).single();
          const puzzleId = seqData ?? String(3 + i);

          const poolIndex = i % CROSSWORD_POOL.length;
          const template = CROSSWORD_POOL[poolIndex];
          const puzzleData = {
            id: String(puzzleId),
            date: dateStr,
            ...template,
          };

          const { error: insertErr } = await supabase.from('daily_games').insert({
            game_type: 'crossword',
            game_date: dateStr,
            puzzle_data: puzzleData,
            is_published: true,
          });

          if (insertErr) {
            errors.push({ date: dateStr, game_type: 'crossword', error: insertErr.message });
          } else {
            results.push({ date: dateStr, game_type: 'crossword', action: 'created' });
          }
        }
      } catch (err) {
        errors.push({ date: dateStr, game_type: 'crossword', error: String(err) });
      }
    }

    const created = results.filter(r => r.action === 'created').length;
    const skipped = results.filter(r => r.action === 'skipped').length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: { created, skipped, errors: errors.length },
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
