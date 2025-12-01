import { useState } from 'react';
import styles from './Topbar.module.css';
import type { ApiWorkspaceMeta } from '../lib/api';

type WorkspaceDropdownProps = {
  activeWorkspace: ApiWorkspaceMeta | null;
  workspaces: ApiWorkspaceMeta[];
  onSelect: (id: string) => void;
  onCreate: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
};

export const WorkspaceDropdown = ({ activeWorkspace, workspaces, onSelect, onCreate, onDelete }: WorkspaceDropdownProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.triggerGroup}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        Workspace: {activeWorkspace?.name ?? 'Select'} ▾
      </button>
      {open && (
        <div className={styles.dropdown}>
          {workspaces.length === 0 ? (
            <span className={styles.dropdownItemMuted}>No workspaces yet</span>
          ) : (
            workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  onSelect(ws.id);
                  setOpen(false);
                }}
              >
                {ws.name} {ws.id === activeWorkspace?.id ? '(active)' : ''}
              </button>
            ))
          )}
          <div className={styles.dropdownDivider} />
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={async () => {
              await onCreate();
              setOpen(false);
            }}
          >
            Create new workspace
          </button>
          <button
            type="button"
            className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
            onClick={async () => {
              await onDelete();
              setOpen(false);
            }}
            disabled={!activeWorkspace}
          >
            Delete current workspace
          </button>
        </div>
      )}
    </div>
  );
};
