import type { ReactNode } from 'react';

type ContextMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onRequestClose: () => void;
};

export const ContextMenu = ({ x, y, items, onRequestClose }: ContextMenuProps) => (
  <div
    className="context-menu"
    style={{ left: x, top: y }}
    onClick={(event) => event.stopPropagation()}
    onContextMenu={(event) => {
      event.preventDefault();
      onRequestClose();
    }}
  >
    <ul className="context-menu-list" role="menu">
      {items.map((item) => (
        <li key={item.id} role="none">
          <button
            type="button"
            className={`context-menu-item${item.tone === 'danger' ? ' danger' : ''}`}
            role="menuitem"
            onClick={() => {
              item.onSelect();
              onRequestClose();
            }}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);
