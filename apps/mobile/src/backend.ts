import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Database } from "./database.types";
import { publicSupabaseConfig } from "./config";
const overrideUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const overrideKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasOverrides = !!(overrideUrl || overrideKey);
const url = hasOverrides ? overrideUrl : publicSupabaseConfig.url;
const key = hasOverrides ? overrideKey : publicSupabaseConfig.publishableKey;
// Web sessions stay in memory; never persist tokens in localStorage.
const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) =>
    Platform.OS === "web"
      ? Promise.resolve(memory.get(k) ?? null)
      : SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) =>
    Platform.OS === "web"
      ? Promise.resolve(void memory.set(k, v))
      : SecureStore.setItemAsync(k, v),
  removeItem: (k: string) =>
    Platform.OS === "web"
      ? Promise.resolve(void memory.delete(k))
      : SecureStore.deleteItemAsync(k),
};
export const supabase =
  url && key
    ? createClient<Database>(url, key, {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;
export function db() {
  if (!supabase) throw new Error("Amredi is not connected yet.");
  return supabase;
}
export type Programme = {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  schedule: string;
  cost_kes: number;
};
export type Profile = { id: string; display_name: string; goal: string | null };
export const goals = [
  "Return to education",
  "Learn a practical skill",
  "Build my livelihood",
  "Find a mentor",
];
