"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
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
          {queues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                <Inbox className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                No queues yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a queue to start routing tasks to agents.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Queue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {queues.map((queue) => (
                <QueueCard key={queue.id} queue={queue} />
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
