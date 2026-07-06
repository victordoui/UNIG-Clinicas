import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowRightLeft, TrendingUp, Shield, Zap, Package, CheckCircle2, BarChart3, Clock, Sparkles, ArrowRight, Star } from "lucide-react";
import { useSessionTracking } from "@/hooks/useSessionTracking";
import vstockLogo from "@/assets/unig-facilities-logo-v2.png";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Track user session when logged in
  useSessionTracking();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Set light mode as default
    const theme = localStorage.getItem('theme');
    if (!theme) {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Package,
      title: "Gestão de Produtos",
      description: "Controle completo do catálogo de produtos com códigos QR e localização.",
      gradient: "from-blue-500/10 to-cyan-500/10"
    },
    {
      icon: ArrowRightLeft,
      title: "Movimentações",
      description: "Registre entradas, saídas e transferências com histórico completo.",
      gradient: "from-purple-500/10 to-pink-500/10"
    },
    {
      icon: TrendingUp,
      title: "Relatórios",
      description: "Análises detalhadas e relatórios personalizáveis para tomada de decisão.",
      gradient: "from-green-500/10 to-emerald-500/10"
    },
    {
      icon: Users,
      title: "Controle de Usuários",
      description: "Sistema de permissões com diferentes níveis de acesso.",
      gradient: "from-orange-500/10 to-amber-500/10"
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Autenticação robusta e controle de sessões ativas.",
      gradient: "from-red-500/10 to-rose-500/10"
    },
    {
      icon: Zap,
      title: "Alertas Inteligentes",
      description: "Notificações automáticas para estoque baixo e outras situações críticas.",
      gradient: "from-violet-500/10 to-indigo-500/10"
    }
  ];

  const processSteps = [
    {
      icon: CheckCircle2,
      title: "Cadastro Simples",
      description: "Configure seu sistema em minutos"
    },
    {
      icon: BarChart3,
      title: "Gestão Completa",
      description: "Controle total de produtos e movimentações"
    },
    {
      icon: TrendingUp,
      title: "Análise Inteligente",
      description: "Relatórios e insights em tempo real"
    },
    {
      icon: Sparkles,
      title: "Resultados Rápidos",
      description: "Otimize processos e reduza custos"
    }
  ];

  const stats = [
    { value: "90%", label: "Redução em Erros", icon: CheckCircle2 },
    { value: "50%", label: "Economia de Tempo", icon: Clock },
    { value: "100%", label: "Controle do Estoque", icon: Shield },
    { value: "24/7", label: "Suporte Disponível", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-lg shadow-md border-b' : 'border-b'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
              <img src={vstockLogo} alt="UNIG Facilities Logo" className="h-12 w-auto transition-transform duration-300 group-hover:scale-110" />
            </div>
            <Button 
              onClick={() => navigate('/auth')}
              className="relative overflow-hidden group"
            >
              <span className="relative z-10">Entrar</span>
              <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-32 px-4 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        
        <div className="container mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Sistema Completo de Gestão</span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Gerencie seu Almoxarifado com
            <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent animate-pulse-slow">
              Inteligência
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Sistema completo para controle de estoque, movimentações e relatórios.
            Tenha total visibilidade e controle sobre seus produtos e processos.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
            >
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 hover:bg-primary/5 transition-all duration-300"
            >
              Saiba Mais
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: Users, label: "500+ Empresas" },
              { icon: Package, label: "1M+ Produtos" },
              { icon: TrendingUp, label: "99.9% Uptime" },
              { icon: Star, label: "4.9/5 Avaliação" }
            ].map((stat, index) => (
              <div key={index} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 backdrop-blur-sm hover:bg-muted/50 transition-all duration-300 hover:scale-105">
                <stat.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-gradient-to-br from-muted/30 via-background to-muted/20 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-6">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Funcionalidades
              </span>
              {" "}Principais
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Tudo que você precisa para gerenciar seu almoxarifado de forma eficiente e profissional.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="group relative">
                {/* Card Number */}
                <div className="absolute -top-4 -left-4 text-7xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors duration-300">
                  {String(index + 1).padStart(2, '0')}
                </div>
                
                <Card className="relative h-full border-2 border-transparent bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden group">
                  {/* Gradient Background on Hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Animated Border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ height: '2px' }} />
                  
                  <CardHeader className="relative pb-4 space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
                      <feature.icon className="h-10 w-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-muted-foreground leading-relaxed text-base">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-6">
              Como <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Funciona</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simplifique sua gestão de estoque em 4 passos simples
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connection Line */}
              <div className="hidden lg:block absolute top-20 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
              
              {processSteps.map((step, index) => (
                <div key={index} className="relative group">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Icon Circle */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-300 relative z-10">
                        <step.icon className="h-12 w-12 text-white" />
                      </div>
                      {/* Pulse Effect */}
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-75" />
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-6">
              Benefícios em <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Números</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Resultados comprovados que fazem a diferença no seu negócio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="group relative p-8 rounded-2xl bg-card border-2 border-border hover:border-primary/30 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
                
                <div className="relative space-y-4">
                  <stat.icon className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-lg font-medium text-foreground">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        
        {/* Floating Gradient Blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Glassmorphism Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />
              
              <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-16 shadow-2xl border-2 border-primary/10">
                {/* Icon */}
                <div className="w-28 h-28 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                  <Package className="h-14 w-14 text-white" />
                </div>

                {/* Content */}
                <h2 className="text-6xl font-bold text-foreground mb-8">
                  Pronto para <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">começar?</span>
                </h2>
                
                <p className="text-2xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
                  Transforme a gestão do seu almoxarifado hoje mesmo com nossa plataforma inteligente.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/auth')} 
                    className="text-xl px-12 py-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-2xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-110 group"
                  >
                    Acessar Sistema
                    <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-xl px-12 py-8 border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                  >
                    Saiba Mais
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="mt-12 flex items-center justify-center gap-8 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Sem cartão de crédito</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Configuração em minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Suporte dedicado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="space-y-4">
              <img src={vstockLogo} alt="UNIG Facilities Logo" className="h-12 w-auto" />
              <p className="text-sm text-muted-foreground">
                Sistema de Almoxarifado Inteligente para empresas modernas.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Recursos</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Preços</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Integrações</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sobre</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Documentação</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Ajuda</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 UNIG Facilities. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
