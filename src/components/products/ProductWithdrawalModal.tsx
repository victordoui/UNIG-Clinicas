import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Search, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { categoryLabels, getCategoryBadge } from "@/lib/categoryUtils";

interface ProductWithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdrawalCreated?: () => void;
}

export function ProductWithdrawalModal({ open, onOpenChange, onWithdrawalCreated }: ProductWithdrawalModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    withdrawnBy: "",
    reason: "",
  });

  const { toast } = useToast();
  const { user, organization } = useAuth();

  // Carregar produtos disponíveis
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, sku, current_stock, category')
          .gt('current_stock', 0)
          .order('name');

        if (error) {
          console.error('Error loading products:', error);
          return;
        }

        setProducts(data || []);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    if (open) {
      loadProducts();
      setSearchTerm(""); // Reset search when modal opens
    }
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.productId) {
      toast({
        title: "Erro de validação",
        description: "Selecione um produto",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      toast({
        title: "Erro de validação",
        description: "Quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.withdrawnBy.trim()) {
      toast({
        title: "Erro de validação",
        description: "Informe quem retirou o produto",
        variant: "destructive",
      });
      return false;
    }

    const selectedProduct = products.find(p => p.id === formData.productId);
    if (selectedProduct && parseInt(formData.quantity) > selectedProduct.current_stock) {
      toast({
        title: "Erro de validação",
        description: `Quantidade disponível: ${selectedProduct.current_stock}`,
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
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct) {
        throw new Error('Produto não encontrado');
      }

      const quantity = parseInt(formData.quantity);
      const newStock = selectedProduct.current_stock - quantity;

      // Criar movimento de saída
      const movementData = {
        product_id: formData.productId,
        type: 'saida' as const,
        quantity: quantity,
        previous_stock: selectedProduct.current_stock,
        new_stock: newStock,
        unit_price: null,
        total_value: null,
        reason: formData.reason.trim() || 'Saída de estoque',
        document_number: null,
        supplier: null,
        destination: formData.withdrawnBy.trim(),
        destination_location: null,
        location_info: selectedProduct.location || null,
        created_by: user?.id,
        organization_id: organization?.organization_id,
      };

      // Iniciar transação
      const { error: movementError } = await supabase
        .from('movements')
        .insert([movementData]);

      if (movementError) {
        console.error('Error creating movement:', movementError);
        toast({
          title: "Erro ao registrar retirada",
          description: movementError.message,
          variant: "destructive",
        });
        return;
      }

      // Atualizar estoque do produto
      const { error: stockError } = await supabase
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', formData.productId);

      if (stockError) {
        console.error('Error updating stock:', stockError);
        toast({
          title: "Erro ao atualizar estoque",
          description: stockError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Retirada registrada com sucesso!",
        description: `${quantity} unidades de ${selectedProduct.name} retiradas por ${formData.withdrawnBy}`,
      });

      // Reset form
      setFormData({
        productId: "",
        quantity: "",
        withdrawnBy: "",
        reason: "",
      });

      onOpenChange(false);
      onWithdrawalCreated?.();

    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: "Erro interno",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === formData.productId);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-exit" />
            Saída de Produtos
          </ModalTitle>
          <ModalDescription>
            Registre a retirada de produtos do estoque
          </ModalDescription>
        </ModalHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lista de produtos disponíveis */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Produtos Disponíveis</h3>
            
            {/* Search Section */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Pesquisar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
              {filteredProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto com estoque disponível"}
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.productId === product.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleInputChange("productId", product.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        <div className="mt-1">
                          {getCategoryBadge(product.category)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">Estoque: {product.current_stock}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulário de retirada */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Dados da Retirada</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedProduct && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Produto Selecionado:</h4>
                  <p className="text-sm">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Disponível: {selectedProduct.current_stock} unidades
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Quantidade a retirar"
                  min="1"
                  max={selectedProduct?.current_stock || undefined}
                  required
                  disabled={!formData.productId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdrawnBy">Retirado por *</Label>
                <Input
                  id="withdrawnBy"
                  value={formData.withdrawnBy}
                  onChange={(e) => handleInputChange("withdrawnBy", e.target.value)}
                  placeholder="Nome da pessoa que retirou"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Descrição</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  placeholder="Descrição ou observações sobre a retirada..."
                  rows={3}
                />
              </div>

              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p>Data da retirada: {new Date().toLocaleDateString('pt-BR')}</p>
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
                  disabled={isLoading || !formData.productId}
                  className="btn-ripple"
                >
                  {isLoading ? "Registrando..." : "Registrar Retirada"}
                </Button>
              </ModalFooter>
            </form>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
