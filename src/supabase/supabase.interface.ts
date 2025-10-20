// Definisi interface untuk tipe data Supabase
export interface SupabaseUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface SupabaseFile {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  path: string;
  created_at: string;
  updated_at: string;
}
