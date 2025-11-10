import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

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

export const GalxiSidebar = ({
  onCreateNode,
  onCreateGroup,
  onStartConnection,
  onOpenTheme,
  onOpenSettings,
}: GalxiSidebarProps) => {
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupWrapperRef = useRef<HTMLDivElement | null>(null);
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);
  const submenuRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupWrapperRef.current?.contains(event.target as Node)) {
        return;
      }
      setGroupMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (groupMenuOpen) {
      submenuRefs.current[0]?.focus();
    }
  }, [groupMenuOpen]);

  const handleGroupMenuToggle = useCallback(() => {
    setGroupMenuOpen((prev) => !prev);
  }, []);

  const handleGroupButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setGroupMenuOpen(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setGroupMenuOpen(false);
      }
    },
    []
  );

  const handleSubmenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = (index + 1) % submenuRefs.current.length;
        submenuRefs.current[next]?.focus();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = index - 1 < 0 ? submenuRefs.current.length - 1 : index - 1;
        submenuRefs.current[prev]?.focus();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setGroupMenuOpen(false);
        groupButtonRef.current?.focus();
      }
    },
    []
  );

  const handleGroupCreate = useCallback(
    (type: GroupType) => {
      onCreateGroup(type);
      setGroupMenuOpen(false);
    },
    [onCreateGroup]
  );

  submenuRefs.current = [];

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

      <div
        className={`galxi-sidebar__group${groupMenuOpen ? ' galxi-sidebar__group--open' : ''}`}
        ref={groupWrapperRef}
      >
        <button
          type="button"
          className="galxi-sidebar__command galxi-sidebar__command--group"
          aria-haspopup="menu"
          aria-expanded={groupMenuOpen}
          aria-controls="galxi-group-menu"
          onClick={handleGroupMenuToggle}
          onKeyDown={handleGroupButtonKeyDown}
          ref={groupButtonRef}
        >
          <NetworkIcon className="galxi-sidebar__icon" />
          <span className="galxi-sidebar__label">Group</span>
        </button>

        <div
          className="galxi-sidebar__submenu"
          role="menu"
          id="galxi-group-menu"
          aria-hidden={!groupMenuOpen}
        >
          {groupOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className="galxi-sidebar__submenu-item"
              role="menuitem"
              ref={(element) => {
                submenuRefs.current[index] = element;
              }}
              onClick={() => handleGroupCreate(option.id)}
              onKeyDown={(event) => handleSubmenuKeyDown(event, index)}
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
};
