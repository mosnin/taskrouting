"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createTask } from "@/actions/task";
import { useWorkspace } from "@/hooks/use-workspace";
import { Loader2 } from "lucide-react";

interface Queue {
  id: string;
  name: string;
}

interface TaskCreateFormProps {
  projectId: string;
  taskSheetId?: string;
  queues: Queue[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskCreateForm({
  projectId,
  taskSheetId,
  queues,
  onSuccess,
  onCancel,
}: TaskCreateFormProps) {
  const { workspaceId } = useWorkspace();
  const formRef = useRef<HTMLFormElement>(null);
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

  function handleSubmit(formData: FormData) {
    formData.set("workspaceId", workspaceId);
    formData.set("projectId", projectId);
    if (taskSheetId) {
      formData.set("taskSheetId", taskSheetId);
    }
    if (capabilities.length > 0) {
      formData.set("requiredCapabilities", JSON.stringify(capabilities));
    }

    startTransition(async () => {
      try {
        await createTask(formData);
        formRef.current?.reset();
        setCapabilities([]);
        onSuccess?.();
      } catch (err) {
        console.error("Failed to create task:", err);
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label
          htmlFor="task-title"
          className="block text-sm font-medium text-foreground"
        >
          Title
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Task title"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="task-description"
          className="block text-sm font-medium text-foreground"
        >
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          rows={3}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Describe the task..."
        />
      </div>

      {/* Priority */}
      <div>
        <label
          htmlFor="task-priority"
          className="block text-sm font-medium text-foreground"
        >
          Priority
        </label>
        <select
          id="task-priority"
          name="priority"
          defaultValue="MEDIUM"
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Queue */}
      <div>
        <label
          htmlFor="task-queue"
          className="block text-sm font-medium text-foreground"
        >
          Queue
        </label>
        <select
          id="task-queue"
          name="queueId"
          defaultValue=""
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">No queue (auto-route)</option>
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
      </div>

      {/* Required Capabilities */}
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
          <Button type="button" variant="outline" size="sm" onClick={addCapability}>
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

      {/* Due Date */}
      <div>
        <label
          htmlFor="task-due-date"
          className="block text-sm font-medium text-foreground"
        >
          Due Date
        </label>
        <input
          id="task-due-date"
          name="dueAt"
          type="date"
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Create Task
        </Button>
      </div>
    </form>
  );
}
