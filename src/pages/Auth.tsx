import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Sparkles, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DEMO_USERS, UNIG_ROLE_LABEL, UNIG_ROLE_TEXT_COLOR, UNIG_ROLE_BADGE, UNIG_ROLE_ICON,
} from '@/lib/unigRoles';
import { cn } from '@/lib/utils';
import unigLogo from '@/assets/uniga-logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

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

  const signInDemo = async (demoEmail: string, demoPassword: string, label: string) => {
    setDemoLoading(demoEmail);
    const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
    if (error) {
      // Try seeding if user doesn't exist
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credential')) {
        toast({
          title: 'Usuários demo não criados',
          description: 'Clique em "Preparar usuários demo" primeiro.',
          variant: 'destructive',
        });
      } else {
        toast({ title: `Erro no acesso rápido (${label})`, description: error.message, variant: 'destructive' });
      }
    } else {
      navigate('/', { replace: true });
    }
    setDemoLoading(null);
  };

  const seedDemoUsers = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-users');
      if (error) throw error;
      toast({
        title: 'Usuários demo prontos',
        description: `${data?.created ?? 0} criados · ${data?.existed ?? 0} já existiam. Use os botões abaixo para entrar.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao preparar demos', description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      {/* Esquerda: branding */}
      <div
        className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(211 89% 30%) 0%, hsl(211 89% 45%) 50%, hsl(211 89% 55%) 100%)' }}
      >
        <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25) 0%, transparent 45%)' }} />
        <div className="relative flex flex-col items-start gap-4">
          <img
            src={unigLogo}
            alt="UNIG-A"
            className="h-24 w-24 object-contain [filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_3px_#fff)_drop-shadow(0_2px_6px_rgba(0,0,0,0.25))]"
          />
          <div>
            <div className="text-3xl font-bold">UNIG-A</div>
            <div className="text-xs text-white/80 uppercase tracking-widest">Portal Acadêmico Integrado</div>
          </div>
        </div>

        <div className="relative space-y-4 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Uma central única para toda a vida acadêmica.
          </h1>
          <p className="text-white/90 text-sm leading-relaxed">
            Aluno, professor, coordenação, secretaria e gestão em um único sistema —
            requerimentos, salas, agendas, financeiro e comunicação institucional integrados.
          </p>
        </div>
        <div className="relative text-xs text-white/70">© {new Date().getFullYear()} UNIG · Todos os direitos reservados</div>
      </div>

      {/* Direita: form + acessos rápidos */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="md:hidden flex flex-col items-center gap-2 justify-center mb-2">
            <div className="h-20 w-20 rounded-2xl bg-white border border-border shadow-md flex items-center justify-center p-2">
              <img src={unigLogo} alt="UNIG-A" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-xl text-primary">UNIG-A</span>
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
            <CardContent className="space-y-3">
              <Alert className="py-2 border-primary/30">
                <AlertDescription className="text-xs">
                  Primeira vez? <button onClick={seedDemoUsers} disabled={seeding} className="underline text-primary font-semibold disabled:opacity-50">
                    {seeding ? 'preparando…' : 'Preparar usuários demo'}
                  </button> antes de clicar em um perfil.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map((d) => {
                  const Icon = UNIG_ROLE_ICON[d.role];
                  const isLoading = demoLoading === d.email;
                  return (
                    <button
                      key={d.role}
                      onClick={() => signInDemo(d.email, d.password, UNIG_ROLE_LABEL[d.role])}
                      disabled={!!demoLoading}
                      className={cn(
                        'group rounded-lg border bg-card p-2.5 hover:shadow-md hover:border-primary/40 transition-all flex items-center gap-2 text-left min-w-0 disabled:opacity-60 disabled:pointer-events-none',
                      )}
                    >
                      <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0 border', UNIG_ROLE_BADGE[d.role])}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className={cn('h-4 w-4', UNIG_ROLE_TEXT_COLOR[d.role])} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-foreground truncate">{UNIG_ROLE_LABEL[d.role]}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{d.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
