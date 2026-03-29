"use client";

import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "purple" | "blue" | "green" | "amber" | "red";
}

const colorMap = {
  purple: { bg: "bg-purple-50", icon: "text-purple-600", ring: "ring-purple-100" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", ring: "ring-blue-100" },
  green: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", ring: "ring-amber-100" },
  red: { bg: "bg-red-50", icon: "text-red-600", ring: "ring-red-100" },
};

export function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "purple" }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-xl p-2.5 ring-1", c.bg, c.ring)}>
          <Icon className={cn("h-5 w-5", c.icon)} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className={cn(
            "font-medium",
            trend.value >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
