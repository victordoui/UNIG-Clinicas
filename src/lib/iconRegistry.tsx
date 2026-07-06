import { Building2, GraduationCap, School, Building, Landmark, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IconEntry {
  id: string;
  category: "unit";
  label: string;
  icon: LucideIcon;
  colorClass: string;
  matchKeywords?: string[];
  isDefault?: boolean;
}

/**
 * Registry de unidades → ícone + cor semântica.
 * Para adicionar uma nova unidade: criar entrada aqui + token CSS `--unit-<slug>` em index.css.
 */
export const unitEntries: IconEntry[] = [
  {
    id: "unig-ni",
    category: "unit",
    label: "UNIG – Nova Iguaçu",
    icon: GraduationCap,
    colorClass: "text-unit-unig-ni",
    matchKeywords: ["unig - nova iguacu", "unig nova iguacu", "unig-ni", "nova iguacu"],
  },
  {
    id: "unig-centro",
    category: "unit",
    label: "UNIG – Centro",
    icon: Landmark,
    colorClass: "text-unit-unig-centro",
    matchKeywords: ["unig - centro", "unig centro", "unig-centro"],
  },
  {
    id: "unig-itaperuna",
    category: "unit",
    label: "UNIG – Itaperuna",
    icon: School,
    colorClass: "text-unit-unig-itaperuna",
    matchKeywords: ["unig - itaperuna", "unig itaperuna", "itaperuna"],
  },
  {
    id: "default",
    category: "unit",
    label: "Unidade",
    icon: Building2,
    colorClass: "text-unit-default",
    isDefault: true,
  },
];

const ICON_BY_KEY: Record<string, LucideIcon> = {
  school: School,
  building: Building,
  graduation: GraduationCap,
  landmark: Landmark,
  default: Building2,
};

function normalize(s: string): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function resolveUnitIcon(name?: string | null): IconEntry {
  const norm = normalize(name ?? "");
  if (norm) {
    for (const e of unitEntries) {
      if (e.matchKeywords?.some((k) => norm.includes(normalize(k)))) return e;
    }
  }
  return unitEntries.find((e) => e.isDefault) ?? unitEntries[unitEntries.length - 1];
}

export function getIconByKey(key?: string | null): LucideIcon {
  return ICON_BY_KEY[(key ?? "").toLowerCase()] ?? Building2;
}

interface RegistryIconProps {
  entry?: IconEntry;
  name?: string | null;
  size?: number;
  className?: string;
}

export function RegistryIcon({ entry, name, size = 18, className }: RegistryIconProps) {
  const e = entry ?? resolveUnitIcon(name);
  const Icon = e.icon;
  return <Icon className={cn(e.colorClass, className)} style={{ width: size, height: size }} />;
}
