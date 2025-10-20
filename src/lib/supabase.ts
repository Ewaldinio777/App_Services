import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://tnosalzmequelibpoolp.supabase.co";
const supabasePublishableKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRub3NhbHptZXF1ZWxpYnBvb2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODA4MjksImV4cCI6MjA3NDY1NjgyOX0.JPFEQqsV9iOAsJiMvalhzi5v5jMzl-us1GcSEQu_fH8";
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
