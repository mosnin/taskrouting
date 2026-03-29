"use client";

import { createContext, useContext } from "react";

export interface WorkspaceContextValue {
  workspaceId: string;
  userId: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null
);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
