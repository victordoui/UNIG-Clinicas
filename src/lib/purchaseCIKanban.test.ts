import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canMovePurchaseCI,
  getPurchaseOperationalStage,
  isClosedPurchaseCI,
  matchesPurchaseCIFilters,
} from './purchaseCIKanban.ts';

const baseCI = {
  id: 'ci-1',
  protocol: 'CI-2026-001',
  subject: 'Compra de computadores',
  requester_name: 'Maria Silva',
  priority: 'alta',
  status: 'aprovada',
  assigned_to: 'buyer-1',
  campus: 'Nova Iguaçu',
  cost_center_id: 'cc-1',
  request_type: 'Equipamentos',
  created_at: '2026-06-01T10:00:00.000Z',
};

test('agrupa CIs nas etapas operacionais de compras', () => {
  assert.equal(getPurchaseOperationalStage({ ...baseCI, assigned_to: null }), 'unassigned');
  assert.equal(getPurchaseOperationalStage(baseCI), 'buyer_queue');
  assert.equal(getPurchaseOperationalStage({ ...baseCI, status: 'em_cotacao' }), 'quoting');
  assert.equal(getPurchaseOperationalStage({ ...baseCI, status: 'aguardando_conselho' }), 'decision');
  assert.equal(getPurchaseOperationalStage({ ...baseCI, status: 'pedido_emitido' }), 'ordered');
  assert.equal(getPurchaseOperationalStage({ ...baseCI, status: 'aguardando_entrega' }), 'delivery');
  assert.equal(getPurchaseOperationalStage({ ...baseCI, status: 'recebida_estoque' }), 'received');
});

test('identifica estados encerrados fora da visão ativa', () => {
  assert.equal(isClosedPurchaseCI('finalizada'), true);
  assert.equal(isClosedPurchaseCI('cancelada'), true);
  assert.equal(isClosedPurchaseCI('reprovada'), true);
  assert.equal(isClosedPurchaseCI('em_cotacao'), false);
});

test('permite somente transições seguras para responsável ou gestor', () => {
  assert.equal(canMovePurchaseCI(baseCI, 'buyer_queue', 'quoting', 'buyer-1', false), true);
  assert.equal(canMovePurchaseCI(baseCI, 'buyer_queue', 'quoting', 'buyer-2', false), false);
  assert.equal(canMovePurchaseCI(baseCI, 'buyer_queue', 'quoting', 'manager-1', true), true);
  assert.equal(canMovePurchaseCI({ ...baseCI, status: 'pedido_emitido' }, 'ordered', 'delivery', 'buyer-1', false), true);
  assert.equal(canMovePurchaseCI(baseCI, 'quoting', 'ordered', 'buyer-1', false), false);
});

test('aplica visão, busca e filtros avançados em conjunto', () => {
  const filters = {
    view: 'mine' as const,
    userId: 'buyer-1',
    search: 'maria',
    buyerId: 'buyer-1',
    priority: 'alta',
    campus: 'Nova Iguaçu',
    costCenterId: 'cc-1',
    requestType: 'Equipamentos',
    stage: 'buyer_queue' as const,
    includeClosed: false,
    period: 'month' as const,
    now: new Date('2026-06-11T12:00:00.000Z'),
  };

  assert.equal(matchesPurchaseCIFilters(baseCI, filters), true);
  assert.equal(matchesPurchaseCIFilters({ ...baseCI, assigned_to: 'buyer-2' }, filters), false);
  assert.equal(matchesPurchaseCIFilters({ ...baseCI, status: 'finalizada' }, filters), false);
});
