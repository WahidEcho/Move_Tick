import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { Profile } from '@/types/database.types';

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Lazily create the client so it is never instantiated during SSR
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getClient = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  useEffect(() => {
    const supabase = getClient();

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setUser(error ? null : (data as Profile));
      setLoading(false);
    };

    // IMPORTANT: this callback must stay synchronous. auth-js holds its
    // internal navigator lock while notifying subscribers — awaiting any
    // supabase call in here deadlocks that lock and freezes every later auth
    // call in the tab (frozen login button, hanging getUser()). Deferring via
    // setTimeout runs the query after the lock is released.
    // (INITIAL_SESSION fires on subscribe, so no separate getSession() needed.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const userId = session.user.id;
          setTimeout(() => void fetchProfile(userId), 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [getClient]);

  const signOut = useCallback(async () => {
    await getClient().auth.signOut();
    setUser(null);
    router.refresh();
  }, [getClient, router]);

  return { user, loading, signOut };
}
