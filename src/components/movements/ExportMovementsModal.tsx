import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface ExportMovementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportMovementsModal({ open, onOpenChange }: ExportMovementsModalProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Primeiro dia do mês
    to: new Date()
  });
  const [movementType, setMovementType] = useState<string>('todos');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Construir query
      let query = supabase
        .from('movements')
        .select(`
          *,
          products (
            name,
            sku,
            category
          )
        `);

      // Aplicar filtros
      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }
      if (movementType !== 'todos') {
        query = query.eq('type', movementType as any);
      }

      const { data: movements, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!movements || movements.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não há movimentações para o período selecionado.",
          variant: "destructive",
        });
        return;
      }

      if (exportFormat === 'excel') {
        await exportToExcel(movements);
      } else {
        await exportToPDF(movements);
      }

      toast({
        title: "Exportação concluída",
        description: `${movements.length} movimentações foram exportadas com sucesso.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting movements:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar as movimentações.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async (movements: any[]) => {
    const data = movements.map(movement => ({
      'Data': new Date(movement.created_at).toLocaleDateString('pt-BR'),
      'Produto': movement.products?.name || 'N/A',
      'SKU': movement.products?.sku || 'N/A',
      'Categoria': movement.products?.category || 'N/A',
      'Tipo': movement.type,
      'Quantidade': movement.quantity,
      'Estoque Anterior': movement.previous_stock,
      'Estoque Novo': movement.new_stock,
      'Preço Unitário': movement.unit_price || 0,
      'Valor Total': movement.total_value || 0,
      'Fornecedor': movement.supplier || 'N/A',
      'Destino': movement.destination || 'N/A',
      'Motivo': movement.reason || 'N/A',
      'Documento': movement.document_number || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');
    
    const filename = `movimentacoes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportToPDF = async (movements: any[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Movimentações', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Período: ${dateRange.from.toLocaleDateString('pt-BR')} a ${dateRange.to.toLocaleDateString('pt-BR')}`, 20, 35);
    doc.text(`Total de registros: ${movements.length}`, 20, 45);
    
    // Adicionar resumo
    const totalEntradas = movements.filter(m => m.type === 'entrada').length;
    const totalSaidas = movements.filter(m => m.type === 'saida').length;
    
    doc.text(`Entradas: ${totalEntradas}`, 20, 60);
    doc.text(`Saídas: ${totalSaidas}`, 20, 70);
    
    const filename = `movimentacoes_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const movementTypeLabels = {
    'todos': 'Todos os tipos',
    'entrada': 'Entradas',
    'saida': 'Saídas',
    'transferencia': 'Transferências',
    'ajuste': 'Ajustes'
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Movimentações
          </ModalTitle>
          <ModalDescription>
            Configure os filtros e formato para exportação
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          <div>
            <Label>Formato de Exportação</Label>
            <Select value={exportFormat} onValueChange={(value: 'excel' | 'pdf') => setExportFormat(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Movimentação</Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(movementTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="mt-1 w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? dateRange.from.toLocaleDateString('pt-BR') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="mt-1 w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? dateRange.to.toLocaleDateString('pt-BR') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}