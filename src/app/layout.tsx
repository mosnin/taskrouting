import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskRouting - Multi-Agent Control Plane",
  description:
    "Orchestrate, route, and monitor tasks across AI agents with full observability and human-in-the-loop controls.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased bg-gradient-to-br from-slate-50/50 via-white to-violet-50/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
