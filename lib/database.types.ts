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
          borough: string | null;
          stripe_customer_id: string | null;
          subscription_id: string | null;
          subscription_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          is_premium?: boolean;
          borough?: string | null;
          stripe_customer_id?: string | null;
          subscription_id?: string | null;
          subscription_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          is_premium?: boolean;
          borough?: string | null;
          stripe_customer_id?: string | null;
          subscription_id?: string | null;
          subscription_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          borough: string;
          score: number;
          game_date: string;
          game_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          borough: string;
          score: number;
          game_date?: string;
          game_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          borough?: string;
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
          game_type: 'tictactoe' | 'crossword';
          state: Json;
          last_updated: string;
          version: number;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          game_type: 'tictactoe' | 'crossword';
          state: Json;
          last_updated?: string;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_type?: 'tictactoe' | 'crossword';
          state?: Json;
          last_updated?: string;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: string;
          price_id: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at: string | null;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: string;
          price_id: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          status?: string;
          price_id?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

/** Helper type for table row types */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
