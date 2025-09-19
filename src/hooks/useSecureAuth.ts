import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useSecureAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setUser(null);
          setSessionValid(false);
        } else if (session?.user) {
          // Validate session is not expired
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at && session.expires_at > now) {
            setUser(session.user);
            setSessionValid(true);
          } else {
            // Session expired, sign out
            await supabase.auth.signOut();
            setUser(null);
            setSessionValid(false);
          }
        } else {
          setUser(null);
          setSessionValid(false);
        }
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
        setSessionValid(false);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setSessionValid(true);
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSessionValid(false);
            // Note: AI chat data is preserved across sessions
          } else if (session?.user) {
            setUser(session.user);
            setSessionValid(true);
          }
        }
        setLoading(false);
      }
    );

    // Session validation interval
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at <= now) {
          await supabase.auth.signOut();
        }
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { user, loading, sessionValid };
};