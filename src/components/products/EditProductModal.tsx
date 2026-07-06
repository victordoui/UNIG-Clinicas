import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { categories } from "@/lib/categoryUtils";

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onProductUpdated: () => void;
}

export function EditProductModal({ 
  open, 
  onOpenChange, 
  product, 
  onProductUpdated 
}: EditProductModalProps) {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    sku: string;
    category: string;
    current_stock: number;
    min_stock: number;
    unit_price: number;
    location: string;
  }>({
    title: "",
    description: "",
    sku: "",
    category: "",
    current_stock: 0,
    min_stock: 0,
    unit_price: 0,
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product && open) {
      setFormData({
        title: product.title || "",
        description: product.description || "",
        sku: product.sku || "",
        category: product.category || "",
        current_stock: product.current_stock || 0,
        min_stock: product.min_stock || 0,
        unit_price: product.unit_price || 0,
        location: product.location || "",
      });
    }
  }, [product, open]);

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
      const updatedData = {
        name: formData.title,
        description: formData.description,
        sku: formData.sku,
        category: formData.category as "eletronicos" | "escritorio" | "limpeza" | "manutencao" | "outros" | "cozinha",
        current_stock: formData.current_stock,
        min_stock: formData.min_stock,
        unit_price: formData.unit_price,
        location: formData.location,
      };

      const { error } = await supabase
        .from('products')
        .update(updatedData)
        .eq('id', product.id);

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Erro ao atualizar produto",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });

      onProductUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Produto
          </ModalTitle>
          <ModalDescription>
            Modifique as informações do produto
          </ModalDescription>
        </ModalHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Nome do Produto *</Label>
                  <Input 
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="sku">Código SKU *</Label>
                  <Input 
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Localização</Label>
                    <Input 
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="Ex: A1, B2"
                    />
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="current_stock">Estoque Atual</Label>
                  <Input 
                    id="current_stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => handleInputChange("current_stock", parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input 
                    id="min_stock"
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => handleInputChange("min_stock", parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="unit_price">Preço Unitário</Label>
                  <Input 
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange("unit_price", parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>
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
              disabled={loading}
              className="bg-gradient-primary text-white hover-scale"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
