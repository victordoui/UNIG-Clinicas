import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { INVITEE_TYPES, INVITATION_STATUS_LABEL } from "@/lib/invitationConstants";

export interface InvitationFiltersState {
  search: string;
  status: string;
  invitee_type: string;
  created_by: string;
}

interface Props {
  value: InvitationFiltersState;
  onChange: (v: InvitationFiltersState) => void;
  creators: { id: string; name: string }[];
}

const STATUSES = ["pending", "registered", "expired", "cancelled"];

export function InvitationFilters({ value, onChange, creators }: Props) {
  const update = (patch: Partial<InvitationFiltersState>) => onChange({ ...value, ...patch });
  const hasFilters = value.search || value.status !== "all" || value.invitee_type !== "all" || value.created_by !== "all";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in">
      <div className="space-y-1.5">
        <Label className="text-xs">Buscar por e-mail ou nome</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Digite para filtrar..."
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Status</Label>
        <Select value={value.status} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{INVITATION_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de usuário</Label>
        <Select value={value.invitee_type} onValueChange={(v) => update({ invitee_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {INVITEE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Criado por</Label>
        <div className="flex gap-2">
          <Select value={value.created_by} onValueChange={(v) => update({ created_by: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {creators.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={() => onChange({ search: "", status: "all", invitee_type: "all", created_by: "all" })} title="Limpar filtros">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
