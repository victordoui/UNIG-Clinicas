import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { mapDbRoleToUnig, UnigRole } from '@/lib/unigRoles';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_super_admin: boolean;
  password_change_required: boolean;
  department: string | null;
  registration: string | null;
  whatsapp: string | null;
  job_role: string | null;
  nickname: string | null;
  birth_date: string | null;
  institutional_email: string | null;
}

interface OrganizationMembership {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: string;
  is_active: boolean;
}

interface SupplierLink {
  supplier_id: string;
  organization_id: string;
  supplier_name: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: OrganizationMembership | null;
  supplierLink: SupplierLink | null;
  isSuperAdmin: boolean;
  isCouncilMember: boolean;
  passwordChangeRequired: boolean;
  currentRole: 'admin' | 'gerente' | 'usuario';
  unigRole: UnigRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  organization: null,
  supplierLink: null,
  isSuperAdmin: false,
  isCouncilMember: false,
  passwordChangeRequired: false,
  currentRole: 'usuario',
  unigRole: 'visitante',
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Helper function to get effective role from organization membership or super admin status
const getEffectiveRole = (
  isSuperAdmin: boolean, 
  orgRole: string | null
): 'admin' | 'gerente' | 'usuario' => {
  if (isSuperAdmin) return 'admin';
  
  switch(orgRole) {
    case 'organization_admin': return 'admin';
    case 'manager': return 'gerente';
    case 'user': return 'usuario';
    default: return 'usuario';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<OrganizationMembership | null>(null);
  const [supplierLink, setSupplierLink] = useState<SupplierLink | null>(null);
  const [isCouncilMember, setIsCouncilMember] = useState(false);
  
  
  // ⚠️ SECURITY WARNING: Client-side auth state is for UI display only!
  // Never trust these values for authorization. All access control MUST be
  // enforced server-side via RLS policies and edge function validation.
  // These states can be manipulated in browser dev tools.
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [currentRole, setCurrentRole] = useState<'admin' | 'gerente' | 'usuario'>('usuario');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAllAuthData = async (sessionUser: User) => {
      const [profileRes, orgRes, supRes, cmRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle(),
        supabase
          .from('organization_members')
          .select(`organization_id, role, is_active, organizations (name, slug)`)
          .eq('user_id', sessionUser.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('supplier_users')
          .select('supplier_id, organization_id, suppliers(nome_fantasia)')
          .eq('user_id', sessionUser.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('council_members' as any)
          .select('id')
          .eq('user_id', sessionUser.id)
          .eq('ativo', true)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const profileData = profileRes.data as any;
      setProfile(profileData as unknown as Profile);
      setIsSuperAdmin(profileData?.is_super_admin || false);
      setPasswordChangeRequired(profileData?.password_change_required || false);

      let orgMembership: OrganizationMembership | null = null;
      if (orgRes.data && (orgRes.data as any).organizations) {
        orgMembership = {
          organization_id: (orgRes.data as any).organization_id,
          organization_name: (orgRes.data as any).organizations.name,
          organization_slug: (orgRes.data as any).organizations.slug,
          role: (orgRes.data as any).role,
          is_active: (orgRes.data as any).is_active,
        };
        setOrganization(orgMembership);
      } else {
        setOrganization(null);
      }
      setCurrentRole(getEffectiveRole(profileData?.is_super_admin || false, orgMembership?.role ?? null));

      if (supRes.data) {
        setSupplierLink({
          supplier_id: (supRes.data as any).supplier_id,
          organization_id: (supRes.data as any).organization_id,
          supplier_name: (supRes.data as any).suppliers?.nome_fantasia ?? null,
        });
      } else {
        setSupplierLink(null);
      }

      setIsCouncilMember(!!cmRes.data);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        setProfile(null);
        setOrganization(null);
        setSupplierLink(null);
        setIsCouncilMember(false);
        setIsSuperAdmin(false);
        setCurrentRole('usuario');
        // Defer to avoid deadlocks per Supabase recommendation
        setTimeout(async () => {
          try {
            await loadAllAuthData(session.user);
          } catch (e) {
            console.error('Error loading auth data:', e);
          } finally {
            if (!cancelled) setLoading(false);
          }
        }, 0);
      } else {
        setProfile(null);
        setOrganization(null);
        setSupplierLink(null);
        setIsCouncilMember(false);
        setIsSuperAdmin(false);
        setCurrentRole('usuario');
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          await loadAllAuthData(session.user);
        } catch (e) {
          console.error('Error loading auth data (getSession):', e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      setProfile(profileData as unknown as Profile);
    }
  };

  const signOut = async () => {
    // Best-effort: clean up active_sessions, ignore any failure
    try {
      if (user && session) {
        const encoder = new TextEncoder();
        const data = encoder.encode(session.access_token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sessionId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 36);
        await supabase
          .from('active_sessions')
          .delete()
          .eq('user_id', user.id)
          .eq('session_id', sessionId);
      }
    } catch (e) {
      console.warn('active_sessions cleanup failed:', e);
    }

    // Sign out locally first — this always clears the token from storage even if
    // the server-side session is already gone (403 session_not_found).
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('Local signOut failed:', e);
    }

    // Clear local state immediately
    // Clear local state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setSupplierLink(null);
    setIsSuperAdmin(false);
    setIsCouncilMember(false);
    setPasswordChangeRequired(false);

    // Belt-and-suspenders: purge any leftover supabase auth tokens in localStorage
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-') && k.includes('-auth-token')) {
          localStorage.removeItem(k);
        }
      });
    } catch {}

    // Force navigation to auth so the user is never stuck on a protected page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  };

  const unigRole: UnigRole = mapDbRoleToUnig(organization?.role ?? null, isSuperAdmin, !!supplierLink, isCouncilMember);

  return (
    <AuthContext.Provider value={{ user, session, profile, organization, supplierLink, isSuperAdmin, isCouncilMember, passwordChangeRequired, currentRole, unigRole, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};