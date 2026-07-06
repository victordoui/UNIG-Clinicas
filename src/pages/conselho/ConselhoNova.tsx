import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { CouncilImageUpload } from '@/components/conselho/CouncilImageUpload';
import { useCreateCouncilProposal } from '@/hooks/useCouncil';
import { Plus, Trash2, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import { formatBRL } from '@/lib/purchaseLabels';
import { Badge } from '@/components/ui/badge';

interface QuoteRow {
  fornecedor: string;
  valor_unit: number;
  qtd: number;
  frete: number;
  forma_pagto: string;
  forma_pagto_outro: string;
  prazo_dias: number;
}

const PAYMENT_OPTIONS = [
  'À vista',
  '2x sem juros',
  '3x sem juros',
  '6x sem juros',
  '10x sem juros',
  '12x com juros',
  'Boleto 30 dias',
  'Boleto 30/60/90',
  'Outro',
];

const newRow = (): QuoteRow => ({
  fornecedor: '',
  valor_unit: 0,
  qtd: 1,
  frete: 0,
  forma_pagto: 'À vista',
  forma_pagto_outro: '',
  prazo_dias: 7,
});

export default function ConselhoNova() {
  const navigate = useNavigate();
  const create = useCreateCouncilProposal();
  const [titulo, setTitulo] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [location, setLocation] = useState('');
  const [quotes, setQuotes] = useState<QuoteRow[]>([newRow(), newRow(), newRow()]);

  const updateQuote = (i: number, patch: Partial<QuoteRow>) =>
    setQuotes(qs => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const totals = useMemo(
    () => quotes.map(q => q.valor_unit * q.qtd + q.frete),
    [quotes]
  );
  const validQuotes = quotes
    .map((q, i) => ({ ...q, _total: totals[i] }))
    .filter(q => q.fornecedor.trim() && q.valor_unit > 0);
  const minTotal = validQuotes.length ? Math.min(...validQuotes.map(q => q._total)) : 0;

  const handleSave = async () => {
    if (!titulo.trim() || validQuotes.length < 3) return;
    const id = await create.mutateAsync({
      titulo,
      justificativa,
      imagem_url: imagemUrl || undefined,
      location: location || undefined,
      quotes: validQuotes.map(q => ({
        fornecedor: q.fornecedor,
        valor_unit: q.valor_unit,
        qtd: q.qtd,
        frete: q.frete,
        condicoes: `${q.forma_pagto === 'Outro' ? q.forma_pagto_outro || 'Outro' : q.forma_pagto} • Entrega ${q.prazo_dias}d`,
      })),
    });
    navigate(`/conselho/${id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-6xl mx-auto pb-24 md:pb-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/conselho')} className="px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Voltar</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nova Proposta
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Preencha os dados e adicione no mínimo 3 cotações.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <Card>
            <CardHeader><CardTitle>Item</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex.: Cadeira diretor — Jurídico (Dr.ª Cleyde) — Nova Iguaçu"
                />
              </div>
              <div>
                <Label>Localização / setor</Label>
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Jurídico — Nova Iguaçu"
                />
              </div>
              <div>
                <Label>Justificativa</Label>
                <Textarea
                  rows={5}
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  placeholder="Descreva o motivo da aquisição, urgência e impacto."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Imagem do item</CardTitle></CardHeader>
            <CardContent>
              <CouncilImageUpload value={imagemUrl} onChange={setImagemUrl} />
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2 text-base sm:text-lg">
                Cotações
                <Badge variant="outline" className="font-normal">mínimo 3</Badge>
              </span>
              <Button
                size="sm"
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() => setQuotes(q => [...q, newRow()])}
              >
                <Plus className="h-4 w-4 mr-1" />Adicionar cotação
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Tabela: md+ */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Fornecedor</TableHead>
                    <TableHead className="w-40">Valor unit.</TableHead>
                    <TableHead className="w-20">Qtd</TableHead>
                    <TableHead className="w-40">Frete</TableHead>
                    <TableHead className="w-44">Pagamento</TableHead>
                    <TableHead className="w-24">Entrega (dias)</TableHead>
                    <TableHead className="w-36 text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q, i) => {
                    const total = totals[i];
                    const isBest = total > 0 && total === minTotal && validQuotes.length >= 2;
                    return (
                      <TableRow key={i} className={isBest ? 'bg-emerald-500/5' : ''}>
                        <TableCell>
                          <Input
                            value={q.fornecedor}
                            onChange={e => updateQuote(i, { fornecedor: e.target.value })}
                            placeholder="Nome do fornecedor"
                          />
                        </TableCell>
                        <TableCell>
                          <CurrencyInput value={q.valor_unit} onChange={v => updateQuote(i, { valor_unit: v })} />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={q.qtd}
                            onChange={e => updateQuote(i, { qtd: Number(e.target.value) || 1 })}
                          />
                        </TableCell>
                        <TableCell>
                          <CurrencyInput value={q.frete} onChange={v => updateQuote(i, { frete: v })} />
                        </TableCell>
                        <TableCell>
                          <Select value={q.forma_pagto} onValueChange={v => updateQuote(i, { forma_pagto: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PAYMENT_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {q.forma_pagto === 'Outro' && (
                            <Input
                              className="mt-1"
                              placeholder="Descreva"
                              value={q.forma_pagto_outro}
                              onChange={e => updateQuote(i, { forma_pagto_outro: e.target.value })}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={q.prazo_dias}
                            onChange={e => updateQuote(i, { prazo_dias: Number(e.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          <div className="flex items-center justify-end gap-1.5">
                            {isBest && <Trophy className="h-3.5 w-3.5 text-emerald-600" />}
                            <span className={isBest ? 'text-emerald-700' : ''}>{formatBRL(total)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setQuotes(qs => qs.filter((_, idx) => idx !== i))}
                            disabled={quotes.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Cards: mobile */}
            <div className="md:hidden divide-y">
              {quotes.map((q, i) => {
                const total = totals[i];
                const isBest = total > 0 && total === minTotal && validQuotes.length >= 2;
                return (
                  <div key={i} className={`p-3 space-y-3 ${isBest ? 'bg-emerald-500/5' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Cotação {i + 1}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setQuotes(qs => qs.filter((_, idx) => idx !== i))}
                        disabled={quotes.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div>
                      <Label className="text-xs">Fornecedor</Label>
                      <Input
                        value={q.fornecedor}
                        onChange={e => updateQuote(i, { fornecedor: e.target.value })}
                        placeholder="Nome do fornecedor"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Valor unit.</Label>
                        <CurrencyInput value={q.valor_unit} onChange={v => updateQuote(i, { valor_unit: v })} />
                      </div>
                      <div>
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={q.qtd}
                          onChange={e => updateQuote(i, { qtd: Number(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Frete</Label>
                        <CurrencyInput value={q.frete} onChange={v => updateQuote(i, { frete: v })} />
                      </div>
                      <div>
                        <Label className="text-xs">Entrega (dias)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={q.prazo_dias}
                          onChange={e => updateQuote(i, { prazo_dias: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Pagamento</Label>
                      <Select value={q.forma_pagto} onValueChange={v => updateQuote(i, { forma_pagto: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {q.forma_pagto === 'Outro' && (
                        <Input
                          className="mt-1"
                          placeholder="Descreva"
                          value={q.forma_pagto_outro}
                          onChange={e => updateQuote(i, { forma_pagto_outro: e.target.value })}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <div className="flex items-center gap-1.5 font-semibold tabular-nums">
                        {isBest && <Trophy className="h-4 w-4 text-emerald-600" />}
                        <span className={isBest ? 'text-emerald-700' : ''}>{formatBRL(total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="md:hidden p-3 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setQuotes(q => [...q, newRow()])}
              >
                <Plus className="h-4 w-4 mr-1" />Adicionar cotação
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sticky bottom-20 md:bottom-2 bg-background/90 backdrop-blur p-2 rounded-lg border">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {validQuotes.length}/3 cotações válidas
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/conselho')}>Cancelar</Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleSave}
              disabled={create.isPending || !titulo.trim() || validQuotes.length < 3}
            >
              Salvar rascunho
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
