// // // // import { supabase } from './supabase';
// // // // import { Database } from './supabase';

// // // // /**
// // // //  * Get all books that don't have a file_url yet (for dropdown in admin)
// // // //  */
// // // // export async function getBooksWithoutFile() {
// // // //   const { data, error } = await supabase
// // // //     .from('books')
// // // //     .select('id, title, authors, genres, description, year, pages, isbn, language, total_stock, available')
// // // //     .is('file_url', null)
// // // //     .eq('is_active', true)
// // // //     .order('title', { ascending: true });

// // // //   if (error) {
// // // //     console.error('Error fetching books without file:', error);
// // // //     throw error;
// // // //   }

// // // //   return data || [];
// // // // }

// // // // /**
// // // //  * Get a specific book by ID for auto-fill
// // // //  */
// // // // export async function getBookById(id: string) {
// // // //   const { data, error } = await supabase
// // // //     .from('books')
// // // //     .select('*')
// // // //     .eq('id', id)
// // // //     .single();

// // // //   if (error && error.code !== 'PGRST116') {
// // // //     // PGRST116 is "not found" which is expected sometimes
// // // //     console.error('Error fetching book:', error);
// // // //     throw error;
// // // //   }

// // // //   return data;
// // // // }

// // // // /**
// // // //  * Upload PDF file to Supabase Storage
// // // //  */
// // // // import { createClient } from '@supabase/supabase-js';

// // // // // 1. Ambil env variables (Pastiin cuma pake URL dan ANON KEY, jangan pake service role key)
// // // // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // // // const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // // // // 2. Bikin client yang super polos.
// // // // // JANGAN ADA embel-embel global headers, Authorization, atau supabase.auth.setSession()
// // // // export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // // // export async function uploadPdfFile(file: File, bookId: string) {
// // // //   const fileName = `pdfs/${bookId}-${Date.now()}.pdf`;
  
// // // //   // 3. Upload file ke bucket 'books' pake klien anonim tadi
// // // //   const { data, error } = await supabase.storage
// // // //     .from('books')
// // // //     .upload(fileName, file, {
// // // //       cacheControl: '3600',
// // // //       upsert: true // Bikin true aja biar aman kalo ada nama file yg sama
// // // //     });

// // // //   if (error) {
// // // //     console.error("Supabase Upload Error Asli:", error);
// // // //     throw error; // Ini yang bikin pesan error ketangkep di frontend lu
// // // //   }
  
// // // //   // 4. Ambil Public URL-nya
// // // //   const { data: publicUrlData } = supabase.storage
// // // //     .from('books')
// // // //     .getPublicUrl(fileName);
    
// // // //   return publicUrlData.publicUrl;
// // // // }

// // // // /**
// // // //  * Update existing book with file_url and metadata changes
// // // //  */
// // // // export async function updateBookWithFile(
// // // //   bookId: string,
// // // //   updates: Partial<Database['public']['Tables']['books']['Update']>,
// // // //   fileUrl: string
// // // // ) {
// // // //   const { data, error } = await supabase
// // // //     .from('books')
// // // //     .update({
// // // //       ...updates,
// // // //       file_url: fileUrl,
// // // //       updated_at: new Date().toISOString(),
// // // //     })
// // // //     .eq('id', bookId)
// // // //     .select()
// // // //     .single();

// // // //   if (error) {
// // // //     console.error('Error updating book:', error);
// // // //     throw error;
// // // //   }

// // // //   return data;
// // // // }

// // // // /**
// // // //  * Create a new book entry
// // // //  */
// // // // export async function createNewBook(
// // // //   bookData: Omit<Database['public']['Tables']['books']['Insert'], 'created_at' | 'updated_at'>,
// // // //   fileUrl: string
// // // // ) {
// // // //   const { data, error } = await supabase
// // // //     .from('books')
// // // //     .insert([
// // // //       {
// // // //         ...bookData,
// // // //         file_url: fileUrl,
// // // //         created_at: new Date().toISOString(),
// // // //         updated_at: new Date().toISOString(),
// // // //       } as any,
// // // //     ])
// // // //     .select()
// // // //     .single();

// // // //   if (error) {
// // // //     console.error('Error creating book:', error);
// // // //     throw error;
// // // //   }

// // // //   return data;
// // // // }

// // // // /**
// // // //  * Delete uploaded file from storage
// // // //  */
// // // // export async function deleteUploadedFile(fileUrl: string) {
// // // //   // Extract path from public URL
// // // //   // Format: https://[project].supabase.co/storage/v1/object/public/books/pdfs/[filename]
// // // //   const path = fileUrl.split('/storage/v1/object/public/books/')[1];

// // // //   if (!path) {
// // // //     console.warn('Could not extract path from URL:', fileUrl);
// // // //     return;
// // // //   }

// // // //   const { error } = await supabase.storage.from('books').remove([path]);

// // // //   if (error) {
// // // //     console.error('Error deleting file:', error);
// // // //     throw error;
// // // //   }
// // // // }

// // // import { createClient } from '@supabase/supabase-js';
// // // import { Database } from './supabase';

// // // // 1. Ambil env variables
// // // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // // const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // // // 2. Bikin client yang super polos di satu tempat aja
// // // export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // // /**
// // //  * Get all books that don't have a file_url yet (for dropdown in admin)
// // //  */
// // // export async function getBooksWithoutFile() {
// // //   const { data, error } = await supabase
// // //     .from('books')
// // //     .select('id, title, authors, genres, description, year, pages, isbn, language, total_stock, available')
// // //     .is('file_url', null)
// // //     .eq('is_active', true)
// // //     .order('title', { ascending: true });

// // //   if (error) {
// // //     console.error('Error fetching books without file:', error);
// // //     throw error;
// // //   }

// // //   return data || [];
// // // }

// // // /**
// // //  * Get a specific book by ID for auto-fill
// // //  */
// // // export async function getBookById(id: string) {
// // //   const { data, error } = await supabase
// // //     .from('books')
// // //     .select('*')
// // //     .eq('id', id)
// // //     .single();

// // //   if (error && error.code !== 'PGRST116') {
// // //     console.error('Error fetching book:', error);
// // //     throw error;
// // //   }

// // //   return data;
// // // }

// // // /**
// // //  * Upload PDF file to Supabase Storage
// // //  */
// // // export async function uploadPdfFile(file: File, bookId: string) {
// // //   const fileName = `pdfs/${bookId}-${Date.now()}.pdf`;
  
// // //   // 3. Upload file ke bucket 'books' pake klien anonim tadi
// // //   const { data, error } = await supabase.storage
// // //     .from('books')
// // //     .upload(fileName, file, {
// // //       cacheControl: '3600',
// // //       upsert: true
// // //     });

// // //   if (error) {
// // //     console.error("Supabase Upload Error Asli:", error);
// // //     throw error; 
// // //   }
  
// // //   // 4. Ambil Public URL-nya
// // //   const { data: publicUrlData } = supabase.storage
// // //     .from('books')
// // //     .getPublicUrl(fileName);
    
// // //   return publicUrlData.publicUrl;
// // // }

// // // /**
// // //  * Update existing book with file_url and metadata changes
// // //  */
// // // export async function updateBookWithFile(
// // //   bookId: string,
// // //   updates: Partial<Database['public']['Tables']['books']['Update']>,
// // //   fileUrl: string
// // // ) {
// // //   const { data, error } = await supabase
// // //     .from('books')
// // //     .update({
// // //       ...updates,
// // //       file_url: fileUrl,
// // //       updated_at: new Date().toISOString(),
// // //     })
// // //     .eq('id', bookId)
// // //     .select()
// // //     .single();

// // //   if (error) {
// // //     console.error('Error updating book:', error);
// // //     throw error;
// // //   }

// // //   return data;
// // // }

// // // /**
// // //  * Create a new book entry
// // //  */
// // // export async function createNewBook(
// // //   bookData: Omit<Database['public']['Tables']['books']['Insert'], 'created_at' | 'updated_at'>,
// // //   fileUrl: string
// // // ) {
// // //   const { data, error } = await supabase
// // //     .from('books')
// // //     .insert([
// // //       {
// // //         ...bookData,
// // //         file_url: fileUrl,
// // //         created_at: new Date().toISOString(),
// // //         updated_at: new Date().toISOString(),
// // //       } as any,
// // //     ])
// // //     .select()
// // //     .single();

// // //   if (error) {
// // //     console.error('Error creating book:', error);
// // //     throw error;
// // //   }

// // //   return data;
// // // }

// // // /**
// // //  * Delete uploaded file from storage
// // //  */
// // // export async function deleteUploadedFile(fileUrl: string) {
// // //   const path = fileUrl.split('/storage/v1/object/public/books/')[1];

// // //   if (!path) {
// // //     console.warn('Could not extract path from URL:', fileUrl);
// // //     return;
// // //   }

// // //   const { error } = await supabase.storage.from('books').remove([path]);

// // //   if (error) {
// // //     console.error('Error deleting file:', error);
// // //     throw error;
// // //   }
// // // }

// // import { createClient } from '@supabase/supabase-js';

// // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// // const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // // Client murni tanpa embel-embel token Firebase
// // export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// // // export async function uploadPdfFile(file: File, bookId: string) {
// // //   const fileName = `pdfs/${bookId}-${Date.now()}.pdf`;
  
// // //   const { error } = await supabase.storage
// // //     .from('pustara-storage') // GANTI 'pustara-storage' KALO NAMA BUCKET LU ITU
// // //     .upload(fileName, file, {
// // //       cacheControl: '3600',
// // //       upsert: true 
// // //     });

// // //   if (error) {
// // //     console.error("Supabase Upload Error Asli:", error);
// // //     throw error; 
// // //   }
  
// // //   // Return nama path-nya aja biar URL aman ga terekspos
// // //   return fileName;
// // // }


// // export async function uploadPdfFile(file: File, bookId: string) {
// //   const fileName = `pdfs/${bookId}-${Date.now()}.pdf`;
  
// //   const { error } = await supabase.storage
// //     .from('pustara-storage') 
// //     .upload(fileName, file, {
// //       cacheControl: '3600',
// //       upsert: false // <--- UBAH JADI FALSE BINGIT!
// //     });

// //   if (error) {
// //     console.error("Supabase Upload Error Asli:", error);
// //     throw error; 
// //   }
  
// //   return fileName;
// // }
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // Client bersih tanpa token Firebase
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export async function uploadPdfFile(file: File, bookId: string) {
//   const fileName = `pdfs/${bookId}-${Date.now()}.pdf`;
  
//   const { error } = await supabase.storage
//     .from('pustara-storage') 
//     .upload(fileName, file, {
//       cacheControl: '3600',
//       upsert: false // WAJIB FALSE biar RLS ga ngamuk
//     });

//   if (error) throw error;
//   return fileName;
// }

import { createClient } from '@supabase/supabase-js';
import { Database } from './supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client bersih tanpa token Firebase biar RLS Policy 'public' jalan
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get a specific book by ID for Reader & Details
 * Dibutuhkan oleh src/lib/reader.ts
 */
export async function getBookById(id: string) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching book from Supabase:', error);
    throw error;
  }

  return data;
}

/**
 * Get all books that don't have a file_url yet (for admin dropdown)
 */
export async function getBooksWithoutFile() {
  const { data, error } = await supabase
    .from('books')
    .select('id, title, authors, genres, description, year, pages, isbn, language, total_stock, available')
    .is('file_url', null)
    .eq('is_active', true)
    .order('title', { ascending: true });

  if (error) {
    console.error('Error fetching books without file:', error);
    throw error;
  }

  return data || [];
}

/**
 * Upload PDF file to Supabase Storage
 * Mengembalikan path file, bukan URL Full biar aman
 */
export async function uploadPdfFile(file: File, bookId: string) {
  const fileName = `pdfs/${bookId}-${Date.now()}.pdf`;
  
  const { error } = await supabase.storage
    .from('pustara-storage') 
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false // Wajib false biar ga kena blok RLS Policy
    });

  if (error) {
    console.error("Supabase Upload Error:", error);
    throw error; 
  }
  
  return fileName;
}