import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-bold text-primary">404</h1>
        <p className="text-lg text-muted-foreground">Página não encontrada</p>
        <a href="/" className="text-primary hover:underline font-medium">Voltar ao início</a>
      </div>
    </div>
  );
};

export default NotFound;
