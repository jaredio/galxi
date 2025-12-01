import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { clearUser, loadUser, saveUser } from './userStore';
import type { GraphData } from '../lib/persistence';
import { logger } from '../lib/logger';
import {
  createUser,
  createWorkspaceApi,
  getUser,
  listWorkspaces,
  deleteWorkspaceApi,
  saveWorkspace,
  type ApiWorkspaceMeta,
} from '../lib/api';
import { WorkspaceProvider } from './WorkspaceContext';

type WorkspaceGateProps = {
  children: (workspace: ApiWorkspaceMeta) => ReactNode;
};

const parseGraphFile = async (file: File): Promise<GraphData> => {
  const text = await file.text();
  const parsed = JSON.parse(text) as GraphData;
  if (
    !parsed ||
    !Array.isArray((parsed as GraphData).nodes) ||
    !Array.isArray((parsed as GraphData).links) ||
    typeof parsed.version !== 'number'
  ) {
    throw new Error('File is not a valid Galxi export.');
  }
  return parsed;
};

export const WorkspaceGate = ({ children }: WorkspaceGateProps) => {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<ApiWorkspaceMeta[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<ApiWorkspaceMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const storedUser = loadUser();
      if (!storedUser) {
        return;
      }
      try {
        const backendUser = await getUser(storedUser.id);
        setUser(backendUser);
        const userWorkspaces = await listWorkspaces(backendUser.id);
        setWorkspaces(userWorkspaces);
        if (userWorkspaces.length > 0) {
          setActiveWorkspace(userWorkspaces[0]);
        }
      } catch (err) {
        logger.error('Failed to load user/workspaces', err as Error);
        setUser(null);
        setWorkspaces([]);
      }
    };
    init();
  }, []);

  const sortedWorkspaces = useMemo(() => [...workspaces], [workspaces]);

  const handleSelect = (workspace: ApiWorkspaceMeta) => {
    setError(null);
    setActiveWorkspace(workspace);
  };

  const handleCreate = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const fallback = `Workspace ${workspaces.length === 0 ? 1 : workspaces.length + 1}`;
      const name = newWorkspaceName.trim() || fallback;
      const workspace = await createWorkspaceApi(user.id, name);
      const userWorkspaces = await listWorkspaces(user.id);
      setWorkspaces(userWorkspaces);
      handleSelect(workspace);
      setNewWorkspaceName('');
    } catch (err) {
      logger.error('Failed to create workspace', err as Error);
      setError('Failed to create workspace. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (!file || !user) {
      return;
    }
    try {
      setLoading(true);
      const data = await parseGraphFile(file);
      const workspace = await createWorkspaceApi(user.id, file.name.replace(/\.[^.]+$/, '') || 'Imported Workspace');
      await saveWorkspace(workspace.id, {
        name: workspace.name,
        nodes: data.nodes as any,
        groups: data.groups as any,
        links: data.links as any,
      });
      const userWorkspaces = await listWorkspaces(user.id);
      setWorkspaces(userWorkspaces);
      handleSelect(workspace);
      setError(null);
    } catch (importError) {
      logger.error('Failed to import workspace', importError as Error);
      setError((importError as Error).message || 'Failed to import workspace.');
    } finally {
      event.target.value = '';
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!user) return;
    try {
      setLoading(true);
      await deleteWorkspaceApi(workspaceId);
      const userWorkspaces = await listWorkspaces(user.id);
      setWorkspaces(userWorkspaces);
      if (activeWorkspace?.id === workspaceId) {
        setActiveWorkspace(userWorkspaces[0] ?? null);
      }
    } catch (err) {
      logger.error('Failed to delete workspace', err as Error);
      setError('Failed to delete workspace. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspaces = async () => {
    if (!user) return;
    const list = await listWorkspaces(user.id);
    setWorkspaces(list);
    if (list.length > 0 && !activeWorkspace) {
      setActiveWorkspace(list[0]);
    }
  };

  const logout = () => {
    setUser(null);
    setActiveWorkspace(null);
    setWorkspaces([]);
    clearUser();
  };

  if (!user) {
    return (
      <div className="workspace-gate">
        <div className="workspace-card">
          <div className="workspace-head">
            <p className="workspace-label">Welcome to Galxi</p>
            <h1>Set up your space</h1>
            <p className="workspace-subtitle">Tell us who you are and start with a fresh workspace.</p>
          </div>

          <div className="workspace-inputs">
            <label className="workspace-field-label" htmlFor="userName">
              Your name
            </label>
            <input
              id="userName"
              className="workspace-text-input"
              placeholder="e.g. Alex"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
            <label className="workspace-field-label" htmlFor="workspaceName">
              Workspace name
            </label>
            <input
              id="workspaceName"
              className="workspace-text-input"
              placeholder="e.g. Network Plan"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
          </div>

          <div className="workspace-primary-actions">
            <button
              type="button"
              className="workspace-cta"
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  const userName = newUserName.trim() || 'You';
                  const createdUser = await createUser(userName);
                  saveUser({ id: createdUser.id, name: createdUser.name, createdAt: createdUser.createdAt });
                  setUser(createdUser);
                  await handleCreate();
                } catch (err) {
                  logger.error('Failed to create user', err as Error);
                  setError('Failed to create user. Check connection.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue
            </button>
          </div>
          {error && <p className="workspace-error">{error}</p>}
        </div>
      </div>
    );
  }

  if (activeWorkspace) {
    return (
      <WorkspaceProvider
        value={{
          user,
          workspaces,
          activeWorkspace,
          loading,
          selectWorkspace: handleSelect,
          createWorkspace: handleCreate,
          deleteWorkspace: handleDeleteWorkspace,
          refreshWorkspaces,
          logout,
        }}
      >
        {children(activeWorkspace)}
      </WorkspaceProvider>
    );
  }

  return (
    <div className="workspace-gate">
      <div className="workspace-card">
        <div className="workspace-head">
          <p className="workspace-label">Welcome back, {user.name}</p>
          <h1>Map your network</h1>
          <p className="workspace-subtitle">Start fresh or import your project.</p>
        </div>

        <div className="workspace-primary-actions">
          <button type="button" className="workspace-cta" onClick={handleCreate}>
            Create workspace
          </button>
          <button type="button" className="workspace-ghost" onClick={handleImportClick}>
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>

        {sortedWorkspaces.length > 0 && (
          <div className="workspace-list-block">
            <p className="workspace-field-label">Recent workspaces</p>
            <div className="workspace-list">
              {sortedWorkspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  className="workspace-item"
                  onClick={() => handleSelect(workspace)}
                >
                  <div>
                    <p className="workspace-item-name">{workspace.name}</p>
                    <p className="workspace-item-meta">
                      Last opened {new Date(workspace.lastOpenedAt).toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="workspace-error">{error}</p>}
      </div>
    </div>
  );
};
