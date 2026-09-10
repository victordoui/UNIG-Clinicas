import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { supabaseConfigurationError } from './integrations/supabase/client'

// Remove o cache de respostas Supabase criado por versões anteriores do PWA.
// Dados clínicos nunca devem permanecer disponíveis offline neste dispositivo.
if (typeof window !== 'undefined' && 'caches' in window) {
  void window.caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith('supabase-api-cache')).map((key) => window.caches.delete(key))))
    .catch(() => undefined);
}

function ConfigurationRequired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-elevated">
        <p className="text-sm font-semibold text-primary">UNIG Clínicas</p>
        <h1 className="mt-2 text-2xl font-bold">Configuração necessária</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">{supabaseConfigurationError}</p>
        <p className="mt-4 rounded-lg bg-primary/5 p-4 text-sm text-foreground">No Netlify, acesse <strong>Site configuration → Environment variables</strong>, cadastre as duas variáveis e publique novamente.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigurationError ? <ConfigurationRequired /> : <BrowserRouter><App /></BrowserRouter>}
  </StrictMode>
)
