import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://whxpvqdrgpxgjurvlczg.supabase.co";
const supabasePublishableKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeHB2cWRyZ3B4Z2p1cnZsY3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzEzNjEsImV4cCI6MjA3NTc0NzM2MX0.PHlg5ZIBE7o8aAUeHqYfopRvJ7nYqK1JzwVWMbbrhCQ";
export const supabase = createClient(supabaseUrl, supabasePublishableKey
//   , {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// }
);
