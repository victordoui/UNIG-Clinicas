import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { FilterChips, type FilterChip } from "@/components/ui/filter-chips";
import { Search, Plus, Package, Edit, Trash2, QrCode, ArrowUpDown, FileSpreadsheet, MinusCircle, TrendingUp, ArrowRightLeft, Filter, Menu, MoreHorizontal, Download } from "lucide-react";
import { NewProductModal } from "@/components/products/NewProductModal";
import { ProductFiltersModal } from "@/components/products/ProductFiltersModal";
import { EditProductModal } from "@/components/products/EditProductModal";
import { ImportProductsModal } from "@/components/products/ImportProductsModal";
import { ExportProductsModal } from "@/components/products/ExportProductsModal";
import { ProductWithdrawalModal } from "@/components/products/ProductWithdrawalModal";
import { ProductEntryModal } from "@/components/products/ProductEntryModal";
import { ProductTransferModal } from "@/components/products/ProductTransferModal";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import { StockMovementModal } from "@/components/stock/StockMovementModal";
import { ModernFilter } from "@/components/ui/modern-filter";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { categoryLabels, getCategoryBadge } from "@/lib/categoryUtils";

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [filters, setFilters] = useState<any>({});
  const navigate = useNavigate();
  const { user, organization, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  // Load products from database with filters
  const loadProducts = async () => {
    try {
      let query = supabase.from('products').select('*');

      // Filter by organization (unless super admin)
      if (!isSuperAdmin && organization?.organization_id) {
        query = query.eq('organization_id', organization.organization_id);
      }

      // Apply filters
      if (filters.category && filters.category !== "all") {
        query = query.eq('category', filters.category);
      }
      if (filters.supplier) {
        query = query.ilike('supplier', `%${filters.supplier}%`);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.minStock) {
        query = query.gte('current_stock', parseInt(filters.minStock));
      }
      if (filters.maxStock) {
        query = query.lte('current_stock', parseInt(filters.maxStock));
      }
      if (filters.minPrice) {
        query = query.gte('unit_price', parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte('unit_price', parseFloat(filters.maxPrice));
      }
      const {
        data,
        error
      } = await query.order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('Error loading products:', error);
        toast({
          title: "Erro ao carregar produtos",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      let filteredData = data || [];

      // Apply stock status filter
      if (filters.stockStatus && filters.stockStatus !== "all") {
        filteredData = filteredData.filter(product => {
          const status = getStockStatus(product.current_stock, product.min_stock);
          return status === filters.stockStatus;
        });
      }
      setProducts(filteredData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteProduct = (product: any) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      // 1. Deletar alert_suppressions vinculadas
      const { data: deletedSuppressions, error: suppressionsError } = await supabase
        .from('alert_suppressions')
        .delete()
        .eq('product_id', productToDelete.id)
        .select();
      
      if (suppressionsError) {
        console.error('Error deleting alert suppressions:', suppressionsError);
        toast({
          title: "Erro ao excluir supressões",
          description: "Você não tem permissão para excluir supressões de alerta.",
          variant: "destructive"
        });
        return;
      }

      // 2. Deletar movimentações vinculadas
      const { data: deletedMovements, error: movementsError } = await supabase
        .from('movements')
        .delete()
        .eq('product_id', productToDelete.id)
        .select();
      
      if (movementsError) {
        console.error('Error deleting movements:', movementsError);
        toast({
          title: "Erro ao excluir movimentações",
          description: "Você não tem permissão para excluir movimentações.",
          variant: "destructive"
        });
        return;
      }

      // 3. Deletar alertas vinculados
      const { data: deletedAlerts, error: alertsError } = await supabase
        .from('alerts')
        .delete()
        .eq('product_id', productToDelete.id)
        .select();
      
      if (alertsError) {
        console.error('Error deleting alerts:', alertsError);
        toast({
          title: "Erro ao excluir alertas",
          description: "Você não tem permissão para excluir alertas.",
          variant: "destructive"
        });
        return;
      }

      // 4. Deletar o produto
      const { data: deletedProducts, error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .select();
        
      if (productError) {
        console.error('Error deleting product:', productError);
        toast({
          title: "Erro ao excluir produto",
          description: productError.message,
          variant: "destructive"
        });
        return;
      }

      // Verificar se realmente deletou algo
      if (!deletedProducts || deletedProducts.length === 0) {
        toast({
          title: "Erro ao excluir produto",
          description: "Você não tem permissão para excluir este produto ou ele já foi removido.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Produto excluído",
        description: `O produto "${productToDelete.name}" foi excluído com sucesso.`
      });
      
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível excluir o produto.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };
  const handleStockMovement = (product: any) => {
    setSelectedProduct(product);
    setIsStockModalOpen(true);
  };
  const handleFiltersApply = (newFilters: any) => {
    setFilters(newFilters);
  };
  useEffect(() => {
    loadProducts();
  }, [filters]);
  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return "critico";
    if (currentStock <= minStock) return "baixo";
    return "ok";
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge variant="default" className="bg-success text-success-foreground">Normal</Badge>;
      case "baixo":
        return <Badge variant="default" className="bg-warning text-warning-foreground">Baixo</Badge>;
      case "critico":
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };
  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Header da página */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Package className="h-6 w-6 text-primary" />
                  Produtos
                </h1>
                <p className="text-muted-foreground mt-1">Gerencie produtos do almoxarifado</p>
              </div>
              
              <div className="flex gap-2 overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap">
                {/* Menu Moderno */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="btn-ripple hover-scale">
                      <Menu className="h-4 w-4 mr-2" />
                      Ferramentas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/scanner")}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Scanner QR
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Importar Produtos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsExportModalOpen(true)}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Produtos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsFiltersModalOpen(true)}>
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros Avançados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Botões de Ação */}
                <Button size="sm" onClick={() => setIsWithdrawalModalOpen(true)} className="btn-ripple hover-scale bg-exit text-exit-foreground hover:bg-exit/90 shadow-md font-semibold">
                  <MinusCircle className="h-4 w-4 mr-2" />
                  Saída
                </Button>
                <Button size="sm" onClick={() => setIsEntryModalOpen(true)} className="btn-ripple hover-scale bg-entry text-entry-foreground hover:bg-entry/90 shadow-md font-semibold">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Entrada
                </Button>
                <Button size="sm" onClick={() => setIsTransferModalOpen(true)} className="btn-ripple hover-scale bg-transfer text-transfer-foreground hover:bg-transfer/90 shadow-md font-semibold">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferência
                </Button>
                <Button size="sm" className="bg-new-product text-new-product-foreground hover:bg-new-product/90 btn-ripple hover-scale shadow-md font-semibold" onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            </div>

            {/* Filtros e busca modernos */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar produtos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12 text-base bg-card shadow-card border-border/50 focus:shadow-elevated" />
                </div>
              </div>
              <ModernFilter options={[{
          key: "category",
          label: "Categoria",
          type: "select",
          options: [{
            value: "eletronicos",
            label: "Eletrônicos"
          }, {
            value: "escritorio",
            label: "Escritório"
          }, {
            value: "limpeza",
            label: "Limpeza"
          }, {
            value: "manutencao",
            label: "Manutenção"
          }, {
            value: "cozinha",
            label: "Cozinha"
          }, {
            value: "outros",
            label: "Outros"
          }]
        }, {
          key: "stockStatus",
          label: "Status do Estoque",
          type: "select",
          options: [{
            value: "ok",
            label: "Normal"
          }, {
            value: "baixo",
            label: "Baixo"
          }, {
            value: "critico",
            label: "Crítico"
          }]
        }, {
          key: "supplier",
          label: "Fornecedor",
          type: "text",
          placeholder: "Nome do fornecedor"
        }, {
          key: "location",
          label: "Localização",
          type: "text",
          placeholder: "Ex: A1, B2"
        }, {
          key: "minStock",
          label: "Estoque Mínimo",
          type: "number",
          placeholder: "Ex: 10"
        }, {
          key: "maxStock",
          label: "Estoque Máximo",
          type: "number",
          placeholder: "Ex: 100"
        }]} onFiltersChange={handleFiltersApply} initialFilters={filters} />
            </div>

            {/* Chips de filtros ativos */}
            {(() => {
              const labelMap: Record<string, string> = {
                category: "Categoria",
                stockStatus: "Status",
                supplier: "Fornecedor",
                location: "Local",
                minStock: "Estoque min",
                maxStock: "Estoque max",
                minPrice: "Preço min",
                maxPrice: "Preço max",
              };
              const chips: FilterChip[] = Object.entries(filters)
                .filter(([_, v]) => v !== undefined && v !== "" && v !== "all")
                .map(([k, v]) => ({
                  key: k,
                  label: labelMap[k] ?? k,
                  value: String(v),
                  onRemove: () => {
                    const next = { ...filters };
                    delete next[k];
                    setFilters(next);
                  },
                }));
              return <FilterChips chips={chips} onClearAll={() => setFilters({})} />;
            })()}

            {/* Tabela / lista de produtos */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Produtos ({filteredProducts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton rows={6} columns={6} />
                ) : (
                  <ResponsiveTable
                    data={filteredProducts}
                    rowKey={(p) => p.id}
                    emptyState={
                      <EmptyState
                        icon={Package}
                        title={searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                        description={
                          searchTerm
                            ? "Tente ajustar os filtros ou termo de busca para encontrar o que procura."
                            : "Comece adicionando seu primeiro produto ao estoque."
                        }
                        variant={searchTerm ? "search" : "default"}
                        action={
                          !searchTerm && (
                            <Button onClick={() => setIsModalOpen(true)} className="btn-ripple hover-scale">
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Produto
                            </Button>
                          )
                        }
                      />
                    }
                    columns={[
                      {
                        key: "produto",
                        header: "Produto",
                        mobilePrimary: true,
                        cell: (p: any) => (
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                          </div>
                        ),
                      },
                      { key: "categoria", header: "Categoria", cell: (p: any) => getCategoryBadge(p.category) },
                      {
                        key: "qtd",
                        header: "Quantidade",
                        cell: (p: any) => (
                          <span>
                            <span className="font-medium">{p.current_stock}</span>
                            <span className="text-muted-foreground text-xs"> / min: {p.min_stock}</span>
                          </span>
                        ),
                      },
                      {
                        key: "local",
                        header: "Localização",
                        hideOnMobile: true,
                        cell: (p: any) => <span className="font-mono text-xs">{p.location || "N/A"}</span>,
                      },
                      {
                        key: "status",
                        header: "Status",
                        cell: (p: any) => getStatusBadge(getStockStatus(p.current_stock, p.min_stock)),
                      },
                      {
                        key: "preco",
                        header: "Valor Unit.",
                        cell: (p: any) => (p.unit_price ? `R$ ${p.unit_price.toFixed(2)}` : "N/A"),
                      },
                      {
                        key: "acoes",
                        header: "Ações",
                        cell: (p: any) => (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" aria-label="Movimentar estoque" onClick={() => handleStockMovement(p)}>
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Editar produto" onClick={() => handleEditProduct(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Excluir produto" className="text-destructive hover:text-destructive" onClick={() => handleDeleteProduct(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
      </div>
      
      <NewProductModal open={isModalOpen} onOpenChange={setIsModalOpen} onProductCreated={loadProducts} />
      
      <ProductFiltersModal open={isFiltersModalOpen} onOpenChange={setIsFiltersModalOpen} onFiltersApply={handleFiltersApply} initialFilters={filters} />
      
      {selectedProduct && <EditProductModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} product={selectedProduct} onProductUpdated={loadProducts} />}
      
      {selectedProduct && <StockMovementModal open={isStockModalOpen} onOpenChange={setIsStockModalOpen} product={selectedProduct} onMovementCreated={loadProducts} />}
      
      <ImportProductsModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} onImportComplete={loadProducts} />
      
      <ExportProductsModal 
        open={isExportModalOpen} 
        onOpenChange={setIsExportModalOpen} 
        products={products}
        filteredProducts={filteredProducts}
        hasActiveFilters={Object.keys(filters).some(key => filters[key] && filters[key] !== "all")}
      />
      
      <ProductWithdrawalModal open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen} onWithdrawalCreated={loadProducts} />
      
      <ProductEntryModal open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen} onEntryCreated={loadProducts} />
      
      <ProductTransferModal open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen} onTransferCreated={loadProducts} />
      
      <DeleteProductDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        product={productToDelete}
        onConfirm={confirmDeleteProduct}
        isDeleting={isDeleting}
      />
    </MainLayout>;
}