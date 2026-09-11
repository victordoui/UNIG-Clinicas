import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { mapDbRoleToUnig, UnigRole } from '@/lib/unigRoles';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  document_number: string | null;
  status: string | null;
  is_super_admin: boolean;
  password_change_required: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isSuperAdmin: boolean;
  unigRole: UnigRole;
  clinicCodes: string[];
  activeClinicCode: string | null;
  setActiveClinicCode: (clinicCode: string | null) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isSuperAdmin: false,
  unigRole: 'visitante',
  clinicCodes: [],
  activeClinicCode: null,
  setActiveClinicCode: () => {},
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clinicCodes, setClinicCodes] = useState<string[]>([]);
  const [activeClinicCode, setActiveClinicCode] = useState<string | null>(null);

  const loadData = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase
        .from('user_roles')
        .select('id,role:roles(code)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    const p = profileRes.data as any;
    setProfile(p ?? null);
    setIsSuperAdmin(false);
    setDbRole((roleRes.data as any)?.role?.code ?? null);
    const assignmentId = (roleRes.data as any)?.id;
    if (assignmentId) {
      const { data: scopes } = await supabase.from('user_clinic_scopes').select('clinic:clinics(code)').eq('user_role_id', assignmentId).is('revoked_at', null);
      const codes = (scopes ?? []).map((scope: any) => scope.clinic?.code).filter(Boolean) as string[];
      setClinicCodes(codes);
      setActiveClinicCode((current) => current && codes.includes(current) ? current : (codes.length === 1 ? codes[0] : null));
    } else { setClinicCodes([]); setActiveClinicCode(null); }
  };

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        setTimeout(async () => {
          try { await loadData(s.user.id); } catch (e) { console.error(e); }
          finally { if (!cancelled) setLoading(false); }
        }, 0);
      } else {
        setProfile(null); setDbRole(null); setClinicCodes([]); setActiveClinicCode(null); setIsSuperAdmin(false); setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try { await loadData(session.user.id); } catch (e) { console.error(e); }
        finally { if (!cancelled) setLoading(false); }
      } else {
        setLoading(false);
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const refreshProfile = async () => { if (user) await loadData(user.id); };

  const signOut = async () => {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* local sign-out is best effort */ }
    setUser(null); setSession(null); setProfile(null); setDbRole(null); setClinicCodes([]); setActiveClinicCode(null); setIsSuperAdmin(false);
    if (typeof window !== 'undefined') window.location.href = '/auth';
  };

  const unigRole = mapDbRoleToUnig(dbRole, isSuperAdmin);

  return (
    <AuthContext.Provider value={{ user, session, profile, isSuperAdmin, unigRole, clinicCodes, activeClinicCode, setActiveClinicCode, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
