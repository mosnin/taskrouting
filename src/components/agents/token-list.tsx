"use client";

import * as React from "react";
import { Key, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeAgentToken } from "@/actions/agent";
import { relativeTime, maskToken } from "@/lib/format";

interface Token {
  id: string;
  name: string;
  tokenHash: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  lastUsedAt?: Date | string | null;
  createdAt: Date | string;
}

interface TokenListProps {
  tokens: Token[];
  workspaceId: string;
}

export function TokenList({ tokens, workspaceId }: TokenListProps) {
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  async function handleRevoke(tokenId: string) {
    setRevoking(tokenId);
    try {
      await revokeAgentToken(tokenId, workspaceId);
    } catch {
      // Error handling - could add toast
    } finally {
      setRevoking(null);
      setConfirmId(null);
    }
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Key className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No tokens created yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border">
      {tokens.map((token) => {
        const statusVariant =
          token.status === "ACTIVE"
            ? "default"
            : token.status === "REVOKED"
              ? "destructive"
              : "secondary";

        return (
          <div
            key={token.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{token.name}</span>
                  <Badge variant={statusVariant} className="text-[10px]">
                    {token.status}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    {maskToken(token.tokenHash)}
                  </code>
                  <span className="flex items-center gap-1">
                    {token.scopes.length <= 3
                      ? token.scopes.join(", ")
                      : `${token.scopes.slice(0, 2).join(", ")} +${token.scopes.length - 2}`}
                  </span>
                  {token.lastUsedAt && (
                    <span>Used {relativeTime(token.lastUsedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            {token.status === "ACTIVE" && (
              <div>
                {confirmId === token.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Revoke?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevoke(token.id)}
                      disabled={revoking === token.id}
                    >
                      {revoking === token.id ? "Revoking..." : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmId(token.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
