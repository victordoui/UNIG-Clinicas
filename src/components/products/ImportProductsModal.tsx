import { useState, useCallback, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateSKU } from "@/lib/skuUtils";
import { ImportLoadingOverlay } from "@/components/shared/ImportLoadingOverlay";
import * as XLSX from 'xlsx';


interface ImportProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ProductImportData {
  name: string;
  sku: string;
  category: string;
  description?: string;
  current_stock: number;
  min_stock: number;
  max_stock?: number;
  unit_price?: number;
  supplier?: string;
  location?: string;
  barcode?: string;
  qr_code?: string;
  isAutoSKU?: boolean;
  isDuplicate?: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  autoSKU: number;
  duplicates: number;
  errors: string[];
}

export function ImportProductsModal({ open, onOpenChange, onImportComplete }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [preview, setPreview] = useState<ProductImportData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [existingSKUs, setExistingSKUs] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const { user, organization } = useAuth();


  const validateCategories = ["eletronicos", "escritorio", "limpeza", "manutencao", "cozinha", "outros"];

  // Carrega SKUs existentes quando o modal abre
  useEffect(() => {
    if (open && organization?.organization_id) {
      supabase
        .from('products')
        .select('sku')
        .eq('organization_id', organization.organization_id)
        .then(({ data }) => {
          setExistingSKUs(new Set(data?.map(p => p.sku) || []));
        });
    }
    
    // Reset state when modal opens
    if (open) {
      setFile(null);
      setPreview([]);
      setErrors([]);
      setImportResult(null);
      setProgress(0);
    }
  }, [open, organization?.organization_id]);

  const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase().trim();
    
    const categoryMap: { [key: string]: string } = {
      'eletrônicos': 'eletronicos',
      'eletronicos': 'eletronicos',
      'informatica': 'eletronicos',
      'informática': 'eletronicos',
      'escritório': 'escritorio',
      'escritorio': 'escritorio',
      'papelaria': 'escritorio',
      'limpeza': 'limpeza',
      'higiene': 'limpeza',
      'manutenção': 'manutencao',
      'manutencao': 'manutencao',
      'manutenao': 'manutencao',
      'cozinha': 'cozinha',
      'alimentação': 'cozinha',
      'alimentacao': 'cozinha',
      'outros': 'outros',
      'diversos': 'outros',
      'geral': 'outros'
    };

    return categoryMap[normalized] || 'outros';
  };

  const processFile = useCallback(async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!jsonData || jsonData.length === 0) {
        throw new Error("Arquivo vazio ou formato inválido");
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      // Mapear colunas automaticamente
      const columnMap: { [key: string]: number } = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header?.toLowerCase().trim() || '';
        
        if (normalizedHeader.includes('nome') || normalizedHeader.includes('produto')) {
          columnMap.name = index;
        } else if (normalizedHeader.includes('sku') || normalizedHeader.includes('código') || normalizedHeader.includes('codigo')) {
          columnMap.sku = index;
        } else if (normalizedHeader.includes('categoria')) {
          columnMap.category = index;
        } else if (normalizedHeader.includes('descrição') || normalizedHeader.includes('descricao')) {
          columnMap.description = index;
        } else if (normalizedHeader.includes('estoque') && (normalizedHeader.includes('atual') || normalizedHeader.includes('quantidade'))) {
          columnMap.current_stock = index;
        } else if (normalizedHeader.includes('estoque') && normalizedHeader.includes('mínimo')) {
          columnMap.min_stock = index;
        } else if (normalizedHeader.includes('estoque') && normalizedHeader.includes('máximo')) {
          columnMap.max_stock = index;
        } else if (normalizedHeader.includes('preço') || normalizedHeader.includes('preco')) {
          columnMap.unit_price = index;
        } else if (normalizedHeader.includes('fornecedor')) {
          columnMap.supplier = index;
        } else if (normalizedHeader.includes('localização') || normalizedHeader.includes('local')) {
          columnMap.location = index;
        } else if (normalizedHeader.includes('código de barras') || normalizedHeader.includes('barcode')) {
          columnMap.barcode = index;
        } else if (normalizedHeader.includes('qr') || normalizedHeader.includes('qr_code')) {
          columnMap.qr_code = index;
        }
      });

      const products: ProductImportData[] = [];
      const validationErrors: string[] = [];
      const usedSKUs = new Set<string>(existingSKUs);

      rows.forEach((row, index) => {
        const rowNumber = index + 2;

        if (!row || row.every(cell => !cell)) return;

        const category = normalizeCategory(row[columnMap.category] || '');
        const rawSKU = row[columnMap.sku]?.toString().trim() || '';
        const isAutoSKU = !rawSKU;
        const sku = rawSKU || generateSKU(category, usedSKUs);
        
        // Verificar duplicatas
        const isDuplicate = existingSKUs.has(sku);

        const product: ProductImportData = {
          name: row[columnMap.name]?.toString().trim() || '',
          sku,
          category,
          description: row[columnMap.description]?.toString().trim() || undefined,
          current_stock: parseInt(row[columnMap.current_stock]) || 0,
          min_stock: parseInt(row[columnMap.min_stock]) || 0,
          max_stock: row[columnMap.max_stock] ? parseInt(row[columnMap.max_stock]) : undefined,
          unit_price: row[columnMap.unit_price] ? parseFloat(row[columnMap.unit_price]) : undefined,
          supplier: row[columnMap.supplier]?.toString().trim() || undefined,
          location: row[columnMap.location]?.toString().trim() || undefined,
          barcode: row[columnMap.barcode]?.toString().trim() || undefined,
          qr_code: row[columnMap.qr_code]?.toString().trim() || undefined,
          isAutoSKU,
          isDuplicate,
        };

        // Validações
        if (!product.name) {
          validationErrors.push(`Linha ${rowNumber}: Nome é obrigatório`);
        }
        
        if (isAutoSKU) {
          validationErrors.push(`Linha ${rowNumber}: SKU será gerado automaticamente (${sku})`);
        }
        
        if (isDuplicate) {
          validationErrors.push(`Linha ${rowNumber}: SKU "${sku}" já existe - produto será ignorado`);
        }

        if (!validateCategories.includes(product.category)) {
          validationErrors.push(`Linha ${rowNumber}: Categoria inválida convertida para "outros"`);
        }

        products.push(product);
      });

      setPreview(products);
      setErrors(validationErrors);

      return products;
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }, [existingSKUs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview([]);
    setErrors([]);
    setImportResult(null);

    try {
      await processFile(selectedFile);
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!preview.length || !organization?.organization_id) {
      toast({
        title: "Erro",
        description: "Organização não encontrada. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      autoSKU: 0,
      duplicates: 0,
      errors: [],
    };

    try {
      // Filtrar produtos duplicados
      const productsToImport = preview.filter(p => !p.isDuplicate);
      result.duplicates = preview.filter(p => p.isDuplicate).length;
      
      const total = productsToImport.length;
      setTotalCount(total);
      
      for (let i = 0; i < productsToImport.length; i++) {
        const product = productsToImport[i];
        
        const { error } = await supabase
          .from('products')
          .insert({
            name: product.name,
            description: product.description,
            sku: product.sku,
            category: (product.category as "eletronicos" | "escritorio" | "limpeza" | "manutencao" | "outros" | "cozinha") || "outros",
            current_stock: product.current_stock || 0,
            min_stock: product.min_stock || 0,
            max_stock: product.max_stock,
            unit_price: product.unit_price || 0,
            barcode: product.barcode,
            qr_code: product.qr_code,
            location: product.location,
            supplier: product.supplier,
            created_by: user?.id,
            organization_id: organization.organization_id,
          });

        if (error) {
          console.error(`Error importing product ${product.name}:`, error);
          result.failed++;
          result.errors.push(`${product.name}: ${error.message}`);
        } else {
          result.success++;
          if (product.isAutoSKU) {
            result.autoSKU++;
          }
        }

        setProgress(((i + 1) / total) * 100);
        setProcessedCount(i + 1);
        
        // Pequena pausa para não sobrecarregar o banco
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Importação concluída!",
          description: `${result.success} produtos importados com sucesso.`,
        });
        onImportComplete?.();
      } else if (result.duplicates === preview.length) {
        toast({
          title: "Nenhum produto importado",
          description: "Todos os produtos já existem no sistema.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error importing products:', error);
      toast({
        title: "Erro na importação",
        description: "Alguns produtos podem não ter sido importados",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };


  const downloadTemplate = () => {
    const template = [
      ["Nome do Produto", "SKU", "Categoria", "Descrição", "Estoque Atual", "Estoque Mínimo", "Estoque Máximo", "Preço Unitário", "Código de Barras", "QR Code", "Localização", "Fornecedor"],
      ["Papel A4 500 folhas", "PAP001", "escritorio", "Papel sulfite A4 75g/m²", "100", "10", "500", "25.90", "7891234567890", "", "A1-001", "Fornecedor ABC"],
      ["Mouse Óptico USB", "INF001", "eletronicos", "Mouse óptico com fio USB", "50", "5", "100", "35.00", "7891234567891", "", "B2-015", "Tech Supplies"],
      ["Detergente 500ml", "", "limpeza", "Detergente neutro para limpeza", "200", "20", "400", "4.50", "", "", "C3-010", "Limpeza Total"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_produtos.xlsx");
  };

  const validProducts = preview.filter(p => !p.isDuplicate && p.name);
  const autoSKUProducts = preview.filter(p => p.isAutoSKU);
  const duplicateProducts = preview.filter(p => p.isDuplicate);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ImportLoadingOverlay
          open={isProcessing}
          processed={processedCount}
          total={totalCount}
          title="Importando produtos..."
        />
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos
          </ModalTitle>
          <ModalDescription>
            Importe produtos em lote através de planilhas Excel ou CSV. SKUs podem ser gerados automaticamente.
          </ModalDescription>
        </ModalHeader>


        <div className="space-y-6">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo Excel/CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: Excel (.xlsx, .xls) ou CSV. Se o SKU estiver vazio, será gerado automaticamente.
            </p>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Importando produtos...</span>
                <span className="text-sm">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Resumo da importação após conclusão */}
          {importResult && (
            <Alert className={importResult.success > 0 ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-destructive"}>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Resumo da Importação:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">{importResult.success}</Badge>
                      <span>Produtos importados</span>
                    </div>
                    {importResult.autoSKU > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">{importResult.autoSKU}</Badge>
                        <span>SKUs gerados</span>
                      </div>
                    )}
                    {importResult.duplicates > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{importResult.duplicates}</Badge>
                        <span>Duplicados ignorados</span>
                      </div>
                    )}
                    {importResult.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{importResult.failed}</Badge>
                        <span>Falhas</span>
                      </div>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-destructive">
                      {importResult.errors.slice(0, 3).map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                      {importResult.errors.length > 3 && (
                        <p className="text-muted-foreground">+{importResult.errors.length - 3} outros erros</p>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && !importResult && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Avisos encontrados:</p>
                  {errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs">{error}</p>
                  ))}
                  {errors.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{errors.length - 5} outros avisos...
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && !importResult && (
            <div className="space-y-3">
              {/* Estatísticas */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validProducts.length} válidos
                </Badge>
                {autoSKUProducts.length > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {autoSKUProducts.length} SKUs automáticos
                  </Badge>
                )}
                {duplicateProducts.length > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {duplicateProducts.length} duplicados
                  </Badge>
                )}
              </div>
              
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <div className="text-xs">
                  {preview.slice(0, 10).map((product, index) => (
                    <div 
                      key={index} 
                      className={`p-2 border-b flex items-center gap-2 ${
                        product.isDuplicate 
                          ? 'bg-red-50 dark:bg-red-900/20' 
                          : product.isAutoSKU 
                            ? 'bg-amber-50 dark:bg-amber-900/20' 
                            : ''
                      }`}
                    >
                      <div className="flex-1">
                        <span className="font-medium">{product.name || '(sem nome)'}</span>
                        <span className="text-muted-foreground"> - SKU: </span>
                        <span className={product.isAutoSKU ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                          {product.sku}
                        </span>
                        {product.isAutoSKU && (
                          <Sparkles className="h-3 w-3 inline ml-1 text-amber-500" />
                        )}
                        <span className="text-muted-foreground"> - {product.category}</span>
                      </div>
                      {product.isDuplicate && (
                        <Badge variant="destructive" className="text-xs">Duplicado</Badge>
                      )}
                    </div>
                  ))}
                  {preview.length > 10 && (
                    <div className="p-2 text-muted-foreground">
                      +{preview.length - 10} outros produtos...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!validProducts.length || isProcessing || !organization?.organization_id}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importando..." : `Importar ${validProducts.length} Produtos`}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
