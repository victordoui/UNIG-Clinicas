import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRightLeft, Package, MapPin, Search } from "lucide-react";
import { getCategoryBadge } from "@/lib/categoryUtils";

interface ProductTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferCreated?: () => void;
}

export function ProductTransferModal({ open, onOpenChange, onTransferCreated }: ProductTransferModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    quantity: "",
    fromLocation: "",
    toLocation: "",
    reason: "",
    destination: "",
    responsiblePerson: "",
  });

  const { toast } = useToast();
  const { user, organization } = useAuth();

  useEffect(() => {
    if (open) {
      loadProducts();
      resetForm();
    }
  }, [open]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('current_stock', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar a lista de produtos.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSearchTerm("");
    setFormData({
      quantity: "",
      fromLocation: "",
      toLocation: "",
      reason: "",
      destination: "",
      responsiblePerson: "",
    });
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setFormData(prev => ({ 
      ...prev, 
      fromLocation: product?.location || ""
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!selectedProduct || !formData.quantity || !formData.toLocation) {
      toast({
        title: "Erro de validação",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return false;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity <= 0 || quantity > selectedProduct.current_stock) {
      toast({
        title: "Erro de validação",
        description: `Quantidade deve ser entre 1 e ${selectedProduct.current_stock}.`,
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
      const quantity = parseInt(formData.quantity);
      const newStock = selectedProduct.current_stock - quantity;

      // Create movement record for transfer
      const { error: movementError } = await supabase
        .from('movements')
        .insert([{
          product_id: selectedProduct.id,
          type: 'transferencia',
          quantity: quantity,
          previous_stock: selectedProduct.current_stock,
          new_stock: newStock,
          unit_price: null,
          total_value: null,
          reason: formData.reason || `Transferência de ${formData.fromLocation} para ${formData.toLocation}`,
          document_number: `TRANS-${Date.now()}`,
          supplier: null,
          destination: formData.destination || null,
          destination_location: formData.toLocation,
          location_info: formData.fromLocation,
          created_by: user?.id,
        }]);

      if (movementError) throw movementError;

      // Update product stock and location if needed
      const updateData: any = { current_stock: newStock };
      if (formData.toLocation !== formData.fromLocation) {
        updateData.location = formData.toLocation;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      toast({
        title: "Transferência realizada com sucesso!",
        description: `${quantity} unidades de ${selectedProduct.name} foram transferidas.`,
      });

      resetForm();
      onOpenChange(false);
      onTransferCreated?.();

    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: "Erro ao realizar transferência",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl max-h-[90vh]">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferência de Produtos
          </ModalTitle>
          <ModalDescription>
            Realize a transferência de produtos entre localizações
          </ModalDescription>
        </ModalHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Produtos */}
          <div className="space-y-4">
            <div>
              <Label>Selecionar Produto</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-2">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-primary flex-shrink-0" />
                            <h3 className="font-medium text-sm truncate">{product.name}</h3>
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
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Formulário de Transferência */}
          <div className="space-y-4">
            {selectedProduct && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Produto Selecionado</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Nome:</strong> {selectedProduct.name}</div>
                    <div><strong>SKU:</strong> {selectedProduct.sku}</div>
                    <div><strong>Estoque:</strong> {selectedProduct.current_stock} un.</div>
                    <div><strong>Localização:</strong> {selectedProduct.location || "N/A"}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade a Transferir *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="Ex: 10"
                  min="1"
                  max={selectedProduct?.current_stock || 0}
                  required
                  disabled={!selectedProduct}
                />
                {selectedProduct && (
                  <p className="text-sm text-muted-foreground">
                    Máximo disponível: {selectedProduct.current_stock} unidades
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Localização</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromLocation">De (Origem)</Label>
                    <Input
                      id="fromLocation"
                      value={formData.fromLocation}
                      onChange={(e) => handleInputChange("fromLocation", e.target.value)}
                      placeholder="Ex: A1-001"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="toLocation">Para (Destino) *</Label>
                    <Input
                      id="toLocation"
                      value={formData.toLocation}
                      onChange={(e) => handleInputChange("toLocation", e.target.value)}
                      placeholder="Ex: B2-005"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destino/Setor</Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => handleInputChange("destination", e.target.value)}
                      placeholder="Ex: Almoxarifado Central"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsiblePerson">Responsável</Label>
                    <Input
                      id="responsiblePerson"
                      value={formData.responsiblePerson}
                      onChange={(e) => handleInputChange("responsiblePerson", e.target.value)}
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Descrição</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange("reason", e.target.value)}
                    placeholder="Descreva o motivo da transferência..."
                    rows={3}
                  />
                </div>
              </div>
            </form>
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
            onClick={handleSubmit}
            disabled={isLoading || !selectedProduct}
            className="bg-transfer text-transfer-foreground hover:bg-transfer/90"
          >
            {isLoading ? "Transferindo..." : "Realizar Transferência"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}