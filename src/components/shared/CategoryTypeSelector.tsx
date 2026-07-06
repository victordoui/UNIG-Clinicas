import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAssetCategories, useAssetTypes } from "@/hooks/useAssets";
import * as LucideIcons from "lucide-react";
import { Tag } from "lucide-react";

export interface CategoryTypeValue {
  categoryId?: string | null;
  typeId?: string | null;
}

interface Props extends CategoryTypeValue {
  onChange: (v: CategoryTypeValue) => void;
  required?: boolean;
  disabled?: boolean;
  layout?: "row" | "stacked";
  showIcon?: boolean;
  showIconInTrigger?: boolean;
  allowClear?: boolean;
  size?: "sm" | "md";
  labelCategory?: string;
  labelType?: string;
  placeholderCategory?: string;
  placeholderType?: string;
  className?: string;
  hideLabels?: boolean;
}

function IconByName({ name, color }: { name?: string | null; color?: string | null }) {
  const Cmp = (name && (LucideIcons as any)[name]) || Tag;
  return <Cmp className="h-4 w-4 shrink-0" style={color ? { color } : undefined} />;
}

export function CategoryTypeSelector({
  categoryId,
  typeId,
  onChange,
  required,
  disabled,
  layout = "row",
  showIcon = true,
  showIconInTrigger = true,
  allowClear = true,
  size = "md",
  labelCategory = "Categoria",
  labelType = "Tipo",
  placeholderCategory = "Selecione a categoria",
  placeholderType = "Selecione o tipo",
  className,
  hideLabels,
}: Props) {
  const cats = useAssetCategories();
  const types = useAssetTypes(categoryId ?? undefined);

  const catList = (cats.data ?? []) as any[];
  const typeList = (types.data ?? []) as any[];
  const selectedCat = catList.find((c) => c.id === categoryId);

  const trg = size === "sm" ? "h-9 text-sm" : "";

  const handleCat = (v: string) => {
    if (v === "__clear__") return onChange({ categoryId: null, typeId: null });
    onChange({ categoryId: v, typeId: null });
  };
  const handleType = (v: string) => {
    if (v === "__clear__") return onChange({ categoryId, typeId: null });
    onChange({ categoryId, typeId: v });
  };

  return (
    <div className={cn(layout === "row" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3", className)}>
      <div className="space-y-1.5">
        {!hideLabels && <Label>{labelCategory}{required && " *"}</Label>}
        {cats.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={categoryId ?? ""} onValueChange={handleCat} disabled={disabled}>
            <SelectTrigger className={trg}>
              <div className="flex items-center gap-2 truncate">
                {showIcon && showIconInTrigger && selectedCat && <IconByName name={selectedCat.icon} color={selectedCat.color} />}
                <SelectValue placeholder={placeholderCategory} />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {allowClear && categoryId && (
                <SelectItem value="__clear__" className="text-muted-foreground">Limpar seleção</SelectItem>
              )}
              {catList.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    {showIcon && <IconByName name={c.icon} color={c.color} />}
                    <span>{c.name}</span>
                  </div>
                </SelectItem>
              ))}
              {catList.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">Sem categorias cadastradas.</div>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        {!hideLabels && <Label>{labelType}</Label>}
        {types.isLoading && categoryId ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={typeId ?? ""}
            onValueChange={handleType}
            disabled={disabled || !categoryId}
          >
            <SelectTrigger className={trg}>
              <SelectValue placeholder={categoryId ? placeholderType : "Escolha uma categoria primeiro"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {allowClear && typeId && (
                <SelectItem value="__clear__" className="text-muted-foreground">Limpar seleção</SelectItem>
              )}
              {typeList.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              {categoryId && typeList.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">Sem tipos cadastrados para esta categoria.</div>
              )}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export default CategoryTypeSelector;
