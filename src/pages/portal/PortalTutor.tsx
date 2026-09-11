import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Cat, Plus, ShieldCheck } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Animal = {
  animal_id: string;
  name: string;
  species: string;
  breed: string | null;
  last_consultation_at: string | null;
};

export default function PortalTutor() {
  const animals = useQuery({
    queryKey: ["tutor-portal-animals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_tutor_animals" as never,
      );
      if (error) throw error;
      return (data ?? []) as Animal[];
    },
  });
  const journey = useQuery({
    queryKey: ["tutor-portal-journey"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_tutor_clinical_journey" as never,
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const notifications = useQuery({
    queryKey: ["tutor-portal-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("notifications") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Portal do tutor</p>
          <h1 className="text-2xl font-bold">Meus animais</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe consultas e vacinas dos animais vinculados à sua conta.
          </p>
        </div>
        {animals.isError ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Sua conta ainda não está vinculada como tutor.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Somente seus vínculos são exibidos
              </div>
              <Button disabled>
                <Plus className="mr-1 h-4 w-4" />
                Cadastrar animal
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(animals.data ?? []).map((animal) => (
                <Card key={animal.animal_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cat className="h-5 w-5 text-primary" />
                      {animal.name}
                    </CardTitle>
                    <CardDescription>
                      {animal.species}
                      {animal.breed ? ` · ${animal.breed}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Última consulta:{" "}
                      {animal.last_consultation_at
                        ? new Date(
                            animal.last_consultation_at,
                          ).toLocaleDateString("pt-BR")
                        : "Nenhuma registrada"}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {animals.data?.length === 0 && (
                <Card className="sm:col-span-2 lg:col-span-3">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum animal vinculado à sua conta.
                  </CardContent>
                </Card>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico clínico dos animais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {journey.data?.length ? (
                  journey.data.map((event, index) => (
                    <div
                      key={`${event.animal_id}-${event.event_date}-${index}`}
                      className="rounded border p-3 text-sm"
                    >
                      <strong>{event.animal_name}</strong> ·{" "}
                      {event.event_type === "vacina" ? "Vacinação" : "Consulta"}{" "}
                      · {new Date(event.event_date).toLocaleDateString("pt-BR")}
                      <p className="mt-1">{event.title}</p>
                      {event.details && (
                        <p className="text-xs text-muted-foreground">
                          {event.details}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma consulta ou vacina disponível.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meus avisos</CardTitle>
                <CardDescription>
                  Notificações direcionadas à sua conta de tutor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.data?.length ? (
                  notifications.data.map((item) => (
                    <div key={item.id} className="rounded border p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <strong>{item.title ?? "Aviso"}</strong>
                        {!item.read_at && (
                          <span className="text-xs text-primary">Novo</span>
                        )}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {item.message ??
                          item.body ??
                          item.content ??
                          "Sem detalhes adicionais."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum aviso disponível.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
