import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, X } from "lucide-react";

interface MovementFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFiltersApply: (filters: any) => void;
  initialFilters?: any;
}

export function MovementFiltersModal({ 
  open, 
  onOpenChange, 
  onFiltersApply, 
  initialFilters = {} 
}: MovementFiltersModalProps) {
  const [filters, setFilters] = useState({
    type: initialFilters.type || "",
    dateFrom: initialFilters.dateFrom || "",
    dateTo: initialFilters.dateTo || "",
    user: initialFilters.user || "",
    productName: initialFilters.productName || "",
    minQuantity: initialFilters.minQuantity || "",
    maxQuantity: initialFilters.maxQuantity || "",
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
      type: "",
      dateFrom: "",
      dateTo: "",
      user: "",
      productName: "",
      minQuantity: "",
      maxQuantity: "",
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
            Filtros de Movimentação
          </ModalTitle>
          <ModalDescription>
            Configure filtros para encontrar movimentações específicas
          </ModalDescription>
        </ModalHeader>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo de Movimentação</Label>
                  <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="user">Usuário</Label>
                  <Input 
                    id="user"
                    placeholder="Nome do usuário"
                    value={filters.user}
                    onChange={(e) => handleFilterChange("user", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFrom">Data Inicial</Label>
                  <Input 
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="dateTo">Data Final</Label>
                  <Input 
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minQuantity">Quantidade Mínima</Label>
                  <Input 
                    id="minQuantity"
                    type="number"
                    placeholder="Ex: 1"
                    value={filters.minQuantity}
                    onChange={(e) => handleFilterChange("minQuantity", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxQuantity">Quantidade Máxima</Label>
                  <Input 
                    id="maxQuantity"
                    type="number"
                    placeholder="Ex: 100"
                    value={filters.maxQuantity}
                    onChange={(e) => handleFilterChange("maxQuantity", e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="productName">Nome do Produto</Label>
                <Input 
                  id="productName"
                  placeholder="Nome ou código do produto"
                  value={filters.productName}
                  onChange={(e) => handleFilterChange("productName", e.target.value)}
                />
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