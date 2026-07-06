import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Hand, MousePointer2, Calendar as CalendarIcon, Columns3, Filter,
  Route, ChevronsRight, Undo2, Redo2, Eye, FileText, Download, Bookmark,
  KanbanSquare, Table as TableIcon, List, ZoomIn, ZoomOut,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export type KanbanView = 'kanban' | 'table' | 'load';
export type KanbanPeriod = 'all' | 'day' | 'week' | 'month';
export type KanbanDensity = 'compact' | 'normal' | 'large';

interface Props {
  view: KanbanView; setView: (v: KanbanView) => void;
  period: KanbanPeriod; setPeriod: (p: KanbanPeriod) => void;
  density: KanbanDensity; setDensity: (d: KanbanDensity) => void;
  mode: 'select' | 'hand'; setMode: (m: 'select' | 'hand') => void;
  highlightCritical: boolean; setHighlightCritical: (b: boolean) => void;
  onUndo?: () => void; canUndo?: boolean;
  onRedo?: () => void; canRedo?: boolean;
  onScrollToToday?: () => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
}

export function KanbanToolbar(p: Props) {
  return (
    <div className="rounded-lg border border-border bg-background/60 backdrop-blur p-2 flex flex-wrap items-center gap-2 mb-3">
      {/* Visão */}
      <ToggleGroup type="single" size="sm" value={p.view} onValueChange={v => v && p.setView(v as KanbanView)}>
        <ToggleGroupItem value="kanban" className="h-7 gap-1 px-2"><KanbanSquare className="h-3.5 w-3.5" />Kanban</ToggleGroupItem>
        <ToggleGroupItem value="table" className="h-7 gap-1 px-2"><TableIcon className="h-3.5 w-3.5" />Tabela</ToggleGroupItem>
        <ToggleGroupItem value="load" className="h-7 gap-1 px-2"><List className="h-3.5 w-3.5" />Carga</ToggleGroupItem>
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />

      {/* Zoom / densidade */}
      <div className="flex items-center gap-1.5 min-w-[140px]">
        <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
        <Slider
          value={[p.density === 'compact' ? 0 : p.density === 'normal' ? 50 : 100]}
          onValueChange={([v]) => p.setDensity(v < 33 ? 'compact' : v < 67 ? 'normal' : 'large')}
          max={100} step={1} className="w-24"
        />
        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Período */}
      <ToggleGroup type="single" size="sm" value={p.period} onValueChange={v => v && p.setPeriod(v as KanbanPeriod)}>
        <ToggleGroupItem value="day" className="h-7 px-2">Hoje</ToggleGroupItem>
        <ToggleGroupItem value="week" className="h-7 px-2">Semana</ToggleGroupItem>
        <ToggleGroupItem value="month" className="h-7 px-2">Mês</ToggleGroupItem>
        <ToggleGroupItem value="all" className="h-7 px-2">Tudo</ToggleGroupItem>
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />

      {/* Ações secundárias */}
      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={p.onScrollToToday}>
        <CalendarIcon className="h-3.5 w-3.5" />Hoje
      </Button>
      <Button
        size="sm"
        variant={p.highlightCritical ? 'secondary' : 'ghost'}
        className="h-7 px-2 gap-1"
        onClick={() => p.setHighlightCritical(!p.highlightCritical)}
        title="Caminho crítico (SLA estourado)"
      >
        <Route className="h-3.5 w-3.5" />Caminho crítico
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={p.onUndo} disabled={!p.canUndo}>
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={p.onRedo} disabled={!p.canRedo}>
        <Redo2 className="h-3.5 w-3.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1">
            <Eye className="h-3.5 w-3.5" />Visões
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Visões salvas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><Bookmark className="h-3.5 w-3.5 mr-2" />Salvar visão atual</DropdownMenuItem>
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">Nenhuma visão salva</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1">
            <Download className="h-3.5 w-3.5" />Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={p.onExportPdf}><FileText className="h-3.5 w-3.5 mr-2" />PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={p.onExportCsv}><FileText className="h-3.5 w-3.5 mr-2" />CSV</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
          <Button type="button" size="sm" variant={p.mode === 'select' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => p.setMode('select')} title="Selecionar (V)">
            <MousePointer2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant={p.mode === 'hand' ? 'secondary' : 'ghost'} className="h-7 px-2" onClick={() => p.setMode('hand')} title="Mover (H)">
            <Hand className="h-3.5 w-3.5" />
          </Button>
        </div>
        {p.mode === 'hand' && <Badge variant="outline" className="text-[10px]">Modo mão</Badge>}
      </div>
    </div>
  );
}
