import { useEffect, useMemo, useRef } from 'react';
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

export const ContextMenu = ({ x, y, items, onRequestClose }: ContextMenuProps) => {
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusItem = (index: number) => {
    const buttons = buttonRefs.current.filter(Boolean);
    if (buttons.length === 0) {
      return;
    }
    const nextIndex = (index + buttons.length) % buttons.length;
    buttons[nextIndex]?.focus();
  };

  const handlers = useMemo(
    () => ({
      handleKeyDown: (event: KeyboardEvent) => {
        const buttons = buttonRefs.current.filter(Boolean);
        if (buttons.length === 0) {
          return;
        }
        const currentIndex = buttons.findIndex((btn) => btn === document.activeElement);
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            focusItem((currentIndex + 1) % buttons.length);
            break;
          case 'ArrowUp':
            event.preventDefault();
            focusItem(currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1);
            break;
          case 'Home':
            event.preventDefault();
            focusItem(0);
            break;
          case 'End':
            event.preventDefault();
            focusItem(buttons.length - 1);
            break;
          case 'Escape':
            event.preventDefault();
            onRequestClose();
            break;
          default:
            break;
        }
      },
    }),
    [onRequestClose]
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const buttons = list.querySelectorAll<HTMLButtonElement>('button.context-menu-item');
    buttons[0]?.focus();
    const handler = handlers.handleKeyDown;
    list.addEventListener('keydown', handler);
    return () => list.removeEventListener('keydown', handler);
  }, [handlers, items]);

  buttonRefs.current = [];

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
    >
      <ul className="context-menu-list" role="menu" ref={listRef}>
        {items.map((item, index) => (
          <li key={item.id} role="none">
            <button
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
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
};
