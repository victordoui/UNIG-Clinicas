
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: "primary" | "success" | "warning" | "card";
  loading?: boolean;
  description?: string;
  onClick?: () => void;
  clickable?: boolean;
  variant?: "default" | "action";
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  gradient = "card",
  loading = false,
  description,
  onClick,
  clickable = false,
  variant = "default"
}: StatsCardProps) {
  const gradientClass = {
    primary: "bg-gradient-primary text-white",
    success: "bg-gradient-success text-white", 
    warning: "bg-gradient-warning text-white",
    card: "bg-gradient-card"
  }[gradient];

  const changeColor = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted-foreground"
  }[changeType];

  const cardClassName = cn(
    "shadow-card border-border transition-all duration-200",
    gradientClass,
    clickable && "cursor-pointer hover:shadow-lg hover:scale-105",
    variant === "action" && "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950"
  );

  if (loading) {
    return (
      <Card className={cardClassName}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-12 h-12 bg-muted animate-pulse rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName} onClick={clickable ? onClick : undefined}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-sm font-medium",
              gradient === "card" ? "text-muted-foreground" : "text-white/80"
            )}>
              {title}
            </p>
            <p className={cn(
              "text-3xl font-bold tracking-tight",
              gradient === "card" ? "text-foreground" : "text-white"
            )}>
              {value}
            </p>
            {(change || description) && (
              <p className={cn(
                "text-xs font-medium",
                gradient === "card" ? (change ? changeColor : "text-muted-foreground") : "text-white/70"
              )}>
                {change || description}
              </p>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            gradient === "card" ? "bg-background-secondary" : "bg-white/20"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              gradient === "card" ? "text-primary" : "text-white"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
