import { LinkIcon, NetworkIcon, PaletteIcon, PlusCircleIcon, SettingsIcon } from './icons';

type GroupType = 'virtualNetwork' | 'subnet' | 'logicalGroup';

type GalxiSidebarProps = {
  onCreateNode: () => void;
  onCreateGroup: (type: GroupType) => void;
  onStartConnection: () => void;
  onOpenTheme: () => void;
  onOpenSettings: () => void;
};

const brandLogo = new URL('../../icons/galxi_green (2).png', import.meta.url).href;

export const GalxiSidebar = ({
  onCreateNode,
  onCreateGroup,
  onStartConnection,
  onOpenTheme,
  onOpenSettings,
}: GalxiSidebarProps) => {
  return (
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

        <button
          type="button"
          className="galxi-sidebar__command"
          onClick={() => onCreateGroup('logicalGroup')}
        >
          <NetworkIcon className="galxi-sidebar__icon" />
          <span className="galxi-sidebar__label">Group</span>
        </button>
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
};
