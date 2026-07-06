import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardFiltersProps {
  dateRange: '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';
  onDateRangeChange: (range: '7d' | '30d' | '3m' | '6m' | '1y' | 'custom') => void;
  customStartDate: Date | null;
  customEndDate: Date | null;
  onCustomDateChange: (start: Date | null, end: Date | null) => void;
  selectedPlans: string[];
  onPlansChange: (plans: string[]) => void;
  onApply: () => void;
  onClear: () => void;
}

export function DashboardFilters({
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  selectedPlans,
  onPlansChange,
  onApply,
  onClear,
}: DashboardFiltersProps) {
  const handlePlanToggle = (plan: string) => {
    if (selectedPlans.includes(plan)) {
      onPlansChange(selectedPlans.filter(p => p !== plan));
    } else {
      onPlansChange([...selectedPlans, plan]);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor de período */}
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={dateRange} onValueChange={(value: any) => onDateRangeChange(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último ano</SelectItem>
              <SelectItem value="custom">Período customizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date pickers customizados */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customStartDate || undefined}
                    onSelect={(date) => onCustomDateChange(date || null, customEndDate)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customEndDate || undefined}
                    onSelect={(date) => onCustomDateChange(customStartDate, date || null)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Checkboxes de planos */}
        <div className="space-y-2">
          <Label>Comparar Planos</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="plan-basic"
                checked={selectedPlans.includes('basic')}
                onCheckedChange={() => handlePlanToggle('basic')}
              />
              <label htmlFor="plan-basic" className="text-sm font-medium cursor-pointer">
                Basic
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="plan-pro"
                checked={selectedPlans.includes('pro')}
                onCheckedChange={() => handlePlanToggle('pro')}
              />
              <label htmlFor="plan-pro" className="text-sm font-medium cursor-pointer">
                Pro
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="plan-enterprise"
                checked={selectedPlans.includes('enterprise')}
                onCheckedChange={() => handlePlanToggle('enterprise')}
              />
              <label htmlFor="plan-enterprise" className="text-sm font-medium cursor-pointer">
                Enterprise
              </label>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-4">
          <Button onClick={onApply} className="flex-1">
            <Filter className="mr-2 h-4 w-4" />
            Aplicar Filtros
          </Button>
          <Button onClick={onClear} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
