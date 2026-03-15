export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          is_premium: boolean;
          city: string | null;
          borough: string | null;
          subscription_id: string | null;
          subscription_status: string | null;
          expires_at: string | null;
          apple_original_transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          is_premium?: boolean;
          city?: string | null;
          borough?: string | null;
          subscription_id?: string | null;
          subscription_status?: string | null;
          expires_at?: string | null;
          apple_original_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          is_premium?: boolean;
          city?: string | null;
          borough?: string | null;
          subscription_id?: string | null;
          subscription_status?: string | null;
          expires_at?: string | null;
          apple_original_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          city: string;
          borough: string | null;
          score: number;
          game_date: string;
          game_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          city: string;
          borough?: string | null;
          score: number;
          game_date?: string;
          game_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          city?: string;
          borough?: string | null;
          score?: number;
          game_date?: string;
          game_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      game_states: {
        Row: {
          id: string;
          user_id: string;
          game_type: 'connections' | 'crossword' | 'tictactoe';
          state: Json;
          last_updated: string;
          version: number;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          game_type: 'connections' | 'crossword' | 'tictactoe';
          state: Json;
          last_updated?: string;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_type?: 'connections' | 'crossword' | 'tictactoe';
          state?: Json;
          last_updated?: string;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_connections_play_count: {
        Args: { puzzle_date: string };
        Returns: number;
      };
      get_connections_play_counts: {
        Args: { puzzle_dates: string[] };
        Returns: Record<string, number>;
      };
      get_crossword_play_count: {
        Args: { puzzle_id: string };
        Returns: number;
      };
      get_crossword_play_counts: {
        Args: { puzzle_ids: string[] };
        Returns: Record<string, number>;
      };
    };
    Enums: Record<string, never>;
  };
}

/** Helper type for table row types */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
