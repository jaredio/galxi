import type { FC } from 'react';

import { LinkIcon, NetworkIcon, PaletteIcon, PlusCircleIcon, SettingsIcon } from './icons';

type GroupType = 'virtualNetwork' | 'subnet' | 'logicalGroup';

type GalxiSidebarProps = {
  onCreateNode: () => void;
  onCreateGroup: (type: GroupType) => void;
  onStartConnection: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
};

const groupOptions: Array<{ id: GroupType; label: string }> = [
  { id: 'virtualNetwork', label: 'Virtual Network' },
  { id: 'subnet', label: 'Subnet' },
  { id: 'logicalGroup', label: 'Logical Grouping' },
];

const brandLogo = new URL('../../icons/galxi_green (2).png', import.meta.url).href;

export const GalxiSidebar: FC<GalxiSidebarProps> = ({
  onCreateNode,
  onCreateGroup,
  onStartConnection,
  onOpenTheme,
  onOpenSettings,
}) => (
  <aside className="galxi-sidebar" aria-label="Canvas create and utility controls">
    <div className="galxi-sidebar__section">
      <div className="galxi-sidebar__section-heading">
        <img
          src={brandLogo}
          alt=""
          aria-hidden="true"
          className="galxi-sidebar__section-logo"
        />
        <p className="galxi-sidebar__section-title">Create</p>
      </div>

      <button type="button" className="galxi-sidebar__command" onClick={onCreateNode}>
        <PlusCircleIcon className="galxi-sidebar__icon" />
        <span className="galxi-sidebar__label">Node</span>
      </button>

      <button type="button" className="galxi-sidebar__command" onClick={onStartConnection}>
        <LinkIcon className="galxi-sidebar__icon" />
        <span className="galxi-sidebar__label">Connection</span>
      </button>

      <div className="galxi-sidebar__group">
        <button
          type="button"
          className="galxi-sidebar__command galxi-sidebar__command--group"
          onClick={() => onCreateGroup('virtualNetwork')}
        >
          <NetworkIcon className="galxi-sidebar__icon" />
          <span className="galxi-sidebar__label">Group</span>
        </button>

        <div className="galxi-sidebar__submenu" role="menu">
          {groupOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="galxi-sidebar__submenu-item"
              onClick={() => onCreateGroup(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="galxi-sidebar__section">
      <div className="galxi-sidebar__section-heading">
        <p className="galxi-sidebar__section-title">Utilities</p>
      </div>

      <button type="button" className="galxi-sidebar__command" onClick={onOpenTheme}>
        <PaletteIcon className="galxi-sidebar__icon" />
        <span className="galxi-sidebar__label">Theme</span>
      </button>

      <button type="button" className="galxi-sidebar__command" onClick={onOpenSettings}>
        <SettingsIcon className="galxi-sidebar__icon" />
        <span className="galxi-sidebar__label">Settings</span>
      </button>
    </div>
  </aside>
);
