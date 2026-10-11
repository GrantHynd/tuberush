-- Custom puzzles table: stores user-generated puzzles with personal scores
create table if not exists public.custom_puzzles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  game_type text not null check (game_type in ('connections', 'crossword')),
  puzzle_data jsonb not null,
  score integer, -- time in seconds (lower is better), null until completed
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- Index for efficient user-specific queries
create index idx_custom_puzzles_user_id on public.custom_puzzles(user_id);
create index idx_custom_puzzles_user_game_type on public.custom_puzzles(user_id, game_type);

-- RLS: users can only access their own custom puzzles
alter table public.custom_puzzles enable row level security;

create policy "Users can view their own custom puzzles"
  on public.custom_puzzles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom puzzles"
  on public.custom_puzzles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom puzzles"
  on public.custom_puzzles for update
  using (auth.uid() = user_id);
