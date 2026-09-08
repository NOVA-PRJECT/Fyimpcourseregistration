import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../config/constants';
import { queryClient } from '../lib/query-client';
import { setOnUnauthorizedCallback } from '../api/client';
import { ProfileResponseSchema } from '../api/schemas/auth.schema';
import { API_ENDPOINTS } from '../api/endpoints';

export interface UserProfile {
  id?: string;
  full_name?: string | null;
  current_semester?: number | null;
  department_id?: string | null;
  campus_id?: string | null;
  department_name?: string | null;
  campus_name?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ role: UserRole; redirectTo?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch user role and detailed profile from backend or fallback to user metadata
  const fetchProfileAndRole = useCallback(
    async (currentSession: Session): Promise<{ role: UserRole; profile: UserProfile } | null> => {
      try {
        const token = currentSession.access_token;
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:4000'}${API_ENDPOINTS.AUTH_PROFILE}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const rawData = await response.json();
          const parsed = ProfileResponseSchema.safeParse(rawData);
          if (parsed.success) {
            const fetchedRole = parsed.data.role as UserRole;
            const p = parsed.data.profile;
            const profileData: UserProfile = {
              id: currentSession.user.id,
              full_name: p.full_name,
              current_semester: p.current_semester,
              department_id: p.department_id,
              campus_id: p.campus_id,
              department_name: p.departments?.name,
              campus_name: p.campuses?.name,
            };
            return { role: fetchedRole, profile: profileData };
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Backend profile fetch failed, checking metadata:', err);
      }

      // Fallback to app_metadata or user_metadata embedded in Supabase JWT
      const metaRole =
        (currentSession.user.app_metadata?.role as UserRole) ||
        (currentSession.user.user_metadata?.role as UserRole);

      if (metaRole) {
        return {
          role: metaRole,
          profile: {
            id: currentSession.user.id,
            full_name:
              currentSession.user.user_metadata?.full_name ||
              currentSession.user.email?.split('@')[0] ||
              'User',
            department_id: currentSession.user.app_metadata?.department_id,
            campus_id: currentSession.user.app_metadata?.campus_id,
          },
        };
      }

      return null;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] Sign out error:', err);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      setProfile(null);
      queryClient.clear();
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const result = await fetchProfileAndRole(session);
    if (result) {
      setRole(result.role);
      setProfile(result.profile);
    }
  }, [session, fetchProfileAndRole]);

  // Handle 401 interceptor trigger
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      logout();
    });
  }, [logout]);

  // Initial session restoration on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setRole(null);
            setProfile(null);
            setIsLoading(false);
          }
          return;
        }

        const currentSession = data.session;
        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession.user);
        }

        const roleResult = await fetchProfileAndRole(currentSession);
        if (isMounted) {
          if (roleResult) {
            setRole(roleResult.role);
            setProfile(roleResult.profile);
          }
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[AuthContext] Initialization error:', e);
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to token refresh and auth events from Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setUser(null);
        setRole(null);
        setProfile(null);
        queryClient.clear();
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession.user);
        const result = await fetchProfileAndRole(newSession);
        if (result && isMounted) {
          setRole(result.role);
          setProfile(result.profile);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRole]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ role: UserRole; redirectTo?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.session) {
        throw new Error(error?.message || 'Invalid email or password');
      }

      setSession(data.session);
      setUser(data.user);

      const result = await fetchProfileAndRole(data.session);
      if (!result) {
        throw new Error('Could not resolve user role. Contact administration.');
      }

      setRole(result.role);
      setProfile(result.profile);

      return { role: result.role };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        profile,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
