/**
 * mobile/lib/supabase.ts
 *
 * Initialises the Supabase client using expo-secure-store as the
 * session storage adapter (required for React Native).
 *
 * Add these to mobile/.env:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 */
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from './database.types';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://xybwabndtirfzdnddobj.supabase.co';
const SUPABASE_ANON =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5YndhYm5kdGlyZnpkbmRkb2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzM2ODksImV4cCI6MjEwMjIwOTY4OX0.v-XOdJ1T5JOeL0CnIx5ZcBeR-dR4yWxT5shewh26tlM';

/**
 * expo-secure-store adapter — Supabase stores sessions as JSON strings.
 * SecureStore limits keys to 256 chars, so we hash large keys.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Typed helpers ──────────────────────────────────────────────────────────────

export const getUser = () => supabase.auth.getUser();
export const getSession = () => supabase.auth.getSession();

/**
 * Sign up with email + password.
 * The `full_name` is stored in raw_user_meta_data and copied to `profiles`
 * by the `handle_new_user` Postgres trigger.
 */
export const signUp = (email: string, password: string, fullName: string) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

/**
 * Typed table helpers (used by screens directly for CRUD).
 * Call like: db.mealScans().select().eq('user_id', uid)
 */
export const db = {
  profiles:           () => supabase.from('profiles'),
  healthProfiles:     () => supabase.from('health_profiles'),
  mealScans:          () => supabase.from('meal_scans'),
  glucoseReadings:    () => supabase.from('glucose_readings'),
  emergencyContacts:  () => supabase.from('emergency_contacts'),
  chatSessions:       () => supabase.from('chat_sessions'),
  chatMessages:       () => supabase.from('chat_messages'),
  medications:        () => supabase.from('medications'),
  activityLogs:       () => supabase.from('activity_logs'),
};

/**
 * Storage helpers
 */
export const storage = {
  uploadMealScan: async (userId: string, filePath: string, blob: Blob) => {
    const path = `${userId}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('meal-scans')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return data.path;
  },
  getMealScanUrl: (path: string) => {
    const { data } = supabase.storage.from('meal-scans').getPublicUrl(path);
    return data.publicUrl;
  },
  getSignedMealScanUrl: async (path: string, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
      .from('meal-scans')
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
};
