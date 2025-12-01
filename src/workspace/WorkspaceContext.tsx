import { createContext, useContext } from 'react';
import type { ApiWorkspaceMeta, ApiUser } from '../lib/api';

export type WorkspaceContextValue = {
  user: ApiUser | null;
  workspaces: ApiWorkspaceMeta[];
  activeWorkspace: ApiWorkspaceMeta | null;
  loading: boolean;
  selectWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  logout: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = WorkspaceContext.Provider;

export const useWorkspaceContext = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('WorkspaceContext is not available');
  }
  return ctx;
};
