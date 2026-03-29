"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GitBranch, MessageSquare, Triangle, FileSpreadsheet, Cloud, CreditCard, Check, Plug } from "lucide-react";

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    description: string;
    icon: string;
    connected: boolean;
    status?: string;
  };
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const providerIcons: Record<string, React.ElementType> = {
  github: GitBranch,
  slack: MessageSquare,
  linear: Triangle,
  notion: FileSpreadsheet,
  google_drive: Cloud,
  stripe: CreditCard,
};

const providerColors: Record<string, { gradient: string; bg: string }> = {
  github: { gradient: "from-gray-700 to-gray-900", bg: "bg-gray-50" },
  slack: { gradient: "from-purple-600 to-pink-600", bg: "bg-purple-50" },
  linear: { gradient: "from-indigo-500 to-violet-600", bg: "bg-indigo-50" },
  notion: { gradient: "from-gray-800 to-black", bg: "bg-gray-50" },
  google_drive: { gradient: "from-blue-500 to-green-500", bg: "bg-blue-50" },
  stripe: { gradient: "from-violet-600 to-indigo-600", bg: "bg-violet-50" },
};

export function ProviderCard({ provider, onConnect, onDisconnect }: ProviderCardProps) {
  const Icon = providerIcons[provider.icon] || Plug;
  const colors = providerColors[provider.icon] || { gradient: "from-gray-500 to-gray-700", bg: "bg-gray-50" };

  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200",
      provider.connected && "border-primary/20"
    )}>
      <div className="flex items-start gap-4 mb-4">
        <div className={cn("rounded-xl bg-gradient-to-br p-3", colors.gradient)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{provider.name}</h3>
            {provider.connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                <Check className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{provider.description}</p>
        </div>
      </div>

      <Button
        variant={provider.connected ? "outline" : "default"}
        size="sm"
        className="w-full"
        onClick={provider.connected ? onDisconnect : onConnect}
      >
        {provider.connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}
