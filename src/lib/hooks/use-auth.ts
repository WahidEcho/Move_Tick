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

      if (error) {
        setUser(null);
        return;
      }
      setUser(data as Profile);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, [getClient]);

  const signOut = useCallback(async () => {
    await getClient().auth.signOut();
    setUser(null);
    router.refresh();
  }, [getClient, router]);

  return { user, loading, signOut };
}
