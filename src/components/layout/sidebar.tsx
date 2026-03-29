"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  Inbox,
  Bot,
  Brain,
  Plug,
  ScrollText,
  CheckCircle2,
  LogOut,
  ChevronsUpDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Queues", href: "/queues", icon: Inbox },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Memory", href: "/memory", icon: Brain },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Audit Log", href: "/audit", icon: ScrollText },
  { name: "Approvals", href: "/approvals", icon: CheckCircle2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/[0.08] bg-[hsl(240,10%,5.5%)] text-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.08] px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          TaskRouting
        </span>
      </div>

      {/* Workspace selector */}
      <div className="border-b border-white/[0.08] px-3 py-3">
        <button className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
              W
            </div>
            <span className="text-xs font-medium text-zinc-300">
              Workspace
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/[0.1] text-white"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active
                        ? "text-white"
                        : "text-zinc-500 group-hover:text-zinc-400"
                    )}
                  />
                  {item.name}
                  {active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User menu */}
      <div className="border-t border-white/[0.08] px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-semibold text-white">
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-[13px] font-medium text-zinc-200">
              {session?.user?.name ?? "User"}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {session?.user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
