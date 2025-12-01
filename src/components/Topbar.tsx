import type { TabId } from '../constants/tabs';
import { tabs } from '../constants/tabs';
import styles from './Topbar.module.css';
import { UserDropdown } from './UserDropdown';
import { WorkspaceDropdown } from './WorkspaceDropdown';
import { useWorkspaceContext } from '../workspace/WorkspaceContext';

const brandLogo = new URL('../../icons/galxi_green.png', import.meta.url).href;

type TopbarProps = {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
};

export const Topbar = ({ activeTab, onSelectTab }: TopbarProps) => {
  const { user, workspaces, activeWorkspace, selectWorkspace, createWorkspace, deleteWorkspace, logout } =
    useWorkspaceContext();

  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img src={brandLogo} alt="Galxi logo" className={styles.brandLogo} />
          <span className={styles.brandName}>galxi</span>
          <nav className={styles.navControls} aria-label="Primary">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tabButton}${isActive ? ` ${styles.tabButtonActive}` : ''}`}
                  onClick={() => onSelectTab(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className={styles.actionGroup}>
          <UserDropdown name={user?.name ?? 'Unknown'} onLogout={logout} />
          <WorkspaceDropdown
            activeWorkspace={activeWorkspace}
            workspaces={workspaces}
            onSelect={selectWorkspace}
            onCreate={createWorkspace}
            onDelete={deleteWorkspace}
          />
        </div>
      </div>
    </header>
  );
};
