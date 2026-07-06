import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type InboundStatus = 'importado' | 'conciliado' | 'divergente' | 'recebido' | 'cancelado';

export interface InboundInvoice {
  id: string;
  organization_id: string;
  chave_acesso: string;
  numero: string | null;
  serie: string | null;
  emissao: string | null;
  data_vencimento: string | null;
  supplier_id: string | null;
  supplier_cnpj: string | null;
  supplier_nome: string | null;
  valor_total: number;
  status: InboundStatus;
  order_id: string | null;
  xml_path: string;
  parse_warnings: any;
  matched_at: string | null;
  received_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InboundInvoiceItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  numero_item: number | null;
  descricao: string;
  cfop: string | null;
  ncm: string | null;
  cean: string | null;
  unidade: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  product_id: string | null;
  order_item_id: string | null;
  divergence: 'ok' | 'qtd' | 'preco' | 'nao_encontrado';
  divergence_detail: any;
}

export interface InboundFilters {
  status?: string;
  supplier_id?: string;
  de?: string;
  ate?: string;
  search?: string;
}

export function useInboundInvoices(filters: InboundFilters = {}) {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['inbound_invoices', orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('inbound_invoices')
        .select('*, suppliers(nome_fantasia), purchase_orders(numero)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.supplier_id) q = q.eq('supplier_id', filters.supplier_id);
      if (filters.de) q = q.gte('emissao', filters.de);
      if (filters.ate) q = q.lte('emissao', filters.ate);
      if (filters.search) q = q.or(`numero.ilike.%${filters.search}%,chave_acesso.ilike.%${filters.search}%,supplier_nome.ilike.%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (InboundInvoice & {
        suppliers?: { nome_fantasia: string };
        purchase_orders?: { numero: string };
      })[];
    },
  });
}

export function useInboundInvoiceItems(invoiceId?: string) {
  return useQuery({
    queryKey: ['inbound_invoice_items', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('inbound_invoice_items')
        .select('*, products(name, sku)')
        .eq('invoice_id', invoiceId)
        .order('numero_item');
      if (error) throw error;
      return (data ?? []) as (InboundInvoiceItem & { products?: { name: string; sku: string } })[];
    },
  });
}

export function useInboundDashboard() {
  const { organization } = useAuth();
  const orgId = organization?.organization_id;
  return useQuery({
    queryKey: ['inbound_dashboard', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_inbound_invoices_dashboard');
      if (error) throw error;
      return (data ?? {}) as {
        importadas_hoje?: number;
        aguardando?: number;
        divergentes?: number;
        recebidas_mes?: number;
        valor_mes?: number;
      };
    },
  });
}

// ===== XML parser (NF-e) =====
interface ParsedNfe {
  chave: string;
  numero: string | null;
  serie: string | null;
  emissao: string | null;
  vencimento: string | null;
  cnpj_emit: string | null;
  nome_emit: string | null;
  valor_total: number;
  warnings: string[];
  items: {
    numero: number;
    descricao: string;
    cfop: string | null;
    ncm: string | null;
    cean: string | null;
    unidade: string | null;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }[];
}

export function parseNfeXml(xmlText: string): ParsedNfe {
  const warnings: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) throw new Error('XML inválido');

  const txt = (sel: string, root: Element | Document = doc) =>
    root.getElementsByTagName(sel)[0]?.textContent?.trim() ?? null;

  // chave: vem em infNFe Id="NFeXXXXXX..." ou em <chNFe>
  let chave = doc.getElementsByTagName('chNFe')[0]?.textContent?.trim() ?? '';
  if (!chave) {
    const inf = doc.getElementsByTagName('infNFe')[0];
    const id = inf?.getAttribute('Id') ?? '';
    chave = id.replace(/^NFe/, '');
  }
  if (chave.length !== 44) warnings.push('Chave de acesso ausente ou inválida');

  const ide = doc.getElementsByTagName('ide')[0];
  const numero = ide ? txt('nNF', ide) : null;
  const serie = ide ? txt('serie', ide) : null;
  const dhEmi = ide ? (txt('dhEmi', ide) ?? txt('dEmi', ide)) : null;
  const emissao = dhEmi ? dhEmi.substring(0, 10) : null;

  const emit = doc.getElementsByTagName('emit')[0];
  const cnpj_emit = emit ? txt('CNPJ', emit) : null;
  const nome_emit = emit ? (txt('xNome', emit) ?? txt('xFant', emit)) : null;

  const total = doc.getElementsByTagName('ICMSTot')[0];
  const valor_total = total ? parseFloat(txt('vNF', total) ?? '0') : 0;

  // Vencimento: primeira dup
  let vencimento: string | null = null;
  const dup = doc.getElementsByTagName('dup')[0];
  if (dup) vencimento = txt('dVenc', dup);

  // Itens
  const dets = Array.from(doc.getElementsByTagName('det'));
  const items = dets.map((det) => {
    const prod = det.getElementsByTagName('prod')[0];
    const nItem = parseInt(det.getAttribute('nItem') ?? '0', 10);
    return {
      numero: nItem,
      descricao: prod ? (txt('xProd', prod) ?? 'Item sem descrição') : 'Item sem descrição',
      cfop: prod ? txt('CFOP', prod) : null,
      ncm: prod ? txt('NCM', prod) : null,
      cean: prod ? txt('cEAN', prod) : null,
      unidade: prod ? txt('uCom', prod) : null,
      quantidade: prod ? parseFloat(txt('qCom', prod) ?? '0') : 0,
      valor_unitario: prod ? parseFloat(txt('vUnCom', prod) ?? '0') : 0,
      valor_total: prod ? parseFloat(txt('vProd', prod) ?? '0') : 0,
    };
  });

  if (items.length === 0) warnings.push('Nenhum item encontrado no XML');

  return {
    chave,
    numero,
    serie,
    emissao,
    vencimento,
    cnpj_emit,
    nome_emit,
    valor_total,
    warnings,
    items,
  };
}

export function useImportNfeXml() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!organization || !user) throw new Error('Sem organização');
      const orgId = organization.organization_id;
      const text = await file.text();
      const parsed = parseNfeXml(text);
      if (!parsed.chave || parsed.chave.length !== 44) {
        throw new Error('XML não contém chave de acesso válida da NF-e');
      }

      // Upload XML
      const path = `${orgId}/${parsed.chave}.xml`;
      const { error: upErr } = await supabase.storage
        .from('nfe-xml')
        .upload(path, new Blob([text], { type: 'application/xml' }), { upsert: true });
      if (upErr) throw upErr;

      // Resolver fornecedor por CNPJ
      let supplierId: string | null = null;
      if (parsed.cnpj_emit) {
        const cnpjDigits = parsed.cnpj_emit.replace(/\D/g, '');
        const { data: sup } = await (supabase as any)
          .from('suppliers')
          .select('id')
          .eq('organization_id', orgId)
          .or(`cnpj.eq.${cnpjDigits},cnpj.eq.${parsed.cnpj_emit}`)
          .maybeSingle();
        supplierId = sup?.id ?? null;
        if (!supplierId) parsed.warnings.push(`Fornecedor CNPJ ${parsed.cnpj_emit} não cadastrado`);
      }

      // Insert invoice
      const { data: inv, error: invErr } = await (supabase as any)
        .from('inbound_invoices')
        .insert({
          organization_id: orgId,
          chave_acesso: parsed.chave,
          numero: parsed.numero,
          serie: parsed.serie,
          emissao: parsed.emissao,
          data_vencimento: parsed.vencimento,
          supplier_id: supplierId,
          supplier_cnpj: parsed.cnpj_emit,
          supplier_nome: parsed.nome_emit,
          valor_total: parsed.valor_total,
          status: 'importado',
          xml_path: path,
          parse_warnings: parsed.warnings,
          created_by: user.id,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      // Insert items
      if (parsed.items.length > 0) {
        const itemsPayload = parsed.items.map((it) => ({
          organization_id: orgId,
          invoice_id: inv.id,
          numero_item: it.numero,
          descricao: it.descricao,
          cfop: it.cfop,
          ncm: it.ncm,
          cean: it.cean,
          unidade: it.unidade,
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario,
          valor_total: it.valor_total,
          divergence: 'nao_encontrado',
        }));
        const { error: itErr } = await (supabase as any)
          .from('inbound_invoice_items')
          .insert(itemsPayload);
        if (itErr) throw itErr;
      }

      // Tentar matching com produto por EAN
      for (const it of parsed.items) {
        if (it.cean && it.cean !== 'SEM GTIN') {
          const { data: prod } = await (supabase as any)
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('ean', it.cean)
            .maybeSingle();
          if (prod?.id) {
            await (supabase as any)
              .from('inbound_invoice_items')
              .update({ product_id: prod.id, divergence: 'ok' })
              .eq('invoice_id', inv.id)
              .eq('numero_item', it.numero);
          }
        }
      }

      return inv as InboundInvoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound_invoices'] });
      qc.invalidateQueries({ queryKey: ['inbound_dashboard'] });
      toast({ title: 'NF-e importada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao importar', description: e.message, variant: 'destructive' }),
  });
}

export function useLinkInvoiceToOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ invoice_id, order_id }: { invoice_id: string; order_id: string | null }) => {
      const status = order_id ? 'conciliado' : 'importado';
      const { error } = await (supabase as any)
        .from('inbound_invoices')
        .update({ order_id, status, matched_at: order_id ? new Date().toISOString() : null })
        .eq('id', invoice_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound_invoices'] });
      qc.invalidateQueries({ queryKey: ['inbound_dashboard'] });
      toast({ title: 'Vínculo atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useConfirmReceipt() {
  const { organization, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (invoice_id: string) => {
      if (!organization || !user) throw new Error('Sem organização');
      const orgId = organization.organization_id;

      const { data: inv, error: invErr } = await (supabase as any)
        .from('inbound_invoices')
        .select('*')
        .eq('id', invoice_id)
        .single();
      if (invErr) throw invErr;

      const { data: items, error: itErr } = await (supabase as any)
        .from('inbound_invoice_items')
        .select('*')
        .eq('invoice_id', invoice_id);
      if (itErr) throw itErr;

      // Para cada item com product_id, gerar movement de entrada
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        const { data: prod } = await (supabase as any)
          .from('products')
          .select('current_stock, location')
          .eq('id', it.product_id)
          .maybeSingle();
        const previous = prod?.current_stock ?? 0;
        const qty = Math.round(Number(it.quantidade));
        const newStock = previous + qty;
        await (supabase as any).from('movements').insert({
          product_id: it.product_id,
          type: 'entrada',
          quantity: qty,
          previous_stock: previous,
          new_stock: newStock,
          unit_price: Number(it.valor_unitario),
          total_value: Number(it.valor_total),
          reason: `Entrada NF-e ${inv.numero ?? ''}`,
          document_number: inv.numero,
          supplier: inv.supplier_nome,
          location_info: prod?.location ?? null,
          created_by: user.id,
          organization_id: orgId,
        });
        await (supabase as any)
          .from('products')
          .update({ current_stock: newStock })
          .eq('id', it.product_id);
      }

      // Criar conta a pagar
      await (supabase as any).from('accounts_payable').insert({
        organization_id: orgId,
        order_id: inv.order_id,
        supplier_id: inv.supplier_id,
        numero_documento: inv.numero,
        descricao: `NF-e ${inv.numero ?? inv.chave_acesso}`,
        valor_total: inv.valor_total,
        data_emissao: inv.emissao ?? new Date().toISOString().substring(0, 10),
        data_vencimento: inv.data_vencimento ?? inv.emissao ?? new Date().toISOString().substring(0, 10),
        status: 'pendente',
        created_by: user.id,
      });

      // Atualizar invoice
      await (supabase as any)
        .from('inbound_invoices')
        .update({ status: 'recebido', received_at: new Date().toISOString() })
        .eq('id', invoice_id);

      // Vincular invoice ao pedido
      if (inv.order_id) {
        await (supabase as any)
          .from('purchase_orders')
          .update({ inbound_invoice_id: invoice_id, nota_fiscal_numero: inv.numero, nota_fiscal_uploaded_at: new Date().toISOString() })
          .eq('id', inv.order_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound_invoices'] });
      qc.invalidateQueries({ queryKey: ['inbound_invoice_items'] });
      qc.invalidateQueries({ queryKey: ['inbound_dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts_payable'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast({ title: 'Recebimento confirmado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao confirmar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteInboundInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from('inbound_invoices')
        .delete()
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!data?.length) throw new Error('Sem permissão');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbound_invoices'] });
      qc.invalidateQueries({ queryKey: ['inbound_dashboard'] });
      toast({ title: 'NF-e removida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
