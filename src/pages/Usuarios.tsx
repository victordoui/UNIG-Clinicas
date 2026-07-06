import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Search, Shield, Mail, Key, Settings, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { NewUserModal } from "@/components/users/NewUserModal";
import { CategoryNotificationModal } from "@/components/users/CategoryNotificationModal";
import { UserPermissionsModal } from "@/components/users/UserPermissionsModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { mapDbRoleToUnig, UNIG_ROLE_LABEL, UNIG_ROLE_BADGE, ASSIGNABLE_UNIG_ROLES, UNIG_ROLE_ICON, type UnigRole } from "@/lib/unigRoles";
import { RoleBadge } from "@/components/users/RoleBadge";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function Usuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Filtros avançados
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all | active | inactive
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [createdStart, setCreatedStart] = useState<Date | null>(null);
  const [createdEnd, setCreatedEnd] = useState<Date | null>(null);
  const [lastAccessStart, setLastAccessStart] = useState<Date | null>(null);
  const [lastAccessEnd, setLastAccessEnd] = useState<Date | null>(null);

  const { currentRole, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Valida sessão antes de invocar (padrão do projeto)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('list-organization-users');

      if (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Erro ao carregar usuários",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setUsers((data?.users ?? []) as any[]);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro interno",
        description: error?.message || "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const canManageUsers = isSuperAdmin || currentRole === 'admin';
  const canCreateUsers = isSuperAdmin || currentRole === 'admin';

  const handleOpenPermissionsModal = (userToEdit: any) => {
    setSelectedUser(userToEdit);
    setIsPermissionsModalOpen(true);
  };

  const getUnigRoleFor = (u: any): UnigRole =>
    u.source === 'supplier' || u.role === 'fornecedor'
      ? 'fornecedor'
      : mapDbRoleToUnig(u.role, !!u.is_super_admin, false);

  const getRoleBadge = (u: any) => {
    const role = getUnigRoleFor(u);
    return (
      <div className="flex flex-wrap gap-1">
        <RoleBadge role={role} />
        {u.is_council_member && (
          <RoleBadge role={'conselho' as UnigRole} className="bg-indigo-500/15 text-indigo-600 border-indigo-500/30" />
        )}
      </div>
    );
  };

  const getStatusBadge = (isActive: boolean = true) => {
    return isActive ?
      <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge> :
      <Badge variant="secondary">Inativo</Badge>;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => { if (u.department) set.add(u.department); });
    return Array.from(set).sort();
  }, [users]);

  const inRange = (value: string | null | undefined, start: Date | null, end: Date | null) => {
    if (!start && !end) return true;
    if (!value) return false;
    const d = new Date(value);
    if (start && d < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (d > endOfDay) return false;
    }
    return true;
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchesText =
      !term ||
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      UNIG_ROLE_LABEL[getUnigRoleFor(u)].toLowerCase().includes(term);
    if (!matchesText) return false;

    if (statusFilter === "active" && u.is_active === false) return false;
    if (statusFilter === "inactive" && u.is_active !== false) return false;

    if (roleFilter !== "all" && getUnigRoleFor(u) !== roleFilter) return false;

    if (departmentFilter !== "all" && (u.department || "") !== departmentFilter) return false;

    if (!inRange(u.created_at, createdStart, createdEnd)) return false;
    if (!inRange(u.last_sign_in_at, lastAccessStart, lastAccessEnd)) return false;

    return true;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active !== false).length;
  const countByRole = (role: UnigRole) => users.filter(u => getUnigRoleFor(u) === role).length;

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (statusFilter !== "all") activeFilters.push({ label: `Status: ${statusFilter === "active" ? "Ativo" : "Inativo"}`, clear: () => setStatusFilter("all") });
  if (roleFilter !== "all") activeFilters.push({ label: `Papel: ${UNIG_ROLE_LABEL[roleFilter as UnigRole] || roleFilter}`, clear: () => setRoleFilter("all") });
  if (departmentFilter !== "all") activeFilters.push({ label: `Setor: ${departmentFilter}`, clear: () => setDepartmentFilter("all") });
  if (createdStart || createdEnd) activeFilters.push({
    label: `Criado: ${createdStart ? format(createdStart, "dd/MM/yy") : "…"} - ${createdEnd ? format(createdEnd, "dd/MM/yy") : "…"}`,
    clear: () => { setCreatedStart(null); setCreatedEnd(null); }
  });
  if (lastAccessStart || lastAccessEnd) activeFilters.push({
    label: `Acesso: ${lastAccessStart ? format(lastAccessStart, "dd/MM/yy") : "…"} - ${lastAccessEnd ? format(lastAccessEnd, "dd/MM/yy") : "…"}`,
    clear: () => { setLastAccessStart(null); setLastAccessEnd(null); }
  });

  const clearAllFilters = () => {
    setStatusFilter("all");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setCreatedStart(null); setCreatedEnd(null);
    setLastAccessStart(null); setLastAccessEnd(null);
    setSearchTerm("");
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Header da página */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Usuários
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerenciamento de usuários e permissões do sistema
                </p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {(isSuperAdmin || currentRole === 'admin') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="btn-ripple hover-scale"
                    onClick={() => setIsNotificationModalOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Notificações
                  </Button>
                )}
                {canCreateUsers && (
                  <Button 
                    size="sm" 
                    className="bg-gradient-primary text-white btn-ripple hover-scale"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                )}
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Usuários</p>
                      <p className="text-2xl font-bold">{totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Users className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                      <p className="text-2xl font-bold">{activeUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <Shield className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Administradores</p>
                      <p className="text-2xl font-bold">{countByRole('administrador')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Users className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Solicitantes</p>
                      <p className="text-2xl font-bold">{countByRole('solicitante')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Filtros e busca */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="btn-ripple hover-scale">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {activeFilters.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{activeFilters.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="end">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Papel</Label>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {ASSIGNABLE_UNIG_ROLES.map(r => (
                              <SelectItem key={r} value={r}>{UNIG_ROLE_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Setor / Departamento</Label>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {departments.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Data de Criação</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start font-normal">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                              {createdStart ? format(createdStart, "dd/MM/yy") : "Início"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={createdStart || undefined} onSelect={(d) => setCreatedStart(d || null)} className="pointer-events-auto" /></PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start font-normal">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                              {createdEnd ? format(createdEnd, "dd/MM/yy") : "Fim"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={createdEnd || undefined} onSelect={(d) => setCreatedEnd(d || null)} className="pointer-events-auto" /></PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Último Acesso</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start font-normal">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                              {lastAccessStart ? format(lastAccessStart, "dd/MM/yy") : "Início"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={lastAccessStart || undefined} onSelect={(d) => setLastAccessStart(d || null)} className="pointer-events-auto" /></PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start font-normal">
                              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                              {lastAccessEnd ? format(lastAccessEnd, "dd/MM/yy") : "Fim"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={lastAccessEnd || undefined} onSelect={(d) => setLastAccessEnd(d || null)} className="pointer-events-auto" /></PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" onClick={clearAllFilters}>
                      <X className="h-4 w-4 mr-2" /> Limpar todos
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 animate-fade-in">
                {activeFilters.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pl-2 pr-1">
                    {f.label}
                    <button type="button" onClick={f.clear} className="hover:bg-background/50 rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>Limpar tudo</Button>
              </div>
            )}

            {/* Tabela de usuários */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuários ({filteredUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse-slow">Carregando usuários...</div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {activeFilters.length > 0 || searchTerm ? "Nenhum usuário encontrado com os filtros atuais." : "Nenhum usuário cadastrado ainda."}
                  </div>
                ) : (
                  <div className="overflow-x-auto animate-fade-in">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último Acesso</TableHead>
                          <TableHead>Criado em</TableHead>
                          {canManageUsers && <TableHead>Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userItem) => (
                          <TableRow key={userItem.id} className="hover:bg-muted/50 smooth-transition">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={userItem.avatar_url || undefined} />
                                  <AvatarFallback>{getInitials(userItem.full_name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{userItem.full_name || "Nome não definido"}</div>
                                  <div className="text-xs text-muted-foreground">{userItem.job_role || `ID: ${userItem.id.slice(0, 8)}...`}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                {userItem.email}
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(userItem)}</TableCell>
                            <TableCell className="text-sm">{userItem.department || "—"}</TableCell>
                            <TableCell>{getStatusBadge(userItem.is_active !== false)}</TableCell>
                            <TableCell className="text-sm">{formatDateTime(userItem.last_sign_in_at)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDateTime(userItem.created_at)}
                            </TableCell>
                             {canManageUsers && (
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="hover-scale"
                                    onClick={() => handleOpenPermissionsModal(userItem)}
                                    title="Gerenciar Permissões"
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Convites movidos para /admin/convites */}



            {/* Níveis de permissão */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Acesso Oficiais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { role: 'super_admin' as UnigRole, desc: 'Gerencia todas as organizações.' },
                    { role: 'administrador' as UnigRole, desc: 'Acesso total dentro da organização; gerencia usuários e papéis.' },
                    { role: 'compras' as UnigRole, desc: 'Cotações, pedidos, kanban de compras e fornecedores.' },
                    { role: 'almoxarifado' as UnigRole, desc: 'Movimentações, produtos, recebimentos e alertas de estoque.' },
                    { role: 'solicitante' as UnigRole, desc: 'Cria e acompanha Requisições de Compra (CI).' },
                    { role: 'fornecedor' as UnigRole, desc: 'Acessa apenas o Portal do Fornecedor (licitações, itens, pedidos).' },
                    { role: 'visitante' as UnigRole, desc: 'Acesso cru, sem permissões. Aguarda atribuição de papel pelo admin.' },
                  ].map(({ role, desc }) => (
                    <div key={role} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={cn("border", UNIG_ROLE_BADGE[role])}>
                          {UNIG_ROLE_LABEL[role]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border bg-indigo-500/15 text-indigo-600 border-indigo-500/30">
                        Conselho
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Flag complementar (não substitui o papel). Acesso às pautas e votações do conselho.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
      </div>
      
      <NewUserModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onUserCreated={loadUsers}
      />
      
      <CategoryNotificationModal 
        open={isNotificationModalOpen} 
        onOpenChange={setIsNotificationModalOpen}
      />
      
      <UserPermissionsModal 
        open={isPermissionsModalOpen} 
        onOpenChange={setIsPermissionsModalOpen}
        userToEdit={selectedUser}
        onUserUpdated={loadUsers}
      />
    </MainLayout>
  );
}