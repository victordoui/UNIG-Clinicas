import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Download, Package, Filter } from "lucide-react";
import { exportToExcel, exportToCSV } from "@/lib/exportUtils";
import { categoryLabels } from "@/lib/categoryUtils";
import { useToast } from "@/hooks/use-toast";

interface ExportProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: any[];
  filteredProducts: any[];
  hasActiveFilters: boolean;
}

type ExportFormat = "excel" | "csv";
type ExportScope = "all" | "filtered";

const formatProductsForExport = (products: any[]) => {
  return products.map((product) => ({
    "Nome do Produto": product.name || "",
    SKU: product.sku || "",
    Categoria: categoryLabels[product.category as keyof typeof categoryLabels] || product.category || "",
    Descrição: product.description || "",
    "Estoque Atual": product.current_stock ?? 0,
    "Estoque Mínimo": product.min_stock ?? 0,
    "Estoque Máximo": product.max_stock || "",
    "Preço Unitário": product.unit_price ?? 0,
    "Código de Barras": product.barcode || "",
    "QR Code": product.qr_code || "",
    Localização: product.location || "",
    Fornecedor: product.supplier || "",
  }));
};

export function ExportProductsModal({
  open,
  onOpenChange,
  products,
  filteredProducts,
  hasActiveFilters,
}: ExportProductsModalProps) {
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [scope, setScope] = useState<ExportScope>("all");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const productsToExport = scope === "all" ? products : filteredProducts;

  const handleExport = async () => {
    if (productsToExport.length === 0) {
      toast({
        title: "Nenhum produto para exportar",
        description: "Não há produtos disponíveis para exportação.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const formattedData = formatProductsForExport(productsToExport);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const scopeLabel = scope === "all" ? "todos" : "filtrados";

      if (format === "excel") {
        const fileName = `produtos_${scopeLabel}_${timestamp}.xlsx`;
        exportToExcel(formattedData, fileName, "Produtos");
        toast({
          title: "Exportação concluída!",
          description: `${productsToExport.length} produtos exportados para ${fileName}`,
        });
      } else {
        const fileName = `produtos_${scopeLabel}_${timestamp}.csv`;
        exportToCSV(formattedData, fileName);
        toast({
          title: "Exportação concluída!",
          description: `${productsToExport.length} produtos exportados para ${fileName}`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os produtos.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Produtos
          </DialogTitle>
          <DialogDescription>
            Exporte seus produtos em formato Excel ou CSV para backup ou análise externa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{products.length}</div>
                <div className="text-sm text-muted-foreground">Total de produtos</div>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                <Filter className="h-8 w-8 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold">{filteredProducts.length}</div>
                  <div className="text-sm text-muted-foreground">Produtos filtrados</div>
                </div>
              </div>
            )}
          </div>

          {/* Escopo da exportação */}
          {hasActiveFilters && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Escopo da exportação</Label>
              <RadioGroup
                value={scope}
                onValueChange={(value) => setScope(value as ExportScope)}
                className="grid grid-cols-2 gap-4"
              >
                <div className="relative">
                  <RadioGroupItem value="all" id="all" className="peer sr-only" />
                  <Label
                    htmlFor="all"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <Package className="mb-2 h-6 w-6" />
                    <span className="font-medium">Todos</span>
                    <Badge variant="secondary" className="mt-2">
                      {products.length} produtos
                    </Badge>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="filtered" id="filtered" className="peer sr-only" />
                  <Label
                    htmlFor="filtered"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <Filter className="mb-2 h-6 w-6" />
                    <span className="font-medium">Filtrados</span>
                    <Badge variant="secondary" className="mt-2">
                      {filteredProducts.length} produtos
                    </Badge>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Formato de exportação */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Formato do arquivo</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="excel" id="excel" className="peer sr-only" />
                <Label
                  htmlFor="excel"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <FileSpreadsheet className="mb-2 h-6 w-6 text-green-600" />
                  <span className="font-medium">Excel</span>
                  <span className="text-xs text-muted-foreground">.xlsx</span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="csv" id="csv" className="peer sr-only" />
                <Label
                  htmlFor="csv"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <FileText className="mb-2 h-6 w-6 text-blue-600" />
                  <span className="font-medium">CSV</span>
                  <span className="text-xs text-muted-foreground">.csv</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview das colunas */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Colunas exportadas:</Label>
            <div className="flex flex-wrap gap-1">
              {[
                "Nome",
                "SKU",
                "Categoria",
                "Descrição",
                "Estoque Atual",
                "Estoque Mínimo",
                "Estoque Máximo",
                "Preço",
                "Código Barras",
                "QR Code",
                "Localização",
                "Fornecedor",
              ].map((col) => (
                <Badge key={col} variant="outline" className="text-xs">
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || productsToExport.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exportando..." : `Exportar ${productsToExport.length} produtos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
