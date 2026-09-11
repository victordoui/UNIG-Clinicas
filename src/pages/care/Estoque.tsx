import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Boxes, ClipboardPlus, PackagePlus } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const canManageRoles = ["super_admin", "administrador", "gestor_unidade"];

export default function Estoque() {
  const queryClient = useQueryClient();
  const { activeClinicCode, unigRole } = useAuth();
  const canManage = canManageRoles.includes(unigRole);
  const [clinicId, setClinicId] = useState("");
  const [itemId, setItemId] = useState("");
  const [item, setItem] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "unidade",
    min: "0",
    max: "",
  });
  const [entry, setEntry] = useState({
    quantity: "",
    batch: "",
    expiresOn: "",
    reason: "Recebimento",
  });
  const [movement, setMovement] = useState({
    type: "exit",
    quantity: "",
    reason: "Uso clínico",
  });
  const inventory = useQuery({
    queryKey: ["clinic-inventory"],
    queryFn: async () => {
      const [clinics, items, lots, movements] = await Promise.all([
        supabase
          .from("clinics")
          .select("id,organization_id,name,code")
          .eq("is_active", true)
          .order("name"),
        (supabase.from("clinic_inventory_items") as any)
          .select(
            "id,organization_id,clinic_id,name,sku,category,unit,current_quantity,min_quantity,max_quantity,is_active,clinic:clinics(name,code)",
          )
          .eq("is_active", true)
          .order("name"),
        (supabase.from("clinic_inventory_lots") as any)
          .select("id,inventory_item_id,batch_code,expires_on,quantity")
          .order("expires_on", { ascending: true, nullsFirst: false }),
        (supabase.from("clinic_inventory_movements") as any)
          .select(
            "id,inventory_item_id,movement_type,quantity_delta,previous_quantity,resulting_quantity,reason,occurred_at",
          )
          .order("occurred_at", { ascending: false })
          .limit(20),
      ]);
      for (const result of [clinics, items, lots, movements])
        if (result.error) throw result.error;
      return {
        clinics: clinics.data ?? [],
        items: items.data ?? [],
        lots: lots.data ?? [],
        movements: movements.data ?? [],
      };
    },
  });
  const clinics = useMemo(
    () =>
      (inventory.data?.clinics ?? []).filter(
        (value: any) => !activeClinicCode || value.code === activeClinicCode,
      ),
    [activeClinicCode, inventory.data?.clinics],
  );
  const items = useMemo(
    () =>
      (inventory.data?.items ?? []).filter(
        (value: any) =>
          (!activeClinicCode || value.clinic?.code === activeClinicCode) &&
          (!clinicId || value.clinic_id === clinicId),
      ),
    [activeClinicCode, clinicId, inventory.data?.items],
  );
  const lots = (inventory.data?.lots ?? []).filter(
    (value: any) => value.inventory_item_id === itemId,
  );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["clinic-inventory"] });
  useEffect(() => {
    if (clinicId && !clinics.some((value: any) => value.id === clinicId))
      setClinicId("");
  }, [clinicId, clinics]);
  useEffect(() => {
    if (itemId && !items.some((value: any) => value.id === itemId))
      setItemId("");
  }, [itemId, items]);
  const createItem = useMutation({
    mutationFn: async () => {
      const clinic = clinics.find((value: any) => value.id === clinicId);
      if (!clinic || !item.name.trim())
        throw new Error("Selecione a clínica e informe o item.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (
        supabase.from("clinic_inventory_items") as any
      ).insert({
        organization_id: clinic.organization_id,
        clinic_id: clinic.id,
        name: item.name.trim(),
        sku: item.sku.trim() || null,
        category: item.category.trim() || null,
        unit: item.unit.trim() || "unidade",
        min_quantity: Number(item.min) || 0,
        max_quantity: item.max ? Number(item.max) : null,
        created_by: auth.user?.id,
        updated_by: auth.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      setItem({
        name: "",
        sku: "",
        category: "",
        unit: "unidade",
        min: "0",
        max: "",
      });
      toast({ title: "Insumo cadastrado" });
    },
    onError: (error: Error) =>
      toast({
        title: "Não foi possível cadastrar",
        description: error.message,
        variant: "destructive",
      }),
  });
  const receive = useMutation({
    mutationFn: async () => {
      if (!itemId || Number(entry.quantity) <= 0)
        throw new Error("Selecione o item e informe uma quantidade positiva.");
      const { data: auth } = await supabase.auth.getUser();
      const { data: lot, error: lotError } = await (
        supabase.from("clinic_inventory_lots") as any
      )
        .insert({
          inventory_item_id: itemId,
          batch_code: entry.batch.trim() || null,
          expires_on: entry.expiresOn || null,
          quantity: 0,
          created_by: auth.user?.id,
        })
        .select("id")
        .single();
      if (lotError) throw lotError;
      const { error } = await supabase.rpc(
        "record_clinic_inventory_movement" as never,
        {
          target_item_id: itemId,
          target_lot_id: lot.id,
          target_movement_type: "entry",
          target_quantity_delta: Number(entry.quantity),
          target_reason: entry.reason.trim() || null,
        } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      setEntry({
        quantity: "",
        batch: "",
        expiresOn: "",
        reason: "Recebimento",
      });
      toast({ title: "Entrada registrada" });
    },
    onError: (error: Error) =>
      toast({
        title: "Não foi possível registrar a entrada",
        description: error.message,
        variant: "destructive",
      }),
  });
  const registerMovement = useMutation({
    mutationFn: async () => {
      if (!itemId || Number(movement.quantity) <= 0)
        throw new Error("Selecione o item e informe a quantidade.");
      const sign = movement.type === "exit" ? -1 : 1;
      const { error } = await supabase.rpc(
        "record_clinic_inventory_movement" as never,
        {
          target_item_id: itemId,
          target_lot_id: null,
          target_movement_type: movement.type,
          target_quantity_delta: sign * Number(movement.quantity),
          target_reason: movement.reason.trim() || null,
        } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      setMovement({ type: "exit", quantity: "", reason: "Uso clínico" });
      toast({ title: "Movimento registrado" });
    },
    onError: (error: Error) =>
      toast({
        title: "Não foi possível registrar o movimento",
        description: error.message,
        variant: "destructive",
      }),
  });
  const submit = (action: () => void) => (event: FormEvent) => {
    event.preventDefault();
    action();
  };
  const today = new Date().toISOString().slice(0, 10);
  const alerts =
    items.filter(
      (value: any) =>
        Number(value.current_quantity) <= Number(value.min_quantity),
    ).length +
    (inventory.data?.lots ?? []).filter(
      (value: any) =>
        value.expires_on &&
        value.expires_on <=
          new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) &&
        Number(value.quantity) > 0,
    ).length;
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Materiais e insumos</h1>
            <p className="text-sm text-muted-foreground">
              Controle de estoque, lotes, validade e movimentações da clínica
              ativa.
            </p>
          </div>
        </div>
        {!canManage && (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Seu acesso permite a consulta do estoque. Movimentações ficam
            disponíveis para a gestão da clínica.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clínica</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={clinicId} onValueChange={setClinicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a clínica" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((value: any) => (
                    <SelectItem key={value.id} value={value.id}>
                      {value.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alertas ativos</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{alerts}</span>
              <span className="text-sm text-muted-foreground">
                baixo estoque ou validade em até 30 dias
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{items.length}</span>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastrar insumo</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={submit(() => createItem.mutate())}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="sm:col-span-2 space-y-1">
                  <Label>Nome</Label>
                  <Input
                    value={item.name}
                    onChange={(event) =>
                      setItem({ ...item, name: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>SKU</Label>
                  <Input
                    value={item.sku}
                    onChange={(event) =>
                      setItem({ ...item, sku: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Input
                    value={item.category}
                    onChange={(event) =>
                      setItem({ ...item, category: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade</Label>
                  <Input
                    value={item.unit}
                    onChange={(event) =>
                      setItem({ ...item, unit: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estoque mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.min}
                    onChange={(event) =>
                      setItem({ ...item, min: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estoque máximo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.max}
                    onChange={(event) =>
                      setItem({ ...item, max: event.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    disabled={!canManage || !clinicId || createItem.isPending}
                  >
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Cadastrar item
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrada por lote</CardTitle>
              <CardDescription>
                Registre o lote e a validade antes de disponibilizar o insumo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={submit(() => receive.mutate())}
                className="grid gap-3 sm:grid-cols-2"
              >
                <ItemPicker items={items} value={itemId} onChange={setItemId} />
                <div className="space-y-1">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={entry.quantity}
                    onChange={(event) =>
                      setEntry({ ...entry, quantity: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Lote</Label>
                  <Input
                    value={entry.batch}
                    onChange={(event) =>
                      setEntry({ ...entry, batch: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    min={today}
                    value={entry.expiresOn}
                    onChange={(event) =>
                      setEntry({ ...entry, expiresOn: event.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label>Origem / justificativa</Label>
                  <Input
                    value={entry.reason}
                    onChange={(event) =>
                      setEntry({ ...entry, reason: event.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button disabled={!canManage || !itemId || receive.isPending}>
                    <ClipboardPlus className="mr-2 h-4 w-4" />
                    Registrar entrada
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posição de estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length ? (
              items.map((value: any) => {
                const low =
                  Number(value.current_quantity) <= Number(value.min_quantity);
                const itemLots = (inventory.data?.lots ?? []).filter(
                  (lot: any) =>
                    lot.inventory_item_id === value.id &&
                    Number(lot.quantity) > 0,
                );
                return (
                  <div key={value.id} className="rounded border p-3 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{value.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {value.category || "Sem categoria"} ·{" "}
                          {value.sku || "Sem SKU"}
                        </p>
                      </div>
                      <Badge variant={low ? "destructive" : "outline"}>
                        {value.current_quantity} {value.unit}
                        {low ? " · abaixo do mínimo" : ""}
                      </Badge>
                    </div>
                    {itemLots.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Lotes:{" "}
                        {itemLots
                          .map(
                            (lot: any) =>
                              `${lot.batch_code || "sem lote"} (${lot.quantity}; ${lot.expires_on ? new Date(`${lot.expires_on}T00:00:00`).toLocaleDateString("pt-BR") : "sem validade"})`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum item cadastrado para esta clínica.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saída e ajuste</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={submit(() => registerMovement.mutate())}
              className="grid gap-3 md:grid-cols-4"
            >
              <ItemPicker items={items} value={itemId} onChange={setItemId} />
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={movement.type}
                  onValueChange={(type) => setMovement({ ...movement, type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exit">Saída</SelectItem>
                    <SelectItem value="adjustment">Ajuste positivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={movement.quantity}
                  onChange={(event) =>
                    setMovement({ ...movement, quantity: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Justificativa</Label>
                <Input
                  value={movement.reason}
                  onChange={(event) =>
                    setMovement({ ...movement, reason: event.target.value })
                  }
                />
              </div>
              <div className="md:col-span-4">
                <Button
                  disabled={!canManage || !itemId || registerMovement.isPending}
                >
                  Registrar movimento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function ItemPicker({
  items,
  value,
  onChange,
}: {
  items: any[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>Item</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o item" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
