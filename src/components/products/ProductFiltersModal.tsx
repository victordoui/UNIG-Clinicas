import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X } from "lucide-react";
import { categories } from "@/lib/categoryUtils";

interface ProductFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFiltersApply: (filters: any) => void;
  initialFilters?: any;
}

export function ProductFiltersModal({ 
  open, 
  onOpenChange, 
  onFiltersApply, 
  initialFilters = {} 
}: ProductFiltersModalProps) {
  const [filters, setFilters] = useState({
    category: initialFilters.category || "",
    stockStatus: initialFilters.stockStatus || "",
    minStock: initialFilters.minStock || "",
    maxStock: initialFilters.maxStock || "",
    minPrice: initialFilters.minPrice || "",
    maxPrice: initialFilters.maxPrice || "",
    supplier: initialFilters.supplier || "",
    location: initialFilters.location || "",
    ...initialFilters
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    onFiltersApply(filters);
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      category: "",
      stockStatus: "",
      minStock: "",
      maxStock: "",
      minPrice: "",
      maxPrice: "",
      supplier: "",
      location: "",
    };
    setFilters(clearedFilters);
    onFiltersApply(clearedFilters);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </ModalTitle>
          <ModalDescription>
            Configure filtros específicos para encontrar produtos
          </ModalDescription>
        </ModalHeader>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="stockStatus">Status do Estoque</Label>
                  <Select value={filters.stockStatus} onValueChange={(value) => handleFilterChange("stockStatus", value)}>
                    <SelectTrigger id="stockStatus">
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ok">Normal</SelectItem>
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minStock">Estoque Mínimo</Label>
                  <Input 
                    id="minStock"
                    type="number"
                    placeholder="Ex: 10"
                    value={filters.minStock}
                    onChange={(e) => handleFilterChange("minStock", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxStock">Estoque Máximo</Label>
                  <Input 
                    id="maxStock"
                    type="number"
                    placeholder="Ex: 100"
                    value={filters.maxStock}
                    onChange={(e) => handleFilterChange("maxStock", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPrice">Preço Mínimo</Label>
                  <Input 
                    id="minPrice"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10.50"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxPrice">Preço Máximo</Label>
                  <Input 
                    id="maxPrice"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 100.00"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input 
                    id="supplier"
                    placeholder="Nome do fornecedor"
                    value={filters.supplier}
                    onChange={(e) => handleFilterChange("supplier", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input 
                    id="location"
                    placeholder="Ex: A1, B2"
                    value={filters.location}
                    onChange={(e) => handleFilterChange("location", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
              className="hover-scale"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="hover-scale"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleApplyFilters}
                className="bg-gradient-primary text-white hover-scale"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
