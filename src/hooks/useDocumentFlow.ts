import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FlowNodeType = 'request' | 'quotes' | 'order' | 'receipts';

export interface FlowNode {
  tipo: FlowNodeType;
  id: string;
  numero?: string;
  status?: string;
  data?: string | null;
  descricao?: string | null;
  valor?: number | null;
  count?: number;
  order_id?: string;
  items?: any[];
  meta?: Record<string, any>;
}

export interface DocumentFlow {
  root_request_id: string;
  nodes: FlowNode[];
}

export function useDocumentFlow(rootRequestId?: string | null) {
  return useQuery({
    queryKey: ['document_flow', rootRequestId],
    enabled: !!rootRequestId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_document_flow', { _root_request_id: rootRequestId });
      if (error) throw error;
      return data as DocumentFlow;
    },
  });
}
