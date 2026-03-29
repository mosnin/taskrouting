"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ToastProvider } from "@/components/ui/toast";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={0}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
