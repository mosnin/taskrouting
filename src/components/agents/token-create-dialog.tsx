"use client";

import * as React from "react";
import { Copy, AlertTriangle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentToken } from "@/actions/agent";

const AVAILABLE_SCOPES = [
  "queues:read",
  "tasks:read",
  "tasks:write",
  "tasks:claim",
  "artifacts:write",
  "memory:read",
  "memory:write",
  "approvals:write",
  "*",
] as const;

interface TokenCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  workspaceId: string;
}

export function TokenCreateDialog({
  open,
  onOpenChange,
  agentId,
  workspaceId,
}: TokenCreateDialogProps) {
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState<string[]>([]);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [rawToken, setRawToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function toggleScope(scope: string) {
    if (scope === "*") {
      setScopes((prev) => (prev.includes("*") ? [] : ["*"]));
      return;
    }
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev.filter((s) => s !== "*"), scope]
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Token name is required");
      return;
    }
    if (scopes.length === 0) {
      setError("Select at least one scope");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await createAgentToken({
        agentId,
        name: name.trim(),
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        workspaceId,
      });
      setRawToken(result.rawToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!rawToken) return;
    await navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose(value: boolean) {
    if (!value) {
      setName("");
      setScopes([]);
      setExpiresAt("");
      setRawToken(null);
      setCopied(false);
      setError(null);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {rawToken ? "Token Created" : "Create Token"}
          </DialogTitle>
          <DialogDescription>
            {rawToken
              ? "Copy this token now. It will not be shown again."
              : "Create an API token for this agent."}
          </DialogDescription>
        </DialogHeader>

        {rawToken ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Copy this token now. It will not be shown again.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-sm text-zinc-900">
                  {rawToken}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Name</Label>
              <Input
                id="token-name"
                placeholder="e.g. CI Pipeline Token"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={
                        scopes.includes(scope) ||
                        (scope !== "*" && scopes.includes("*"))
                      }
                      onChange={() => toggleScope(scope)}
                      disabled={scope !== "*" && scopes.includes("*")}
                      className="rounded border-input"
                    />
                    <span className={scope === "*" ? "font-semibold" : ""}>
                      {scope === "*" ? "All scopes" : scope}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-expires">
                Expiration <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="token-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Token"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
