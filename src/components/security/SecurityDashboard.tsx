import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
  user?: {
    full_name: string;
  };
}

interface ActiveSession {
  id: string;
  session_id: string;
  user_id: string;
  last_activity: string;
  user_agent: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export function SecurityDashboard() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      // Use existing active_sessions table for active sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('active_sessions')
        .select('*')
        .order('last_activity', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch profiles separately to avoid relation issues
      const userIds = sessions?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Map sessions to expected format with profile data
      const mappedSessions = sessions?.map(session => {
        const profile = profiles?.find(p => p.id === session.user_id);
        return {
          ...session,
          session_id: session.session_id,
          user_agent: session.user_agent || 'Unknown',
          profiles: profile || {
            full_name: 'Usuário não identificado',
            email: 'N/A'
          }
        };
      }) || [];

      setSecurityEvents([]); // No security events for now
      setActiveSessions(mappedSessions);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSessions = async () => {
    try {
      // Clean up old sessions by updating is_active status
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      await supabase
        .from('active_sessions')
        .delete()
        .lt('last_activity', oneDayAgo.toISOString());
      
      // Re-fetch data
      await fetchSecurityData();
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sessões Ativas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Eventos de Segurança
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status do Sistema
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                Operacional
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sessões Ativas</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshSessions}>
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sessão ativa encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {session.profiles?.full_name || 'Usuário não identificado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.profiles?.email || 'Email não disponível'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.user_agent} • {new Date(session.last_activity).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Ativo
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Events Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos de Segurança Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum evento de segurança registrado</p>
            <p className="text-xs">O sistema de auditoria será implementado em breve</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}