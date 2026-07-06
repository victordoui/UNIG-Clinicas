import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Package, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

interface StockMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  onMovementCreated: () => void;
}

export function StockMovementModal({ 
  open, 
  onOpenChange, 
  product, 
  onMovementCreated 
}: StockMovementModalProps) {
  const { user, organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<{
    product_id: string;
    type: string;
    quantity: number;
    reason: string;
  }>({
    product_id: "",
    type: "saida",
    quantity: 1,
    reason: "",
  });

  useEffect(() => {
    if (open) {
      loadProducts();
      if (product) {
        setFormData(prev => ({
          ...prev,
          product_id: product.id,
        }));
      }
    }
  }, [open, product]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, sku, current_stock')
        .order('title');

      if (error) {
        console.error('Error loading products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current product stock
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', formData.product_id)
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
        toast({
          title: "Erro ao buscar produto",
          description: productError.message,
          variant: "destructive",
        });
        return;
      }

      const currentStock = productData.current_stock;
      let newStock = currentStock;

      // Calculate new stock based on movement type
      if (formData.type === "entrada") {
        newStock = currentStock + formData.quantity;
      } else if (formData.type === "saida") {
        newStock = currentStock - formData.quantity;
        if (newStock < 0) {
          toast({
            title: "Estoque insuficiente",
            description: "Não há estoque suficiente para esta saída.",
            variant: "destructive",
          });
          return;
        }
      }

      // Create movement record
      const { error: movementError } = await supabase
        .from('movements')
        .insert({
          product_id: formData.product_id,
          type: formData.type as "entrada" | "saida" | "transferencia" | "ajuste",
          quantity: formData.quantity,
          previous_stock: 0,
          new_stock: 0,
          reason: formData.reason,
          created_by: user?.id,
          organization_id: organization?.organization_id,
        });

      if (movementError) {
        console.error('Error creating movement:', movementError);
        toast({
          title: "Erro ao criar movimentação",
          description: movementError.message,
          variant: "destructive",
        });
        return;
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', formData.product_id);

      if (updateError) {
        console.error('Error updating product stock:', updateError);
        toast({
          title: "Erro ao atualizar estoque",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Movimentação registrada",
        description: "A movimentação foi registrada com sucesso.",
      });

      onMovementCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        product_id: "",
        type: "saida",
        quantity: 1,
        reason: "",
      });
    } catch (error) {
      console.error('Error processing movement:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível processar a movimentação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === formData.product_id);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Movimentação de Estoque
          </ModalTitle>
          <ModalDescription>
            Registre entrada, saída ou ajuste de estoque
          </ModalDescription>
        </ModalHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_id">Produto *</Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(value) => handleInputChange("product_id", value)}
                  >
                    <SelectTrigger id="product_id">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.title} ({product.sku}) - {product.current_stock} unid.
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo de Movimentação *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleInputChange("type", value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-4 w-4 text-success" />
                          Entrada
                        </div>
                      </SelectItem>
                      <SelectItem value="saida">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-4 w-4 text-destructive" />
                          Saída
                        </div>
                      </SelectItem>
                      <SelectItem value="ajuste">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-warning" />
                          Ajuste
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input 
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange("quantity", parseInt(e.target.value) || 1)}
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="reason">Motivo</Label>
                  <Input 
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange("reason", e.target.value)}
                    placeholder="Motivo da movimentação"
                  />
                </div>
              </div>
              
              {getSelectedProduct() && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Informações do Produto</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Estoque Atual:</span>
                      <span className="ml-2 font-medium">{getSelectedProduct()?.current_stock} unidades</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Novo Estoque:</span>
                      <span className="ml-2 font-medium">
                        {formData.type === "entrada" 
                          ? getSelectedProduct()?.current_stock + formData.quantity
                          : formData.type === "saida"
                          ? getSelectedProduct()?.current_stock - formData.quantity
                          : formData.quantity
                        } unidades
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="hover-scale"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={loading || !formData.product_id}
              className="bg-gradient-primary text-white hover-scale"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Registrar Movimentação"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}