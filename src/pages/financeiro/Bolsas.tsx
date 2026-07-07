import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useScholarships, useDeleteScholarship, useAllStudentScholarships, useUpdateStudentScholarship } from '@/hooks/useFinance';
import { useCanReadAcademic, useCanWriteAcademic } from '@/components/academico/StaffOnly';
import { ScholarshipFormDialog } from '@/components/financeiro/ScholarshipFormDialog';
import { AssignScholarshipDialog } from '@/components/financeiro/AssignScholarshipDialog';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Pencil, Plus, Search, Trash2, UserPlus, Ban, PlayCircle } from 'lucide-react';
import { SCHOLARSHIP_TYPE_LABEL, DISCOUNT_KIND_LABEL, formatDate } from '@/lib/finance';
import { toast } from '@/hooks/use-toast';

export default function Bolsas() {
  const canRead = useCanReadAcademic();
  const canWrite = useCanWriteAcademic();
  const [search, setSearch] = useState('');
  const [linkFilter, setLinkFilter] = useState<any>({ search: '', status: 'all' });
  const { data: programs = [], isLoading } = useScholarships();
  const { data: links = [], isLoading: linksLoading } = useAllStudentScholarships(linkFilter);
  const del = useDeleteScholarship();
  const update = useUpdateStudentScholarship();

  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const filteredPrograms = programs.filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const remove = async (id: string) => { try { await del.mutateAsync(id); toast({ title: 'Programa removido' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };
  const setStatus = async (id: string, status: string) => { try { await update.mutateAsync({ id, values: { status } }); toast({ title: 'Status atualizado' }); } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); } };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" />Bolsas</h1>
            <p className="text-muted-foreground text-sm">Programas e vínculos com alunos.</p>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <AssignScholarshipDialog trigger={<Button variant="outline"><UserPlus className="h-4 w-4 mr-1" />Vincular</Button>} />
              <ScholarshipFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Novo programa</Button>} />
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Programas de bolsa</CardTitle>
            <div className="relative w-[240px]">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40" /> : filteredPrograms.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum programa cadastrado.</p> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Desconto</TableHead><TableHead>Validade</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredPrograms.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell><div className="font-medium">{p.name}</div>{p.code && <div className="text-xs text-muted-foreground">{p.code}</div>}</TableCell>
                        <TableCell>{SCHOLARSHIP_TYPE_LABEL[p.type] ?? p.type}</TableCell>
                        <TableCell className="tabular-nums">{p.discount_kind === 'percent' ? `${p.discount_value}%` : `R$ ${Number(p.discount_value).toFixed(2)}`}<div className="text-xs text-muted-foreground">{DISCOUNT_KIND_LABEL[p.discount_kind]}</div></TableCell>
                        <TableCell className="text-sm">{p.valid_from ? formatDate(p.valid_from) : '—'} → {p.valid_until ? formatDate(p.valid_until) : '∞'}</TableCell>
                        <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canWrite && <ScholarshipFormDialog row={p} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />}
                            {canWrite && <ConfirmDeleteDialog onConfirm={() => remove(p.id)} trigger={<Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-rose-600" /></Button>} />}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Alunos com bolsa</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input placeholder="Buscar aluno / programa" value={linkFilter.search} onChange={(e) => setLinkFilter({ ...linkFilter, search: e.target.value })} className="max-w-sm" />
            </div>
            {linksLoading ? <Skeleton className="h-40" /> : links.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum vínculo.</p> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Programa</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {links.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell><div className="font-medium">{l.student?.full_name}</div><div className="text-xs text-muted-foreground">{l.student?.registration}</div></TableCell>
                        <TableCell>{l.scholarship?.name}</TableCell>
                        <TableCell className="text-sm">{formatDate(l.starts_at)} → {l.ends_at ? formatDate(l.ends_at) : '∞'}</TableCell>
                        <TableCell><Badge variant={l.status === 'ativa' ? 'default' : 'secondary'}>{l.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {canWrite && (l.status === 'ativa' ? (
                            <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, 'suspensa')}><Ban className="h-4 w-4 mr-1" />Suspender</Button>
                          ) : l.status === 'suspensa' ? (
                            <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, 'ativa')}><PlayCircle className="h-4 w-4 mr-1" />Reativar</Button>
                          ) : null)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
