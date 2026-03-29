import { cn } from "@/lib/utils";

interface CapabilityBadgeProps {
  capability: string;
  className?: string;
}

export function CapabilityBadge({ capability, className }: CapabilityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200",
        className
      )}
    >
      {capability}
    </span>
  );
}
