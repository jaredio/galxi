import type { TabId } from '../constants/tabs';
import { tabs } from '../constants/tabs';

type TopbarProps = {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
};

export const Topbar = ({ activeTab, onSelectTab }: TopbarProps) => (
  <header className="topbar">
    <div className="topbar-inner">
      <div className="left-cluster">
        <div className="brand">
          <span className="brand-icon" />
          <span className="brand-name">galxi</span>
        </div>
        <nav className="nav-controls" aria-label="Primary">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button${tab.id === activeTab ? ' active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="action-group">
        <button type="button" className="action-button" disabled title="Sync coming soon">
          Sync
        </button>
        <button type="button" className="action-button primary" disabled title="Share coming soon">
          Share
        </button>
      </div>
    </div>
  </header>
);
