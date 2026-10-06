import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AccountContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<{ user: User | null; ready: boolean }>({
    user: null,
    ready: false,
  });
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      if (active) {
        // Cancel and remove private data on every session change, including logout.
        void queryClient.cancelQueries({ queryKey: ["bookmarks"] });
        queryClient.removeQueries({ queryKey: ["bookmarks"] });
        setAccount({ user: session?.user ?? null, ready: true });
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data: sessionData }) => {
        if (active && !receivedEvent)
          setAccount({ user: sessionData.session?.user ?? null, ready: true });
      })
      .catch(() => {
        if (active && !receivedEvent) setAccount({ user: null, ready: true });
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
