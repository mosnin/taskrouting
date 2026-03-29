"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Inbox,
  Bot,
  Brain,
  Plug,
  ScrollText,
  ShieldCheck,
  Plus,
  ArrowRight,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  section: string;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Register Cmd+K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  const items: CommandItem[] = [
    // Navigation
    { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: () => navigate("/"), section: "Navigation", keywords: ["home", "overview"] },
    { id: "nav-projects", label: "Go to Projects", icon: FolderKanban, action: () => navigate("/projects"), section: "Navigation", keywords: ["project", "task"] },
    { id: "nav-queues", label: "Go to Queues", icon: Inbox, action: () => navigate("/queues"), section: "Navigation", keywords: ["queue", "routing"] },
    { id: "nav-agents", label: "Go to Agents", icon: Bot, action: () => navigate("/agents"), section: "Navigation", keywords: ["agent", "bot"] },
    { id: "nav-memory", label: "Go to Memory", icon: Brain, action: () => navigate("/memory"), section: "Navigation", keywords: ["memory", "knowledge"] },
    { id: "nav-integrations", label: "Go to Integrations", icon: Plug, action: () => navigate("/integrations"), section: "Navigation", keywords: ["integration", "connect"] },
    { id: "nav-audit", label: "Go to Audit Log", icon: ScrollText, action: () => navigate("/audit"), section: "Navigation", keywords: ["audit", "log", "history"] },
    { id: "nav-approvals", label: "Go to Approvals", icon: ShieldCheck, action: () => navigate("/approvals"), section: "Navigation", keywords: ["approval", "review"] },
    // Actions
    { id: "act-new-project", label: "Create New Project", description: "Start a new project", icon: Plus, action: () => navigate("/projects?action=new"), section: "Actions", keywords: ["new", "create", "project"] },
    { id: "act-new-agent", label: "Register New Agent", description: "Add an AI agent", icon: Plus, action: () => navigate("/agents?action=new"), section: "Actions", keywords: ["new", "register", "agent"] },
    { id: "act-new-queue", label: "Create New Queue", description: "Add a task queue", icon: Plus, action: () => navigate("/queues?action=new"), section: "Actions", keywords: ["new", "create", "queue"] },
  ];

  // Filter items based on query
  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.includes(q))
        );
      })
    : items;

  // Group by section
  const sections = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(sections).flat();

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatFiltered[selectedIndex]?.action();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Reset selection when query changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  let currentIndex = 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-[560px] rounded-2xl overflow-hidden border shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(sections).map(([section, sectionItems]) => (
              <div key={section}>
                <div className="px-2 py-1.5 text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                  {section}
                </div>
                {sectionItems.map((item) => {
                  const itemIndex = currentIndex++;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
                        selectedIndex === itemIndex
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground/80 hover:bg-accent/50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-60" />
                      <div className="flex-1 text-left">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <span className="ml-2 text-muted-foreground text-xs">{item.description}</span>
                        )}
                      </div>
                      <ArrowRight className={cn(
                        "h-3 w-3 opacity-0 transition-opacity",
                        selectedIndex === itemIndex && "opacity-40"
                      )} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
