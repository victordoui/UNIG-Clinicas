import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Package } from "lucide-react";
import { categories, getCategoryBadge } from "@/lib/categoryUtils";

interface NewProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated?: () => void;
}

export function NewProductModal({ open, onOpenChange, onProductCreated }: NewProductModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    current_stock: "",
    min_stock: "",
    max_stock: "",
    unit_price: "",
    supplier: "",
    location: "",
    barcode: "",
    qr_code: "",
  });

  const { toast } = useToast();
  const { user, organization } = useAuth();

  useEffect(() => {
    if (open) {
      loadExistingProducts();
    }
  }, [open]);

  const loadExistingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setExistingProducts(data || []);
    } catch (error) {
      console.error('Error loading existing products:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Search for similar products when typing name or SKU
    if (field === 'name' || field === 'sku') {
      const searchTerm = value.toLowerCase();
      if (searchTerm.length >= 2) {
        const results = existingProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          product.supplier?.toLowerCase().includes(searchTerm)
        ).slice(0, 5);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do produto é obrigatório",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.sku.trim()) {
      toast({
        title: "Erro de validação", 
        description: "Código SKU é obrigatório",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.category) {
      toast({
        title: "Erro de validação",
        description: "Categoria é obrigatória",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // Check organization limits
      if (organization?.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('max_products')
          .eq('id', organization.organization_id)
          .single();

        const { count: currentCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.organization_id);

        if (orgData && currentCount !== null && currentCount >= orgData.max_products) {
          toast({
            title: "Limite atingido",
            description: `Sua organização atingiu o limite de ${orgData.max_products} produtos. Entre em contato para fazer upgrade.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Warning when near limit (90%)
        if (orgData && currentCount !== null && currentCount >= orgData.max_products * 0.9) {
          toast({
            title: "Atenção",
            description: `Você está próximo do limite de produtos (${currentCount}/${orgData.max_products}). Considere fazer upgrade.`,
          });
        }
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim(),
        category: formData.category as "eletronicos" | "escritorio" | "limpeza" | "manutencao" | "outros" | "cozinha",
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        max_stock: parseInt(formData.max_stock) || 0,
        unit_price: parseFloat(formData.unit_price) || 0,
        supplier: formData.supplier.trim() || null,
        location: formData.location.trim() || null,
        barcode: formData.barcode.trim() || null,
        qr_code: formData.qr_code.trim() || null,
        created_by: user?.id,
        organization_id: organization?.organization_id || null,
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) {
        console.error('Error creating product:', error);
        toast({
          title: "Erro ao criar produto",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Produto criado com sucesso!",
        description: `${formData.name} foi adicionado ao sistema.`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        current_stock: "",
        min_stock: "",
        max_stock: "",
        unit_price: "",
        supplier: "",
        location: "",
        barcode: "",
        qr_code: "",
      });

      onOpenChange(false);
      onProductCreated?.();

    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Erro interno",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-new-product" />
            Novo Produto
          </ModalTitle>
          <ModalDescription>
            Adicione um novo produto ao sistema de almoxarifado
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Papel A4 500 folhas"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">Código SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="Ex: PAP001"
                required
              />
            </div>
          </div>

          {/* Similar products suggestion with modern design */}
          {searchResults.length > 0 && (
            <Card className="border-primary/20 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Produtos Similares no Estoque</h3>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {searchResults.map((product) => (
                    <Card key={product.id} className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-primary flex-shrink-0" />
                              <h4 className="font-medium text-sm truncate">{product.name}</h4>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>
                              <div className="flex items-center gap-2">
                                {getCategoryBadge(product.category)}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Estoque: {product.current_stock} un.</span>
                                <span className="text-xs text-muted-foreground">Local: {product.location || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-warning/10 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    💡 <strong>Atenção:</strong> Verifique se o produto já existe antes de criar um novo
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descrição detalhada do produto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(cat.value)}
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange("supplier", e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Quantidade Atual</Label>
              <Input
                id="current_stock"
                type="number"
                value={formData.current_stock}
                onChange={(e) => handleInputChange("current_stock", e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock">Estoque Mínimo</Label>
              <Input
                id="min_stock"
                type="number"
                value={formData.min_stock}
                onChange={(e) => handleInputChange("min_stock", e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_stock">Estoque Máximo</Label>
              <Input
                id="max_stock"
                type="number"
                value={formData.max_stock}
                onChange={(e) => handleInputChange("max_stock", e.target.value)}
                placeholder="Opcional"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">Preço Unitário (R$)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => handleInputChange("unit_price", e.target.value)}
                placeholder="0.00"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Ex: A1-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange("barcode", e.target.value)}
                placeholder="Código de barras do produto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr_code">QR Code</Label>
              <Input
                id="qr_code"
                value={formData.qr_code}
                onChange={(e) => handleInputChange("qr_code", e.target.value)}
                placeholder="QR Code do produto"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="btn-ripple"
            >
              {isLoading ? "Criando..." : "Criar Produto"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
