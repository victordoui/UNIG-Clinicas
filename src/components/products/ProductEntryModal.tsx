import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Search, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { categoryLabels, getCategoryBadge } from "@/lib/categoryUtils";

interface ProductEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryCreated?: () => void;
}

export function ProductEntryModal({ open, onOpenChange, onEntryCreated }: ProductEntryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    supplier: "",
    documentNumber: "",
    unitPrice: "",
    location: "",
    reason: "",
    additionalEmail: "",
  });

  const { toast } = useToast();
  const { user, organization } = useAuth();

  // Carregar produtos disponíveis
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, sku, current_stock, category, location, supplier, min_stock')
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

    return true;
  };


  const sendNotification = async (product: any, quantity: number, newStock: number) => {
    try {
      // Simplified notification - just show toast for now
      toast({
        title: "Entrada registrada com sucesso!",
        description: `${quantity} unidades de ${product.title} foram adicionadas ao estoque.`,
      });
      
      const emails: string[] = [];
      
      // Adicionar e-mail adicional se informado
      if (formData.additionalEmail.trim()) {
        emails.push(formData.additionalEmail.trim());
      }
      
      if (emails.length === 0) {
        toast({
          title: "Entrada registrada com sucesso!",
          description: `${quantity} unidades de ${product.name} foram adicionadas ao estoque.`,
        });
        return;
      }

      // Enviar notificação para todos os e-mails cadastrados na categoria
      const notificationPromises = emails.map(email => 
        supabase.functions.invoke('send-entry-notification', {
          body: {
            productName: product.name,
            quantity: quantity,
            newStock: newStock,
            email: email,
            category: product.category,
            location: product.location,
            entryDate: new Date().toISOString(),
          }
        })
      );

      const results = await Promise.allSettled(notificationPromises);
      const failures = results.filter(result => result.status === 'rejected');

      if (failures.length > 0) {
        console.error('Some notifications failed:', failures);
        toast({
          title: "Entrada registrada com sucesso!",
          description: `${quantity} unidades de ${product.name} foram adicionadas ao estoque. Algumas notificações falharam.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Entrada registrada com sucesso!",
          description: `${quantity} unidades de ${product.name} foram adicionadas ao estoque. Notificações enviadas para ${emails.length} destinatário(s).`,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Entrada registrada com sucesso!",
        description: `${quantity} unidades de ${product.name} foram adicionadas ao estoque.`,
      });
    }
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
      const unitPrice = formData.unitPrice ? parseFloat(formData.unitPrice) : null;
      const totalValue = unitPrice ? unitPrice * quantity : null;
      const newStock = selectedProduct.current_stock + quantity;

      // Criar movimento de entrada
      const movementData = {
        product_id: formData.productId,
        type: 'entrada' as const,
        quantity: quantity,
        previous_stock: selectedProduct.current_stock,
        new_stock: newStock,
        unit_price: unitPrice,
        total_value: totalValue,
        reason: formData.reason.trim() || 'Entrada de estoque',
        document_number: formData.documentNumber || null,
        supplier: formData.supplier || null,
        destination: null,
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
          title: "Erro ao registrar entrada",
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

      // Enviar notificações automaticamente baseado nas configurações de categoria
      await sendNotification(selectedProduct, quantity, newStock);

      // Reset form
      setFormData({
        productId: "",
        quantity: "",
        supplier: "",
        documentNumber: "",
        reason: "",
        unitPrice: "",
        location: "",
        additionalEmail: "",
      });

      onOpenChange(false);
      onEntryCreated?.();

    } catch (error) {
      console.error('Error creating entry:', error);
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
            <TrendingUp className="h-5 w-5 text-success" />
            Entrada de Produtos
          </ModalTitle>
          <ModalDescription>
            Registre a entrada de produtos no estoque
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
                  {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
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

          {/* Formulário de entrada */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Dados da Entrada</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedProduct && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium">Produto Selecionado:</h4>
                  <p className="text-sm">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Estoque atual: {selectedProduct.current_stock} unidades
                  </p>
                  <div className="mt-1">
                    {getCategoryBadge(selectedProduct.category)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Quantidade a adicionar"
                  min="1"
                  required
                  disabled={!formData.productId}
                />
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

              <div className="space-y-2">
                <Label htmlFor="documentNumber">Número do Documento</Label>
                <Input
                  id="documentNumber"
                  value={formData.documentNumber}
                  onChange={(e) => handleInputChange("documentNumber", e.target.value)}
                  placeholder="Nota fiscal, recibo, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Preço Unitário</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                  placeholder="Valor por unidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Descrição</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  placeholder="Descrição ou observações sobre a entrada..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalEmail">E-mail Adicional para Notificação</Label>
                <Input
                  id="additionalEmail"
                  type="email"
                  value={formData.additionalEmail}
                  onChange={(e) => handleInputChange("additionalEmail", e.target.value)}
                  placeholder="email@exemplo.com"
                />
                <p className="text-xs text-muted-foreground">
                  E-mail adicional para notificar sobre esta entrada (opcional)
                </p>
              </div>

              <div className="space-y-2 p-3 bg-info-subtle rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Notificações automáticas:</strong> As notificações serão enviadas automaticamente para os e-mails cadastrados na categoria "{categoryLabels[selectedProduct?.category] || selectedProduct?.category}".
                </p>
              </div>

              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p>Data da entrada: {new Date().toLocaleDateString('pt-BR')}</p>
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
                  {isLoading ? "Registrando..." : "Registrar Entrada"}
                </Button>
              </ModalFooter>
            </form>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
