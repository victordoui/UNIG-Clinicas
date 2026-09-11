import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogIn, Sparkles, Zap, Loader2 } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const demoGroups = useMemo(() => {
    const groups = new Map<string, typeof DEMO_USERS>();
    DEMO_USERS.forEach((demoUser) => {
      const group = groups.get(demoUser.accessGroup) ?? [];
      group.push(demoUser);
      groups.set(demoUser.accessGroup, group);
    });
    return Array.from(groups.entries());
  }, []);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    } else {
      navigate('/', { replace: true });
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
      navigate(role === 'paciente' ? '/portal/paciente' : role === 'tutor' ? '/portal/tutor' : '/', { replace: true });
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
              <CardTitle>Entrar</CardTitle>
              <CardDescription>Acesse com seu e-mail institucional e senha.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="senha">
                <TabsList className="grid grid-cols-1 mb-4">
                  <TabsTrigger value="senha"><LogIn className="h-4 w-4 mr-1.5" /> E-mail e senha</TabsTrigger>
                </TabsList>
                <TabsContent value="senha">
                  <form onSubmit={signIn} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@unig.br" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>
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
