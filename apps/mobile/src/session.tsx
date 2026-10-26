import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./backend";
const Context = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
});
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const cache = useQueryClient();
  useEffect(() => {
    if (!supabase) {
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setSession(error ? null : data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (active) {
        if (event === "SIGNED_OUT") cache.clear();
        setSession(next);
        setLoading(false);
      }
    });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      app.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, [cache]);
  return (
    <Context.Provider value={{ session, loading }}>{children}</Context.Provider>
  );
}
export const useSession = () => useContext(Context);
