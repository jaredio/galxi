import { saveGraph, type GraphData } from '../lib/persistence';
import { saveThemeForWorkspace } from '../lib/themePersistence';

export type WorkspaceMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
};

const WORKSPACES_KEY = 'galxi-workspaces';
const LAST_WORKSPACE_KEY = 'galxi-last-workspace';

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(fallback) && Array.isArray(parsed)) {
      return parsed as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

const randomId = () =>
  typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const loadWorkspaces = (): WorkspaceMeta[] => readJson<WorkspaceMeta[]>(WORKSPACES_KEY, []);

export const saveWorkspaces = (workspaces: WorkspaceMeta[]) =>
  writeJson(WORKSPACES_KEY, workspaces);

export const getLastWorkspaceId = (): string | null => {
  try {
    return localStorage.getItem(LAST_WORKSPACE_KEY);
  } catch {
    return null;
  }
};

export const setLastWorkspaceId = (id: string) => writeJson(LAST_WORKSPACE_KEY, id);

export const createWorkspace = (name: string): WorkspaceMeta => {
  const now = new Date().toISOString();
  const workspace: WorkspaceMeta = {
    id: randomId(),
    name,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
  const workspaces = loadWorkspaces();
  workspaces.push(workspace);
  saveWorkspaces(workspaces);
  setLastWorkspaceId(workspace.id);
  return workspace;
};

export const updateWorkspaceMeta = (id: string, updater: (meta: WorkspaceMeta) => WorkspaceMeta) => {
  const workspaces = loadWorkspaces();
  const next = workspaces.map((ws) => (ws.id === id ? updater(ws) : ws));
  saveWorkspaces(next);
};

export const persistImportedGraph = (workspaceId: string, data: GraphData) => {
  saveGraph(
    {
      nodes: data.nodes,
      links: data.links,
      groups: data.groups,
      groupLinks: data.groupLinks,
      nodePositions: data.nodePositions,
      groupPositions: data.groupPositions,
      theme: data.theme,
    },
    workspaceId
  );
  if (data.theme) {
    saveThemeForWorkspace(data.theme, workspaceId);
  }
};
