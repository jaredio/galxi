import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  createWorkspace,
  getLastWorkspaceId,
  loadWorkspaces,
  persistImportedGraph,
  setLastWorkspaceId,
  updateWorkspaceMeta,
  type WorkspaceMeta,
} from './workspaceStore';
import type { GraphData } from '../lib/persistence';
import { logger } from '../lib/logger';

type WorkspaceGateProps = {
  children: (workspace: WorkspaceMeta) => ReactNode;
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
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const existing = loadWorkspaces();
    setWorkspaces(existing);
    const lastId = getLastWorkspaceId();
    const match = existing.find((ws) => ws.id === lastId);
    if (match) {
      setActiveWorkspace(match);
    }
  }, []);

  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort(
        (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
      ),
    [workspaces]
  );

  const handleSelect = (workspace: WorkspaceMeta) => {
    setError(null);
    setActiveWorkspace(workspace);
    setLastWorkspaceId(workspace.id);
    updateWorkspaceMeta(workspace.id, (meta) => ({
      ...meta,
      lastOpenedAt: new Date().toISOString(),
    }));
  };

  const handleCreate = () => {
    const name = `Workspace ${workspaces.length === 0 ? 1 : workspaces.length + 1}`;
    const workspace = createWorkspace(name);
    setWorkspaces(loadWorkspaces());
    handleSelect(workspace);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (!file) {
      return;
    }
    try {
      const data = await parseGraphFile(file);
      const workspace = createWorkspace(file.name.replace(/\.[^.]+$/, '') || 'Imported Workspace');
      persistImportedGraph(workspace.id, data);
      setWorkspaces(loadWorkspaces());
      handleSelect(workspace);
      setError(null);
    } catch (importError) {
      logger.error('Failed to import workspace', importError as Error);
      setError((importError as Error).message || 'Failed to import workspace.');
    } finally {
      event.target.value = '';
    }
  };

  if (activeWorkspace) {
    return <>{children(activeWorkspace)}</>;
  }

  return (
    <div className="workspace-gate">
      <div className="workspace-card">
        <div className="workspace-head">
          <p className="workspace-label">Welcome to Galxi</p>
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
