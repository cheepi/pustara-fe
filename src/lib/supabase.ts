import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          authors: string[];
          genres: string[];
          description: string | null;
          year: number | null;
          pages: number | null;
          isbn: string | null;
          language: string;
          cover_url: string | null;
          file_url: string | null;
          external_key: string | null;
          total_stock: number;
          available: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          rating_count: number | null;
          avg_rating: number | null;
          queue: number | null;
        };
        Insert: Omit<Database['public']['Tables']['books']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['books']['Insert']>;
      };
    };
  };
};
