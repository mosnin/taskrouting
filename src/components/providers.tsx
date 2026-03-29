"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { ToastProvider } from "@/components/ui/toast";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider>
      <TooltipProvider delayDuration={0}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TooltipProvider>
    </ClerkProvider>
  );
}
