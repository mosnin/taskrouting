"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Plus, Loader2, Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QueueCard } from "@/components/queues/queue-card";
import { WorkspaceContext } from "@/hooks/use-workspace";
import { createQueue } from "@/actions/queue";

interface Queue {
  id: string;
  name: string;
  description?: string | null;
  requiredCapabilities: string[];
  taskCount: number;
}

type SortOption = "name" | "tasks-desc" | "tasks-asc" | "depth";

interface QueuesPageClientProps {
  queues: Queue[];
  workspaceId: string;
  userId: string;
}

export function QueuesPageClient({
  queues,
  workspaceId,
  userId,
}: QueuesPageClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [capsInput, setCapsInput] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  function addCapability() {
    const trimmed = capsInput.trim();
    if (trimmed && !capabilities.includes(trimmed)) {
      setCapabilities((prev) => [...prev, trimmed]);
    }
    setCapsInput("");
  }

  function removeCapability(cap: string) {
    setCapabilities((prev) => prev.filter((c) => c !== cap));
  }

  function handleCreate(formData: FormData) {
    formData.set("workspaceId", workspaceId);
    if (capabilities.length > 0) {
      formData.set("requiredCapabilities", JSON.stringify(capabilities));
    }
    startTransition(async () => {
      try {
        await createQueue(formData);
        setDialogOpen(false);
        setCapabilities([]);
        setCapsInput("");
        router.refresh();
      } catch (err) {
        console.error("Failed to create queue:", err);
      }
    });
  }

  function cycleSortOption() {
    const options: SortOption[] = ["name", "tasks-desc", "tasks-asc", "depth"];
    const currentIndex = options.indexOf(sortBy);
    setSortBy(options[(currentIndex + 1) % options.length]);
  }

  const sortLabel: Record<SortOption, string> = {
    name: "Name",
    "tasks-desc": "Most tasks",
    "tasks-asc": "Fewest tasks",
    depth: "Depth %",
  };

  const filteredQueues = useMemo(() => {
    let result = queues;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (queue) =>
          queue.name.toLowerCase().includes(q) ||
          queue.description?.toLowerCase().includes(q) ||
          queue.requiredCapabilities.some((cap) => cap.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "tasks-desc":
          return b.taskCount - a.taskCount;
        case "tasks-asc":
          return a.taskCount - b.taskCount;
        case "depth": {
          const depthA = a.taskCount / 20;
          const depthB = b.taskCount / 20;
          return depthB - depthA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [queues, searchQuery, sortBy]);

  const totalTasks = queues.reduce((sum, q) => sum + q.taskCount, 0);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      <div>
        <PageHeader
          title="Queues"
          description={`${queues.length} queue${queues.length !== 1 ? "s" : ""} with ${totalTasks} total task${totalTasks !== 1 ? "s" : ""}`}
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New Queue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Queue</DialogTitle>
                  <DialogDescription>
                    Add a new queue to route tasks to agents.
                  </DialogDescription>
                </DialogHeader>
                <form action={handleCreate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="queue-name"
                      className="block text-sm font-medium text-foreground"
                    >
                      Name
                    </label>
                    <input
                      id="queue-name"
                      name="name"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Queue name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="queue-description"
                      className="block text-sm font-medium text-foreground"
                    >
                      Description
                    </label>
                    <textarea
                      id="queue-description"
                      name="description"
                      rows={2}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Describe this queue..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Required Capabilities
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={capsInput}
                        onChange={(e) => setCapsInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCapability();
                          }
                        }}
                        className="block flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="e.g. write_code"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCapability}
                      >
                        Add
                      </Button>
                    </div>
                    {capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {capabilities.map((cap) => (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => removeCapability(cap)}
                            className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200 transition-colors hover:bg-violet-100"
                          >
                            {cap}
                            <span className="ml-1">&times;</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setCapabilities([]);
                        setCapsInput("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      Create Queue
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="px-8 py-6">
          {/* Search and Sort Controls */}
          {queues.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search queues by name, description, or capability..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={cycleSortOption}
                className="shrink-0 gap-1.5"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortLabel[sortBy]}
              </Button>
            </div>
          )}

          {queues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 animate-fade-in">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100">
                <Inbox className="h-7 w-7 text-indigo-500" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                No queues yet
              </h3>
              <p className="mt-1.5 max-w-sm text-center text-sm text-muted-foreground">
                Queues help you organize and route tasks to the right agents based on their capabilities.
              </p>
              <Button
                size="sm"
                className="mt-5"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first queue
              </Button>
            </div>
          ) : filteredQueues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 animate-fade-in">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                No matching queues
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search query.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueues.map((queue, index) => (
                <div
                  key={queue.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                >
                  <QueueCard queue={queue} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
