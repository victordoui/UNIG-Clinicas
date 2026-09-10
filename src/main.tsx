import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// Remove o cache de respostas Supabase criado por versões anteriores do PWA.
// Dados clínicos nunca devem permanecer disponíveis offline neste dispositivo.
if (typeof window !== 'undefined' && 'caches' in window) {
  void window.caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith('supabase-api-cache')).map((key) => window.caches.delete(key))))
    .catch(() => undefined);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
