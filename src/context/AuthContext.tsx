import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase-client";

type AuthContextType = {
  session: Session | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
  navigationRef?: React.RefObject<any>;
}> = ({ children, navigationRef }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      if (session) {
        navigationRef?.current?.navigate("ManagerCrud", { session });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      if (session) {
        navigationRef?.current?.navigate("ManagerCrud", { session });
      } else {
        // clear stack and go to Auth when signed out
        navigationRef?.current?.reset?.({
          index: 0,
          routes: [{ name: "Auth" }],
        });
      }
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, [navigationRef]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error);
    setSession(null);
    navigationRef?.current?.reset?.({ index: 0, routes: [{ name: "Auth" }] });
  };

  return (
    <AuthContext.Provider value={{ session, logout }}>
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
