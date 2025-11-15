import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { CloseIcon } from './icons';

type ResizeHandle =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

const resizeHandles: Array<{ key: ResizeHandle; className: string; cursor: string }> = [
  { key: 'top', className: 'node-editor-resize node-editor-resize--top', cursor: 'ns-resize' },
  { key: 'bottom', className: 'node-editor-resize node-editor-resize--bottom', cursor: 'ns-resize' },
  { key: 'left', className: 'node-editor-resize node-editor-resize--left', cursor: 'ew-resize' },
  { key: 'right', className: 'node-editor-resize node-editor-resize--right', cursor: 'ew-resize' },
  { key: 'top-left', className: 'node-editor-resize node-editor-resize--top-left', cursor: 'nwse-resize' },
  { key: 'top-right', className: 'node-editor-resize node-editor-resize--top-right', cursor: 'nesw-resize' },
  {
    key: 'bottom-left',
    className: 'node-editor-resize node-editor-resize--bottom-left',
    cursor: 'nesw-resize',
  },
  {
    key: 'bottom-right',
    className: 'node-editor-resize node-editor-resize--bottom-right',
    cursor: 'nwse-resize',
  },
];

export type FloatingPanelProps = {
  className?: string;
  role?: 'dialog' | 'region';
  tabIndex?: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isExpanded?: boolean;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (geometry: { x: number; y: number; width: number; height: number }) => void;
  onToggleExpand: () => void;
  onClose: () => void;
  headerClassName?: string;
  headerContent: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  showResizeHandles?: boolean;
};

export const FloatingPanel = ({
  className = '',
  role = 'dialog',
  tabIndex = -1,
  position,
  size,
  isExpanded = false,
  onMove,
  onResize,
  onToggleExpand,
  onClose,
  headerClassName = 'node-editor-header',
  headerContent,
  headerActions,
  children,
  showResizeHandles = true,
}: FloatingPanelProps) => {
  const pointerCleanupRef = useRef<(() => void) | null>(null);

  const cleanupPointer = useCallback(() => {
    if (pointerCleanupRef.current) {
      pointerCleanupRef.current();
      pointerCleanupRef.current = null;
    }
  }, []);

  useEffect(() => cleanupPointer, [cleanupPointer]);

  const trackPointer = useCallback(
    (
      pointerId: number,
      onPointerMove: (event: PointerEvent) => void,
      onPointerUp?: () => void
    ) => {
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) {
          return;
        }
        onPointerMove(event);
      };
      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) {
          return;
        }
        cleanupPointer();
        onPointerUp?.();
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      pointerCleanupRef.current = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
    },
    [cleanupPointer]
  );

  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || event.detail > 1) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input, textarea, select')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const { clientX, clientY, pointerId } = event;
      const baseX = position.x;
      const baseY = position.y;
      trackPointer(pointerId, (moveEvent) => {
        const deltaX = moveEvent.clientX - clientX;
        const deltaY = moveEvent.clientY - clientY;
        onMove({
          x: baseX + deltaX,
          y: baseY + deltaY,
        });
      });
    },
    [onMove, position.x, position.y, trackPointer]
  );

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>, handle: ResizeHandle) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const { clientX, clientY, pointerId } = event;
      const base = { x: position.x, y: position.y, width: size.width, height: size.height };
      const hasLeft = handle.includes('left');
      const hasRight = handle.includes('right');
      const hasTop = handle.includes('top');
      const hasBottom = handle.includes('bottom');
      trackPointer(pointerId, (moveEvent) => {
        const deltaX = moveEvent.clientX - clientX;
        const deltaY = moveEvent.clientY - clientY;
        let nextX = base.x;
        let nextY = base.y;
        let nextWidth = base.width;
        let nextHeight = base.height;

        if (hasRight) {
          nextWidth = base.width + deltaX;
        }
        if (hasLeft) {
          nextWidth = base.width - deltaX;
          nextX = base.x + deltaX;
        }
        if (hasBottom) {
          nextHeight = base.height + deltaY;
        }
        if (hasTop) {
          nextHeight = base.height - deltaY;
          nextY = base.y + deltaY;
        }

        onResize({
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
        });
      });
    },
    [onResize, position.x, position.y, size.height, size.width, trackPointer]
  );

  const panelStyle = {
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
  };

  return (
    <aside
      className={`${className}${isExpanded ? ' is-expanded' : ''}`}
      role={role}
      aria-modal={role === 'dialog' ? 'false' : undefined}
      tabIndex={tabIndex}
      style={panelStyle}
    >
      <header
        className={headerClassName}
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onToggleExpand();
        }}
      >
        {headerContent}
        {headerActions}
        <button type="button" className="icon-button icon-button--plain" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </header>

      {children}

      {showResizeHandles &&
        resizeHandles.map((handle) => (
          <span
            key={handle.key}
            className={handle.className}
            style={{ cursor: handle.cursor }}
            onPointerDown={(event) => handleResizePointerDown(event, handle.key)}
          />
        ))}
    </aside>
  );
};
