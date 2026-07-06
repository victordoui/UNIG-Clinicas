import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Warehouse, ShoppingCart, ShieldCheck, FileSignature, Vote, Eye, EyeOff, Truck, ClipboardList, Briefcase, HardHat, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import vstockLogo from "@/assets/unig-facilities-logo-v2.png";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function routeForUser(userId: string) {
      try {
        const [{ data: profileData }, { data: orgRow }, { data: supRow }] = await Promise.all([
          supabase.from("profiles").select("is_super_admin").eq("id", userId).maybeSingle(),
          supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle(),
          supabase
            .from("supplier_users")
            .select("supplier_id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle(),
        ]);

        if (supRow?.supplier_id) { navigate("/portal-fornecedor", { replace: true }); return; }
        if (profileData?.is_super_admin) { navigate("/", { replace: true }); return; }

        const role = (orgRow as any)?.role;
        if (role === "solicitante") navigate("/unigops/ci/public", { replace: true });
        else if (role === "patrimonio") navigate("/patrimonio", { replace: true });
        else navigate("/", { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) routeForUser(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Defer to avoid Supabase deadlock
        setTimeout(() => routeForUser(session.user.id), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if email is banned before attempting signup (simplified)
      // Note: This would require a proper database function to be implemented
      const isBanned = false; // Simplified for now

      if (isBanned) {
        setError("Este email foi banido do sistema e não pode se cadastrar.");
        toast({
          title: "Cadastro bloqueado",
          description: "Este email foi banido do sistema e não pode se cadastrar.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta.",
        });
        
        // Clear form after successful signup
        setEmail("");
        setPassword("");
        setFullName("");
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
      toast({
        title: "Erro interno",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (qEmail: string, qPassword: string) => {
    setLoading(true);
    setError(null);
    setEmail(qEmail);
    setPassword(qPassword);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: qEmail, password: qPassword });
      if (error) {
        setError(error.message);
        toast({ title: "Erro no login rápido", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Digite seu email primeiro");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique seu email para redefinir a senha.",
        });
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Botão de Tema no canto superior direito */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={vstockLogo} alt="UNIG Facilities Logo" className="h-32 md:h-40 w-auto" />
          </div>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Esqueci minha senha
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg border space-y-4">
              <h3 className="font-semibold text-sm">Acesso rápido (testes)</h3>

              {/* Administração */}
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Administração</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("admin@teste.com", "Teste@123")}>
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Admin
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("coord.operacoes@teste.com", "Teste@123")}>
                    <ClipboardList className="h-4 w-4 text-indigo-600" /> Coordenador de Operações
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("gerente.geral@teste.com", "Teste@123")}>
                    <Briefcase className="h-4 w-4 text-fuchsia-600" /> Gerente Geral
                  </Button>
                </div>
              </div>

              {/* Conselho */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conselho</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={loading}
                      onClick={() => quickLogin(`conselho${n}@teste.com`, "Teste@123")}
                    >
                      <Vote className="h-3.5 w-3.5 text-primary" /> Membro {n}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Validação */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Validação</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("engenheira@teste.com", "Teste@123")}>
                    <HardHat className="h-4 w-4 text-cyan-600" /> Engenheira
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("validador.regulatorio@teste.com", "Teste@123")}>
                    <ShieldCheck className="h-4 w-4 text-rose-600" /> Regulatório
                  </Button>
                </div>
              </div>

              {/* Compras */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Compras</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("comprador1@teste.com", "Teste@123")}>
                    <ShoppingCart className="h-4 w-4 text-emerald-700" /> Comprador 1 — Emerson
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("comprador2@teste.com", "Teste@123")}>
                    <ShoppingCart className="h-4 w-4 text-emerald-700" /> Comprador 2 — Renilson
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("comprador3@teste.com", "Teste@123")}>
                    <ShoppingCart className="h-4 w-4 text-emerald-700" /> Comprador 3 — Leonardo
                  </Button>
                </div>
              </div>

              {/* Almoxarifado */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Almoxarifado</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("almox@teste.com", "Teste@123")}>
                    <Warehouse className="h-4 w-4 text-amber-600" /> Funcionário Almoxarifado
                  </Button>
                </div>
              </div>

              {/* Patrimônio (teste) */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Patrimônio</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("teste2.patrimonio@teste.com", "Teste@123")}>
                    <Package className="h-4 w-4 text-blue-700" /> Teste 2 — Patrimônio
                  </Button>
                </div>
              </div>

              {/* Gestores — Central de Demandas */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gestores (Central de Demandas)</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("gestor1@teste.com", "Teste@123")}>
                    <Briefcase className="h-4 w-4 text-orange-600" /> Gestor 1
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("gestor2@teste.com", "Teste@123")}>
                    <Briefcase className="h-4 w-4 text-orange-600" /> Gestor 2
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("gestor3@teste.com", "Teste@123")}>
                    <Briefcase className="h-4 w-4 text-orange-600" /> Gestor 3
                  </Button>
                </div>
              </div>

              {/* CI */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CI</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("solicitante@teste.com", "Teste@123")}>
                    <FileSignature className="h-4 w-4 text-violet-600" /> Solicitante CI
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("odonto@teste.com", "Teste@123")}>
                    <FileSignature className="h-4 w-4 text-violet-600" /> Solicitante — Odonto
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("contabilidade@teste.com", "Teste@123")}>
                    <FileSignature className="h-4 w-4 text-violet-600" /> Solicitante — Contabilidade
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("rh@teste.com", "Teste@123")}>
                    <FileSignature className="h-4 w-4 text-violet-600" /> Solicitante — RH
                  </Button>
                </div>
              </div>

              {/* Fornecedor */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fornecedor</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loading}
                    onClick={() => quickLogin("fornecedor@teste.com", "Teste@123")}>
                    <Truck className="h-4 w-4 text-teal-600" /> Fornecedor (portal)
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-semibold text-sm mb-2">Precisa de uma conta?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para obter acesso ao sistema, entre em contato com o administrador.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> admin@unigops.com.br
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
