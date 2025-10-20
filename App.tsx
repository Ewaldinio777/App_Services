import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import "@/global.css";

import { useState, useEffect, StrictMode } from "react";
import { supabase } from "@/src/lib/supabase-client";
import Auth from "@/src/navigation/screens/Auth";
import { View, Text } from "react-native";
import { Session } from "@supabase/supabase-js";
import ManagerCrud from "@/src/navigation/screens/ManagerCrud";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    // Subscribe to auth changes and store the subscription so we can unsubscribe on cleanup
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    // Cleanup listener on unmount (good practice)
    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      // Optionally show an alert or toast here (e.g., using react-native-toast-message)
    }
    // No need to manually update session; the listener handles it
  };

  return (
    <GluestackUIProvider mode="dark">
      <View style={{ flex: 1 }}>
        {session?.user && <Text>User ID: {session.user.id}</Text>}
        {session ? (
          <ManagerCrud
            key={session.user.id}
            session={session}
            logout={logout}
          />
        ) : (
          <Auth />
        )}
        <StatusBar style="auto" />
      </View>
    </GluestackUIProvider>
  );
}
