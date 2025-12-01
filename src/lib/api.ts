const API_BASE = import.meta.env?.VITE_API_BASE ?? 'http://localhost:4000';

type FetchOptions = {
  method?: string;
  body?: unknown;
};

const request = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export type ApiUser = { id: string; name: string; createdAt: string };
export type ApiWorkspaceMeta = { id: string; name: string; createdAt: string; updatedAt: string };

export type ApiNode = {
  id: string;
  type: string;
  label: string;
  x?: number;
  y?: number;
  groupId?: string | null;
  profile?: unknown;
};

export type ApiGroup = {
  id: string;
  type: string;
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  profile?: unknown;
};

export type ApiLink = {
  id: string;
  sourceId: string;
  targetId: string;
  relation?: string | null;
};

export type ApiWorkspacePayload = {
  id: string;
  name: string;
  nodes: ApiNode[];
  groups: ApiGroup[];
  links: ApiLink[];
};

export const createUser = (name: string) => request<ApiUser>('/users', { method: 'POST', body: { name } });
export const getUser = (id: string) => request<ApiUser>(`/users/${id}`);
export const listWorkspaces = (userId: string) =>
  request<ApiWorkspaceMeta[]>(`/users/${userId}/workspaces`);
export const createWorkspaceApi = (userId: string, name: string) =>
  request<ApiWorkspaceMeta>(`/users/${userId}/workspaces`, { method: 'POST', body: { name } });
export const getWorkspace = (workspaceId: string) => request<ApiWorkspacePayload>(`/workspaces/${workspaceId}`);
export const saveWorkspace = (
  workspaceId: string,
  payload: { name?: string; nodes?: ApiNode[]; groups?: ApiGroup[]; links?: ApiLink[] }
) => request<{ ok: true }>(`/workspaces/${workspaceId}`, { method: 'PUT', body: payload });
export const deleteWorkspaceApi = (workspaceId: string) =>
  request<void>(`/workspaces/${workspaceId}`, { method: 'DELETE' });
