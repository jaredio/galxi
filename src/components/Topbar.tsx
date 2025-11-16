import type { TabId } from '../constants/tabs';
import { tabs } from '../constants/tabs';
import styles from './Topbar.module.css';

const brandLogo = new URL('../../icons/galxi_green (2).png', import.meta.url).href;

type TopbarProps = {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
};

export const Topbar = ({ activeTab, onSelectTab }: TopbarProps) => (
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
        <button type="button" className={styles.actionButton} disabled title="Sync coming soon">
          Sync
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          disabled
          title="Share coming soon"
        >
          Share
        </button>
      </div>
    </div>
  </header>
);
