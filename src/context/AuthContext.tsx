import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase-client";
import { updatePushToken } from "../lib/push-notifications"; // Import helper


type AuthContextType = {
  session: Session | null;
  logout: () => Promise<void>;
  signUpAndSignOut: (params: any) => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const ignoreAuthUpdate = React.useRef(false);

  useEffect(() => {
    // get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      console.log("AuthContext: initial session:", session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AuthContext: onAuthStateChange", event, session);
      if (!ignoreAuthUpdate.current) {
        setSession(session ?? null);
      }
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  const logout = async () => {
    // Clear push token before signing out
    if (session?.user?.id) {
      await updatePushToken(session.user.id, null);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      if (error.message === "Auth session missing!") {
        setSession(null);
      } else {
        console.error("Logout error:", error);
      }
    }
  };

  const signUpAndSignOut = async (params: any) => {
    try {
      ignoreAuthUpdate.current = true;
      const result = await supabase.auth.signUp(params);
      
      if (result.data.session) {
        // Automatically sign out if session was created
        await supabase.auth.signOut();
      }
      return result;
    } finally {
      // Re-enable auth updates after a short delay to ensure signOut is processed
      setTimeout(() => {
        ignoreAuthUpdate.current = false;
      }, 500); 
    }
  };

  return (
    <AuthContext.Provider value={{ session, logout, signUpAndSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
