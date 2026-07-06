import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Search } from "lucide-react";

interface FilterOption {
  key: string;
  label: string;
  type: "select" | "input" | "number" | "date" | "text";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface ModernFilterProps {
  options: FilterOption[];
  onFiltersChange: (filters: Record<string, any>) => void;
  initialFilters?: Record<string, any>;
  className?: string;
}

export function ModernFilter({ 
  options, 
  onFiltersChange, 
  initialFilters = {},
  className = "" 
}: ModernFilterProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== "" && value !== null && value !== undefined
  ).length;

  const renderFilterField = (option: FilterOption) => {
    switch (option.type) {
      case "select":
        return (
          <Select
            value={filters[option.key] || "all"}
            onValueChange={(value) => handleFilterChange(option.key, value === "all" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={option.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {option.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "number":
        return (
          <Input
            type="number"
            placeholder={option.placeholder}
            value={filters[option.key] || ""}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
          />
        );
      
      case "date":
        return (
          <Input
            type="date"
            value={filters[option.key] || ""}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
          />
        );
      
      default:
        return (
          <Input
            placeholder={option.placeholder}
            value={filters[option.key] || ""}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
          />
        );
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="btn-ripple hover-scale relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 bg-primary text-primary-foreground px-1.5 py-0.5 text-xs"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                </span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-muted-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {options.map((option) => (
                  <div key={option.key} className="space-y-2">
                    <Label className="text-sm font-medium">{option.label}</Label>
                    {renderFilterField(option)}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="bg-gradient-primary text-white hover-scale"
                >
                  Aplicar
                </Button>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
      
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} aplicado{activeFiltersCount > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}