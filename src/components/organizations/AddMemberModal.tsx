import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: {
    id: string;
    name: string;
    max_users: number;
  } | null;
  onSuccess?: () => void;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export function AddMemberModal({ open, onOpenChange, organization, onSuccess }: AddMemberModalProps) {
  const { user } = useAuth();
  const [method, setMethod] = useState<'existing' | 'invite' | 'register'>('register');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState('user');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(true);
  const RESULTS_PER_PAGE = 10;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setRole('user');
      setInviteEmail('');
      setMethod('register');
      setCurrentPage(1);
      setTotalResults(0);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setGeneratePassword(true);
    }
  }, [open]);

  useEffect(() => {
    if (method === 'register' && generatePassword) {
      setNewUserPassword(generateRandomPassword());
    }
  }, [method, generatePassword]);

  const searchUsers = async (page = 1) => {
    if (!searchQuery.trim() || !organization) return;

    setSearching(true);
    try {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organization.id);

      const memberIds = members?.map(m => m.user_id) || [];

      const from = (page - 1) * RESULTS_PER_PAGE;
      const to = from + RESULTS_PER_PAGE - 1;

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .not('id', 'in', memberIds.length > 0 ? `(${memberIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .not('id', 'in', memberIds.length > 0 ? `(${memberIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
        .range(from, to);

      if (error) throw error;
      setSearchResults(data || []);
      setTotalResults(count || 0);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar usuários',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (method === 'existing' && searchQuery) {
        setCurrentPage(1);
        searchUsers(1);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, method]);

  const addExistingMember = async () => {
    if (!selectedUser || !organization || !user) return;

    setLoading(true);
    try {
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (count !== null && count >= organization.max_users) {
        toast({
          title: 'Limite atingido',
          description: `A organização atingiu o limite de ${organization.max_users} usuários`,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: selectedUser.id,
          role,
          invited_by: user.id,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Membro adicionado',
        description: `${selectedUser.full_name} foi adicionado à organização`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteByEmail = async () => {
    if (!inviteEmail.trim() || !organization || !user) return;

    setLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', inviteEmail)
        .single();

      if (existingUser) {
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('is_active', true);

        if (count !== null && count >= organization.max_users) {
          toast({
            title: 'Limite atingido',
            description: `A organização atingiu o limite de ${organization.max_users} usuários`,
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organization.id,
            user_id: existingUser.id,
            role,
            invited_by: user.id,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: 'Membro adicionado',
          description: `${existingUser.full_name} foi adicionado à organização`,
        });
      } else {
        const { error } = await supabase
          .from('organization_invitations')
          .insert({
            organization_id: organization.id,
            email: inviteEmail,
            role,
            invited_by: user.id,
          });

        if (error) throw error;

        toast({
          title: 'Convite enviado',
          description: `Um convite foi enviado para ${inviteEmail}`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const registerNewUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim() || !organization || !user) return;

    const password = generatePassword ? newUserPassword : (newUserPassword || generateRandomPassword());

    setLoading(true);
    try {
      // Verificar se a sessão está válida antes de chamar a edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sessão expirada. Por favor, recarregue a página e faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('create-organization-member', {
        body: {
          email: newUserEmail,
          full_name: newUserName,
          organization_id: organization.id,
          role,
          temporary_password: password,
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      toast({
        title: 'Usuário cadastrado',
        description: `${newUserName} foi cadastrado e adicionado à organização.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`Email: ${newUserEmail}\nSenha temporária: ${password}`);
              toast({ title: 'Copiado!', description: 'Credenciais copiadas para área de transferência' });
            }}
          >
            Copiar credenciais
          </Button>
        ),
      });

      // Aguardar um pouco antes de recarregar para garantir que o profile foi criado
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 500);
    } catch (error: any) {
      console.error('Error registering user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível cadastrar o usuário',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (method === 'register') {
      registerNewUser();
    } else if (method === 'existing') {
      addExistingMember();
    } else {
      inviteByEmail();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
          <DialogDescription>
            Adicione um novo membro para {organization?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Método</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'existing' | 'invite' | 'register')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="register" id="register" />
                  <Label htmlFor="register" className="cursor-pointer">Cadastrar novo usuário</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="cursor-pointer">Adicionar usuário existente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invite" id="invite" />
                  <Label htmlFor="invite" className="cursor-pointer">Convidar por email</Label>
                </div>
              </RadioGroup>

              {method === 'register' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-name">Nome completo *</Label>
                    <Input
                      id="new-name"
                      placeholder="João Silva"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-email">Email *</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="joao@empresa.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="new-password">Senha temporária</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="generate-pwd"
                          checked={generatePassword}
                          onCheckedChange={(checked) => setGeneratePassword(checked as boolean)}
                        />
                        <Label htmlFor="generate-pwd" className="text-sm cursor-pointer">
                          Gerar automaticamente
                        </Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="new-password"
                        type="text"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        disabled={generatePassword}
                        placeholder="Senha será gerada automaticamente"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(newUserPassword);
                          toast({ title: 'Senha copiada!' });
                        }}
                        disabled={!newUserPassword}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      O usuário poderá alterar a senha no primeiro login
                    </p>
                  </div>
                </div>
              )}
          </div>

          {method === 'existing' ? (
            <div className="space-y-2">
              <Label>Buscar usuário</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {method === 'existing' && searchQuery && (
                <div className="space-y-2">
                  {searching ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Buscando usuários...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum usuário encontrado com "{searchQuery}"
                    </p>
                  ) : (
                    <>
                      <div className="border rounded-md p-2 space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-accent ${
                              selectedUser?.id === user.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            {selectedUser?.id === user.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {totalResults > RESULTS_PER_PAGE && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            Mostrando {searchResults.length} de {totalResults} resultados
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newPage = currentPage - 1;
                                setCurrentPage(newPage);
                                searchUsers(newPage);
                              }}
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newPage = currentPage + 1;
                                setCurrentPage(newPage);
                                searchUsers(newPage);
                              }}
                              disabled={currentPage >= Math.ceil(totalResults / RESULTS_PER_PAGE)}
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="organization_admin">Admin da Organização</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              (method === 'existing' && !selectedUser) ||
              (method === 'invite' && !inviteEmail.trim()) ||
              (method === 'register' && (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword))
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {method === 'existing' && 'Adicionar Membro'}
            {method === 'invite' && 'Enviar Convite'}
            {method === 'register' && 'Cadastrar e Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
