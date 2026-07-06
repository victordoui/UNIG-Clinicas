import { LucideIcon, Package, FileText, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "search" | "error";
  className?: string;
}

const variantIcons = {
  default: Package,
  search: Search,
  error: AlertCircle,
};

const variantStyles = {
  default: "text-muted-foreground",
  search: "text-primary/60",
  error: "text-destructive/60",
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  variant = "default",
  className 
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
      className
    )}>
      <div className={cn(
        "p-4 rounded-full bg-muted/50 mb-4 transition-transform duration-300 hover:scale-110",
        variantStyles[variant]
      )}>
        <Icon className="h-10 w-10" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md mb-4">{description}</p>
      )}
      {action && (
        <div className="mt-2">{action}</div>
      )}
    </div>
  );
}
