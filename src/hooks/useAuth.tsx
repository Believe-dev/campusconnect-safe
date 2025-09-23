import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useNetworkStatus } from './useNetworkStatus';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    // Always load cached auth state first for immediate UI update
    const cachedUser = localStorage.getItem('cc_user');
    const cachedSession = localStorage.getItem('cc_session');
    if (cachedUser && cachedSession) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        const parsedSession = JSON.parse(cachedSession);
        setUser(parsedUser);
        setSession(parsedSession);
        checkAdminRole(parsedUser.id);
      } catch (error) {
        localStorage.removeItem('cc_user');
        localStorage.removeItem('cc_session');
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Cache auth state
        if (session?.user) {
          localStorage.setItem('cc_user', JSON.stringify(session.user));
          localStorage.setItem('cc_session', JSON.stringify(session));
          checkAdminRole(session.user.id);
        } else {
          // Clear all cached data when signed out
          localStorage.removeItem('cc_user');
          localStorage.removeItem('cc_session');
          localStorage.removeItem('profile-completion-dismissed');
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    // Check for existing session (only if online or no cached data)
    if (isOnline || (!cachedUser && !cachedSession)) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          localStorage.setItem('cc_user', JSON.stringify(session.user));
          localStorage.setItem('cc_session', JSON.stringify(session));
          checkAdminRole(session.user.id);
        } else {
          // Clear cached data if no valid session
          localStorage.removeItem('cc_user');
          localStorage.removeItem('cc_session');
          localStorage.removeItem('profile-completion-dismissed');
        }
        setLoading(false);
      }).catch(() => {
        // If session check fails, clear cached state
        localStorage.removeItem('cc_user');
        localStorage.removeItem('cc_session');
        localStorage.removeItem('profile-completion-dismissed');
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => subscription.unsubscribe();
  }, [isOnline]);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!roles);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  return { user, session, loading, isAdmin };
};