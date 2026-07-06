CREATE OR REPLACE FUNCTION public.get_document_flow(_root_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _req record;
  _nodes jsonb := '[]'::jsonb;
  _quotes jsonb;
  _orders jsonb;
  _receipts jsonb;
BEGIN
  -- Validate access via existing RLS by selecting through it
  SELECT pr.* INTO _req FROM public.purchase_requests pr WHERE pr.id = _root_request_id;
  IF _req IS NULL THEN
    RETURN jsonb_build_object('error','not_found');
  END IF;
  _org := _req.organization_id;

  -- SC node
  _nodes := _nodes || jsonb_build_array(jsonb_build_object(
    'tipo','request',
    'id', _req.id,
    'numero', _req.numero,
    'status', _req.status,
    'data', _req.created_at,
    'descricao', _req.item_descricao,
    'valor', _req.valor_estimado,
    'meta', jsonb_build_object('setor', _req.setor, 'prioridade', _req.prioridade, 'quantidade', _req.quantidade)
  ));

  -- Quotes (one node aggregating all quotes for the request)
  SELECT jsonb_agg(jsonb_build_object(
    'id', q.id,
    'supplier_id', q.supplier_id,
    'supplier', s.nome_fantasia,
    'status', q.status,
    'valor_total', q.valor_total,
    'valor_unitario', q.valor_unitario,
    'prazo_entrega_dias', q.prazo_entrega_dias,
    'created_at', q.created_at
  ) ORDER BY q.created_at)
  INTO _quotes
  FROM public.purchase_quotes q
  LEFT JOIN public.suppliers s ON s.id = q.supplier_id
  WHERE q.request_id = _root_request_id;

  IF _quotes IS NOT NULL THEN
    _nodes := _nodes || jsonb_build_array(jsonb_build_object(
      'tipo','quotes',
      'id', _root_request_id,
      'count', jsonb_array_length(_quotes),
      'status', CASE WHEN EXISTS (SELECT 1 FROM public.purchase_quotes WHERE request_id=_root_request_id AND status='escolhida') THEN 'escolhida' ELSE 'recebida' END,
      'data', (SELECT max(created_at) FROM public.purchase_quotes WHERE request_id=_root_request_id),
      'items', _quotes
    ));
  END IF;

  -- Orders
  SELECT jsonb_agg(jsonb_build_object(
    'tipo','order',
    'id', o.id,
    'numero', o.numero,
    'status', o.status,
    'data', o.created_at,
    'valor', o.valor_total,
    'meta', jsonb_build_object(
      'supplier', s.nome_fantasia,
      'supplier_id', o.supplier_id,
      'quantidade', o.quantidade,
      'nota_fiscal_numero', o.nota_fiscal_numero,
      'has_nf', o.nota_fiscal_path IS NOT NULL
    )
  ) ORDER BY o.created_at)
  INTO _orders
  FROM public.purchase_orders o
  LEFT JOIN public.suppliers s ON s.id = o.supplier_id
  WHERE o.request_id = _root_request_id;

  IF _orders IS NOT NULL THEN
    _nodes := _nodes || _orders;
  END IF;

  -- Receipts aggregated per order
  SELECT jsonb_agg(jsonb_build_object(
    'tipo','receipts',
    'id', o.id,
    'order_id', o.id,
    'numero', o.numero,
    'status', CASE
      WHEN o.status='recebido_total' THEN 'completo'
      WHEN COALESCE(SUM(r.quantidade_recebida),0) > 0 THEN 'parcial'
      ELSE 'pendente' END,
    'data', max(r.data_recebimento),
    'meta', jsonb_build_object(
      'qtd_recebida', COALESCE(SUM(r.quantidade_recebida),0),
      'qtd_pedido', o.quantidade,
      'count', count(r.id),
      'divergencias', count(r.id) FILTER (WHERE r.divergencia)
    )
  ) ORDER BY o.created_at)
  INTO _receipts
  FROM public.purchase_orders o
  LEFT JOIN public.purchase_receipts r ON r.order_id = o.id
  WHERE o.request_id = _root_request_id
  GROUP BY o.id, o.numero, o.status, o.quantidade, o.created_at;

  IF _receipts IS NOT NULL THEN
    _nodes := _nodes || _receipts;
  END IF;

  RETURN jsonb_build_object('root_request_id', _root_request_id, 'nodes', _nodes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_document_flow(uuid) TO authenticated;