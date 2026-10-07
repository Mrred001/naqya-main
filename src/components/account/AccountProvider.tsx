import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AccountContextValue = {
  user: User | null;
  ready: boolean;
  refreshSession: () => Promise<{ user: User | null; error: unknown | null }>;
};

const AccountContext = createContext<AccountContextValue>({
  user: null,
  ready: false,
  refreshSession: async () => ({ user: null, error: null }),
});
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<{ user: User | null; ready: boolean }>({
    user: null,
    ready: false,
  });
  const authEventVersion = useRef(0);
  const queryClient = useQueryClient();
  const refreshSession = useCallback(async () => {
    const version = authEventVersion.current;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { user: null, error };
      const user = data.session?.user ?? null;
      if (version !== authEventVersion.current) {
        return { user: null, error: new Error("The session changed while it was being checked.") };
      }
      setAccount({ user, ready: true });
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }, []);
  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      authEventVersion.current += 1;
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
  return (
    <AccountContext.Provider value={{ ...account, refreshSession }}>
      {children}
    </AccountContext.Provider>
  );
}
