import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  tenantId: string | null;
  activeTenant: { id: string; name: string } | null;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loadUserContext: (userId: string) => Promise<void>;
  setActiveTenant: (tenant: { id: string; name: string } | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [activeTenant, setActiveTenant] = useState<{ id: string; name: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoLogoffMinutes, setAutoLogoffMinutes] = useState<number>(30);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Load user context and preferences
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            loadUserContext(session.user.id);
            loadUserPreferences(session.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTenantId(null);
          setIsSuperAdmin(false);
          setIsTenantAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserContext(session.user.id);
        loadUserPreferences(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserContext = async (userId: string) => {
    try {
      // @ts-ignore - Supabase types not yet updated after migration
      const { data, error } = await supabase
        // @ts-ignore
        .from('profiles')
        .select('tenant_id, tenant:tenants(id, name), user_roles(role)')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error loading user context:', error);
        setTenantId(null);
        setActiveTenant(null);
        setIsSuperAdmin(false);
        setIsTenantAdmin(false);
        return;
      }

      setTenantId(data?.tenant_id || null);
      
      // Set active tenant for non-super-admin users
      if (data?.tenant) {
        // @ts-ignore
        setActiveTenant(data.tenant);
      } else {
        setActiveTenant(null);
      }
      
      const roles = data?.user_roles || [];
      setIsSuperAdmin(roles.some((r: any) => r.role === 'super_admin'));
      setIsTenantAdmin(roles.some((r: any) => r.role === 'tenant_admin'));
    } catch (error) {
      console.error('Error loading user context:', error);
      setTenantId(null);
      setActiveTenant(null);
      setIsSuperAdmin(false);
      setIsTenantAdmin(false);
    }
  };

  const loadUserPreferences = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('auto_logoff_minutes')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.auto_logoff_minutes) {
        setAutoLogoffMinutes(data.auto_logoff_minutes);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  // Auto logoff functionality
  useEffect(() => {
    if (!user) return;

    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      
      // Set timeout based on user preference (convert minutes to milliseconds)
      timeout = setTimeout(() => {
        signOut();
      }, autoLogoffMinutes * 60 * 1000);
    };

    // Reset timer on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer
    resetTimer();

    return () => {
      if (timeout) clearTimeout(timeout);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, autoLogoffMinutes]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.user) {
      // Track login event (without PII)
      await supabase.from('user_access_logs').insert({
        user_id: data.user.id,
        event_type: 'login',
        event_data: null,
        user_agent: navigator.userAgent,
      });
      
      navigate('/');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (!error) {
      navigate('/');
    }
    
    return { error };
  };

  const signOut = async () => {
    if (user) {
      // Track logout event
      await supabase.from('user_access_logs').insert({
        user_id: user.id,
        event_type: 'logout',
        user_agent: navigator.userAgent,
      });
    }
    
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      tenantId,
      activeTenant,
      isSuperAdmin, 
      isTenantAdmin, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      loadUserContext,
      setActiveTenant
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
