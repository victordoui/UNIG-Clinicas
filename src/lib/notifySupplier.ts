import { supabase } from '@/integrations/supabase/client';

export type SupplierNotifyEvent = 'quote_requested' | 'order_created' | 'divergence';

export interface NotifySupplierPayload {
  event: SupplierNotifyEvent;
  supplier_id: string;
  reference?: string;
  order_id?: string;
  request_id?: string;
  amount?: number;
}

/**
 * Fire-and-forget notification to supplier users.
 * Silently no-ops on missing session or errors so it never blocks main mutations.
 */
export async function notifySupplierEvent(payload: NotifySupplierPayload): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) return;
    await supabase.functions.invoke('notify-supplier-event', { body: payload });
  } catch (err) {
    console.warn('[notifySupplierEvent] silent failure', err);
  }
}
