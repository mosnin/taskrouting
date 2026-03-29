"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FolderKanban,
  Inbox,
  Bot,
  Brain,
  Plug,
  ScrollText,
  ShieldCheck,
  LogOut,
  ChevronsUpDown,
  Zap,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SIDEBAR_COLLAPSED_KEY = "taskrouting-sidebar-collapsed";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "\u2318D" },
    ],
  },
  {
    label: "Work",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban, shortcut: "\u2318P" },
      { name: "Queues", href: "/queues", icon: Inbox, shortcut: "\u2318Q" },
      { name: "Agents", href: "/agents", icon: Bot, shortcut: "\u2318A" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { name: "Memory", href: "/memory", icon: Brain, shortcut: "\u2318M" },
    ],
  },
  {
    label: "Ops",
    items: [
      { name: "Integrations", href: "/integrations", icon: Plug },
      { name: "Audit Log", href: "/audit", icon: ScrollText },
      { name: "Approvals", href: "/approvals", icon: ShieldCheck, badge: 3 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-white/[0.08] text-white transition-all duration-200 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: "linear-gradient(180deg, hsl(230 25% 10%) 0%, hsl(230 25% 6%) 100%)",
      }}
    >
      {/* Brand + Collapse toggle */}
      <div className="flex h-14 items-center border-b border-white/[0.08] px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-sm font-semibold tracking-tight whitespace-nowrap">
            TaskRouting
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-zinc-300",
            collapsed ? "mx-auto mt-0" : "ml-auto"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Workspace selector */}
      <div className="border-b border-white/[0.08] px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-zinc-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-zinc-200",
                collapsed ? "justify-center" : "justify-between"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
                  W
                </div>
                {!collapsed && (
                  <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">
                    Workspace
                  </span>
                )}
              </div>
              {!collapsed && (
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-indigo-600 text-[9px] font-bold text-white">
                W
              </div>
              <span>Workspace</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="h-4 w-4" />
              <span>Create workspace</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4" />
              <span>Workspace settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <div className="mb-1 px-2 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex items-center rounded-lg transition-all duration-200 ease-out",
                        collapsed
                          ? "justify-center px-0 py-2"
                          : "gap-2.5 px-2.5 py-[7px]",
                        active
                          ? "bg-white/[0.1] text-white"
                          : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                      )}
                    >
                      {/* Active left accent bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-violet-500" />
                      )}
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-white"
                            : "text-zinc-500 group-hover:text-zinc-400"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="text-[13px] font-medium whitespace-nowrap">
                            {item.name}
                          </span>
                          {/* Notification badge */}
                          {item.badge !== undefined && (
                            <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500/90 px-1 text-[10px] font-semibold text-white">
                              {item.badge}
                            </span>
                          )}
                          {/* Keyboard shortcut hint */}
                          {item.shortcut && !item.badge && (
                            <span className="ml-auto text-[10px] font-medium text-white/20 transition-colors duration-200 group-hover:text-white/30">
                              {item.shortcut}
                            </span>
                          )}
                        </>
                      )}
                      {/* Badge dot in collapsed mode */}
                      {collapsed && item.badge !== undefined && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-white/[0.08] px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-white/[0.06]",
                collapsed ? "justify-center" : "gap-2.5"
              )}
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName ?? "User"}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-semibold text-white">
                  {userInitial}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate text-[13px] font-medium text-zinc-200">
                    {user?.fullName ?? "User"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded bg-violet-500/20 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-violet-400">
                      Admin
                    </span>
                  </div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.fullName ?? "User"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress ?? ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="text-red-400 focus:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
