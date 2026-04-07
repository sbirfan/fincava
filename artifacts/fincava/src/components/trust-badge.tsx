import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, ShieldCheck, ShieldAlert, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getTier(score: number) {
  if (score >= 85) return { label: "Platinum", color: "text-sky-600 bg-sky-50 border-sky-200", icon: ShieldCheck, ring: "ring-sky-200" };
  if (score >= 70) return { label: "Gold", color: "text-amber-600 bg-amber-50 border-amber-200", icon: ShieldCheck, ring: "ring-amber-200" };
  if (score >= 50) return { label: "Silver", color: "text-slate-500 bg-slate-50 border-slate-200", icon: Shield, ring: "ring-slate-200" };
  return { label: "Basic", color: "text-muted-foreground bg-muted border-border", icon: ShieldAlert, ring: "ring-border" };
}

export function TrustBadge({ score, size = "md", showLabel = false, className }: TrustBadgeProps) {
  const tier = getTier(score);
  const Icon = tier.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "inline-flex items-center font-semibold rounded-full border cursor-help select-none",
          tier.color,
          sizeClasses[size],
          className,
        )}>
          <Icon className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} />
          <span>{score}</span>
          {showLabel && <span className="hidden sm:inline">{tier.label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] p-3">
        <p className="font-semibold text-sm mb-1">{tier.label} Exporter — Trust Score: {score}/100</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Calculated from completed orders, certifications, response time, profile completeness, and verified trade history.</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TrustScoreBar({ score }: { score: number }) {
  const tier = getTier(score);
  const segments = [
    { label: "Basic", min: 0, max: 50, color: "bg-slate-300" },
    { label: "Silver", min: 50, max: 70, color: "bg-slate-400" },
    { label: "Gold", min: 70, max: 85, color: "bg-amber-400" },
    { label: "Platinum", min: 85, max: 100, color: "bg-sky-400" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Trust Score</span>
        <span className={cn("font-bold", score >= 85 ? "text-sky-600" : score >= 70 ? "text-amber-600" : "text-slate-500")}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", score >= 85 ? "bg-sky-500" : score >= 70 ? "bg-amber-500" : score >= 50 ? "bg-slate-400" : "bg-slate-300")}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Basic</span><span>Silver</span><span>Gold</span><span>Platinum</span>
      </div>
    </div>
  );
}
