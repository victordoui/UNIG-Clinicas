import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Filter, Calendar as CalendarIcon, Download, X, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface Organization {
  id: string;
  name: string;
  subscription_plan: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface AuditFiltersProps {
  organizations: Organization[];
  users: Profile[];
  selectedOrgId: string | null;
  selectedUserId: string | null;
  actionFilter: string;
  startDate: Date | null;
  endDate: Date | null;
  onlyCritical: boolean;
  onOrgChange: (orgId: string | null) => void;
  onUserChange: (userId: string | null) => void;
  onActionChange: (action: string) => void;
  onDateChange: (start: Date | null, end: Date | null) => void;
  onOnlyCriticalChange: (v: boolean) => void;
  onApply: () => void;
  onClear: () => void;
  onExport: () => void;
  onExportPdf: () => void;
}

export function AuditFilters({
  organizations,
  users,
  selectedOrgId,
  selectedUserId,
  actionFilter,
  startDate,
  endDate,
  onlyCritical,
  onOrgChange,
  onUserChange,
  onActionChange,
  onDateChange,
  onOnlyCriticalChange,
  onApply,
  onClear,
  onExport,
  onExportPdf,
}: AuditFiltersProps) {
  const [userOpen, setUserOpen] = useState(false);

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Select de organização */}
        <div className="space-y-2">
          <Label>Organização</Label>
          <Select value={selectedOrgId || 'all'} onValueChange={(value) => onOrgChange(value === 'all' ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as organizações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as organizações</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name} ({org.subscription_plan})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Combobox de usuário */}
        <div className="space-y-2">
          <Label>Usuário</Label>
          <Popover open={userOpen} onOpenChange={setUserOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedUser ? (
                  <span className="truncate">{selectedUser.full_name} ({selectedUser.email})</span>
                ) : (
                  <span className="text-muted-foreground">Todos os usuários</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar usuário..." />
                <CommandList>
                  <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        onUserChange(null);
                        setUserOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !selectedUserId ? "opacity-100" : "opacity-0")} />
                      Todos os usuários
                    </CommandItem>
                    {users.map(user => (
                      <CommandItem
                        key={user.id}
                        value={`${user.full_name} ${user.email}`}
                        onSelect={() => {
                          onUserChange(user.id);
                          setUserOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{user.full_name} ({user.email})</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Select de tipo de ação */}
        <div className="space-y-2">
          <Label>Tipo de Ação</Label>
          <Select value={actionFilter} onValueChange={onActionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="product_created">Produto Criado</SelectItem>
              <SelectItem value="product_updated">Produto Atualizado</SelectItem>
              <SelectItem value="product_deleted">Produto Excluído</SelectItem>
              <SelectItem value="movement_created">Movimentação</SelectItem>
              <SelectItem value="user_invited">Usuário Convidado</SelectItem>
              <SelectItem value="user_removed">Usuário Removido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => onDateChange(date || null, endDate)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => onDateChange(startDate, date || null)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Toggle Somente críticos */}
        <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <Label htmlFor="only-critical" className="cursor-pointer">Somente ações críticas</Label>
          </div>
          <Switch id="only-critical" checked={onlyCritical} onCheckedChange={onOnlyCriticalChange} />
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4 flex-wrap">
          <Button onClick={onApply} className="flex-1 min-w-[120px]">
            <Filter className="mr-2 h-4 w-4" />
            Aplicar Filtros
          </Button>
          <Button onClick={onClear} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
          <Button onClick={onExport} variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={onExportPdf} variant="secondary">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
