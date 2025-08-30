import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if variables are properly set in .env file
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Supabase URL or Anon Key is not set in .env file. Please check if variable names start with EXPO_PUBLIC_."
  );
  console.warn("[Supabase] Using fallback values for development...");
} else {
  console.log("[Supabase] Environment variables loaded successfully");
  console.log("[Supabase] URL:", supabaseUrl.substring(0, 20) + "...");
  console.log("[Supabase] Anon Key:", supabaseAnonKey.substring(0, 10) + "...");
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || "https://your-project.supabase.co", // Fallback URL
  supabaseAnonKey || "your-anon-key", // Fallback key
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Additional token refresh settings
      flowType: "pkce",
      debug: false, // Disable debug even in development mode
    },
  }
);

console.log("[Supabase] Client creation complete");
