import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, KeyRound, LogIn, Mail, Sparkles, UserPlus, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DEMO_USERS, UNIG_ROLE_LABEL, UNIG_ROLE_TEXT_COLOR, UNIG_ROLE_BADGE, UNIG_ROLE_ICON,
} from '@/lib/unigRoles';
import { cn } from '@/lib/utils';
import unigLogo from '@/assets/unig-clinicas-logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(() => window.sessionStorage.getItem('unig-pending-guest-email') ?? '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'recovery' | 'new-password'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('type') === 'recovery' || window.location.hash.includes('type=recovery') ? 'new-password' : 'signin';
  });
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const postAuthDestination = useRef<string | null>(null);
  const pendingGuestClaim = useRef<Promise<void> | null>(null);
  const demoGroups = useMemo(() => {
    const groups = new Map<string, typeof DEMO_USERS>();
    DEMO_USERS.forEach((demoUser) => {
      const group = groups.get(demoUser.accessGroup) ?? [];
      group.push(demoUser);
      groups.set(demoUser.accessGroup, group);
    });
    return Array.from(groups.entries());
  }, []);

  const navigateAfterAuth = async (preferredPath?: string) => {
    if (!postAuthDestination.current) {
      const queueToken = window.sessionStorage.getItem('unig-pending-queue-token');
      if (queueToken) window.sessionStorage.removeItem('unig-pending-queue-token');
      postAuthDestination.current = preferredPath ?? (queueToken ? `/fila/qr/${queueToken}` : '/');
    }
    if (!pendingGuestClaim.current) {
      pendingGuestClaim.current = (async () => {
        const pendingEmail = window.sessionStorage.getItem('unig-pending-guest-email');
        if (!pendingEmail) return;
        const { data, error } = await (supabase.rpc as any)('claim_verified_guest_patient_account');
        if (error) {
          if (error.message.toLocaleLowerCase().includes('confirme seu e-mail')) {
            toast({ title: 'Confirme seu e-mail para concluir o vínculo', description: 'Depois de confirmar, entre novamente para vincular seu cadastro de visitante.' });
          }
          return;
        }
        if (Array.isArray(data) && data.length) toast({ title: 'Cadastro vinculado', description: 'Sua conta foi vinculada com segurança ao atendimento iniciado na fila.' });
        window.sessionStorage.removeItem('unig-pending-guest-email');
      })();
    }
    await pendingGuestClaim.current;
    navigate(postAuthDestination.current, { replace: true });
  };

  useEffect(() => {
    if (!loading && user && authMode !== 'new-password') void navigateAfterAuth();
  }, [user, loading, navigate, authMode]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    } else {
      await navigateAfterAuth();
    }
  };

  const signUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Senha muito curta', description: 'Use ao menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'As senhas não conferem', description: 'Revise a confirmação da senha.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Não foi possível criar a conta', description: error.message, variant: 'destructive' });
      return;
    }
    if (data.session) {
      toast({ title: 'Conta criada', description: 'Seu acesso foi criado. Complete seu cadastro na recepção antes de acessar dados clínicos.' });
      await navigateAfterAuth();
    } else {
      toast({ title: 'Confirme seu e-mail', description: 'Enviamos um link de confirmação para você ativar a conta.' });
      setAuthMode('signin');
    }
  };

  const sendRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth?type=recovery` });
    setSubmitting(false);
    if (error) toast({ title: 'Não foi possível enviar o link', description: error.message, variant: 'destructive' });
    else toast({ title: 'Confira seu e-mail', description: 'Se houver uma conta com este e-mail, enviaremos as instruções de recuperação.' });
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirmPassword) {
      toast({ title: 'Revise a nova senha', description: 'Use ao menos 8 caracteres e confirme a senha corretamente.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) toast({ title: 'Não foi possível atualizar a senha', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Senha atualizada', description: 'Agora você já pode entrar com a nova senha.' });
      setAuthMode('signin');
      navigate('/auth', { replace: true });
    }
  };

  const signInDemo = async (demoEmail: string, demoPassword: string, label: string, role?: string) => {
    setDemoLoading(demoEmail);
    const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
    if (error) {
      // Try seeding if user doesn't exist
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credential')) {
        toast({
          title: 'Acesso de teste indisponível',
          description: 'As contas de teste não foram criadas neste Supabase. Aplique a migration 20260911232000_seed_clinical_demo_accesses.sql e tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({ title: `Erro no acesso rápido (${label})`, description: error.message, variant: 'destructive' });
      }
    } else {
      await navigateAfterAuth(role === 'paciente' ? '/portal/paciente' : role === 'tutor' ? '/portal/tutor' : '/');
    }
    setDemoLoading(null);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Esquerda: branding */}
      <div
        className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #01413D 0%, #0A736B 58%, #08A899 100%)' }}
      >
        <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25) 0%, transparent 45%)' }} />
        <div className="relative flex flex-col items-start gap-4 pt-16">
          <img
            src={unigLogo}
            alt="UNIG Clínicas"
            className="h-auto w-full max-w-[560px] object-contain [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.85))_drop-shadow(0_2px_7px_rgba(0,0,0,0.18))]"
          />
        </div>

        <div className="relative space-y-4 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Atendimento e ensino clínico integrados em um só lugar.
          </h1>
          <p className="text-white/90 text-sm leading-relaxed">
            Uma base institucional preparada para atendimento, agenda, supervisão acadêmica
            e gestão das clínicas universitárias da UNIG.
          </p>
        </div>
        <div className="relative text-xs text-white/70">© {new Date().getFullYear()} UNIG · Todos os direitos reservados</div>
      </div>

      {/* Direita: form + acessos rápidos */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="md:hidden flex flex-col items-center gap-2 justify-center mb-2">
            <img
              src={unigLogo}
              alt="UNIG Clínicas"
              className="h-auto w-full max-w-[360px] object-contain [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.7))_drop-shadow(0_2px_5px_rgba(0,0,0,0.16))]"
            />
          </div>


          <Card>
            <CardHeader className="pb-4">
              <CardTitle>{authMode === 'signup' ? 'Criar conta' : authMode === 'recovery' ? 'Recuperar senha' : authMode === 'new-password' ? 'Definir nova senha' : 'Entrar'}</CardTitle>
              <CardDescription>{authMode === 'signup' ? 'Use seu e-mail para acompanhar próximos atendimentos e avisos.' : authMode === 'recovery' ? 'Enviaremos um link seguro para seu e-mail.' : authMode === 'new-password' ? 'Escolha uma senha nova e segura.' : 'Acesse com seu e-mail e senha.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode === 'signup' ? 'signup' : 'signin'} onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')}>
                <TabsList className="grid grid-cols-2 mb-4" hidden={authMode === 'recovery' || authMode === 'new-password'}>
                  <TabsTrigger value="signin" className="min-h-11"><LogIn className="h-4 w-4 mr-1.5" /> Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="min-h-11"><UserPlus className="h-4 w-4 mr-1.5" /> Criar conta</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" forceMount hidden={authMode !== 'signin'}>
                  <form onSubmit={signIn} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                      Entrar
                    </Button>
                    <Button type="button" variant="link" className="h-auto w-full px-0 text-sm" onClick={() => setAuthMode('recovery')}>Esqueci minha senha</Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" forceMount hidden={authMode !== 'signup'}>
                  <form onSubmit={signUp} className="space-y-3">
                    <div className="space-y-1.5"><Label htmlFor="signup-name">Nome completo</Label><Input id="signup-name" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como devemos chamar você" /></div>
                    <div className="space-y-1.5"><Label htmlFor="signup-phone">Celular com DDD</Label><Input id="signup-phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(21) 99999-9999" /></div>
                    <div className="space-y-1.5"><Label htmlFor="signup-email">E-mail</Label><Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></div>
                    <div className="space-y-1.5"><Label htmlFor="signup-password">Senha</Label><Input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Pelo menos 8 caracteres" /></div>
                    <div className="space-y-1.5"><Label htmlFor="signup-password-confirm">Confirmar senha</Label><Input id="signup-password-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita sua senha" /></div>
                    <p className="text-xs leading-relaxed text-muted-foreground">O cadastro cria seu acesso. Para proteger seu prontuário, a vinculação aos dados clínicos é validada pela clínica.</p>
                    <Button type="submit" className="h-11 w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}Criar conta</Button>
                  </form>
                </TabsContent>
                {authMode === 'recovery' && <form onSubmit={sendRecovery} className="space-y-3"><div className="space-y-1.5"><Label htmlFor="recovery-email">E-mail</Label><Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></div><Button type="submit" className="h-11 w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}Enviar link de recuperação</Button><Button type="button" variant="ghost" className="w-full" onClick={() => setAuthMode('signin')}><ArrowLeft className="h-4 w-4 mr-2" />Voltar para entrar</Button></form>}
                {authMode === 'new-password' && <form onSubmit={updatePassword} className="space-y-3"><div className="space-y-1.5"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Pelo menos 8 caracteres" /></div><div className="space-y-1.5"><Label htmlFor="new-password-confirm">Confirmar nova senha</Label><Input id="new-password-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" /></div><Button type="submit" className="h-11 w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}Atualizar senha</Button></form>}
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Acessos rápidos de teste
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ambiente de desenvolvimento. Um clique para entrar em cada perfil.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0"><Sparkles className="h-3 w-3 mr-1" /> Demo</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoGroups.map(([groupName, users]) => (
                <section key={groupName} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>{groupName}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {users.map((d) => {
                      const Icon = UNIG_ROLE_ICON[d.role];
                      const isLoading = demoLoading === d.email;
                      return (
                        <button
                          key={d.email}
                          onClick={() => signInDemo(d.email, d.password, d.label ?? UNIG_ROLE_LABEL[d.role], d.role)}
                          disabled={!!demoLoading}
                          className={cn(
                            'group rounded-lg border bg-card p-2.5 hover:shadow-md hover:border-primary/40 transition-all flex items-center gap-2 text-left min-w-0 disabled:opacity-60 disabled:pointer-events-none',
                          )}
                        >
                          <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0 border', UNIG_ROLE_BADGE[d.role])}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className={cn('h-4 w-4', UNIG_ROLE_TEXT_COLOR[d.role])} />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-foreground truncate">{d.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{d.email}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
