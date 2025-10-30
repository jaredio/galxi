import type { TabId } from '../constants/tabs';
import { tabs } from '../constants/tabs';

const brandLogo = new URL('../../icons/galxi_green (2).png', import.meta.url).href;

type TopbarProps = {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
};

export const Topbar = ({ activeTab, onSelectTab }: TopbarProps) => (
  <header className="topbar">
    <div className="topbar-inner">
      <div className="left-cluster">
        <div className="brand">
          <img src={brandLogo} alt="Galxi logo" className="brand-logo" />
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
