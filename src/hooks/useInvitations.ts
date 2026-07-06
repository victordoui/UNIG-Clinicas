import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type InvitationStatus = "pending" | "registered" | "expired" | "cancelled";

export interface InvitationRow {
  id: string;
  token: string;
  email: string;
  role: string;
  invitee_type: string | null;
  internal_note: string | null;
  filled_name: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  revoked_at: string | null;
  invited_by: string;
  invited_by_name?: string | null;
  resent_from: string | null;
  status: InvitationStatus;
}

export function computeStatus(row: {
  accepted_at: string | null;
  cancelled_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): InvitationStatus {
  if (row.accepted_at) return "registered";
  if (row.cancelled_at || row.revoked_at) return "cancelled";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

export function useInvitations() {
  const { organization } = useAuth();
  const [items, setItems] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organization?.organization_id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("organization_id", organization.organization_id)
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      // Buscar nomes dos criadores
      const ids = Array.from(new Set((data || []).map((d: any) => d.invited_by).filter(Boolean)));
      let nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name").in("id", ids);
        nameMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p.full_name || ""]));
      }
      const mapped: InvitationRow[] = (data || []).map((r: any) => ({
        ...r,
        invited_by_name: nameMap[r.invited_by] || null,
        status: computeStatus(r),
      }));
      setItems(mapped);
    }
    setLoading(false);
  }, [organization?.organization_id]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}
