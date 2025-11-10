import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';

import { CloseIcon, LinkIcon, TrashIcon } from './icons';

import { getGroupIcon } from '../constants/groupIcons';
import { getNodeIcon } from '../constants/nodeIcons';
import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { groupTypeLabelMap } from '../constants/groupLabels';
import type { GroupType, NodeType } from '../types/graph';

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

type ConnectionEndpoint =
  | {
      kind: 'node';
      id: string;
      label: string;
      type: NodeType;
    }
  | {
      kind: 'group';
      id: string;
      label: string;
      type: GroupType;
    };

type ConnectionEditorPanelProps = {
  relation: string;
  onRelationChange: (relation: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onDelete: () => void;
  sourceEndpoint: ConnectionEndpoint | null;
  targetEndpoint: ConnectionEndpoint | null;
  onOpenSourceEndpoint?: () => void;
  onOpenTargetEndpoint?: () => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onMove: (position: { x: number; y: number }) => void;
  onResize: (geometry: { x: number; y: number; width: number; height: number }) => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
};

export const ConnectionEditorPanel = ({
  relation,
  onRelationChange,
  onSubmit,
  onClose,
  onDelete,
  sourceEndpoint,
  targetEndpoint,
  onOpenSourceEndpoint,
  onOpenTargetEndpoint,
  position,
  size,
  onMove,
  onResize,
  onToggleExpand,
  isExpanded,
}: ConnectionEditorPanelProps) => {
  const pointerCleanupRef = useRef<(() => void) | null>(null);

  const stopTrackingPointer = useCallback(() => {
    if (pointerCleanupRef.current) {
      pointerCleanupRef.current();
      pointerCleanupRef.current = null;
    }
  }, []);

  const trackPointer = useCallback(
    (pointerId: number, onPointerMove: (event: PointerEvent) => void) => {
      stopTrackingPointer();
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
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        pointerCleanupRef.current = null;
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      pointerCleanupRef.current = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
    },
    [stopTrackingPointer]
  );

  useEffect(() => stopTrackingPointer, [stopTrackingPointer]);

  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.detail > 1) {
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
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLSpanElement>, handle: ResizeHandle) => {
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
  };

  const sourceIcon = useMemo(() => {
    if (!sourceEndpoint) {
      return null;
    }
    return sourceEndpoint.kind === 'node'
      ? getNodeIcon(sourceEndpoint.type)
      : getGroupIcon(sourceEndpoint.type);
  }, [sourceEndpoint]);
  const targetIcon = useMemo(() => {
    if (!targetEndpoint) {
      return null;
    }
    return targetEndpoint.kind === 'node'
      ? getNodeIcon(targetEndpoint.type)
      : getGroupIcon(targetEndpoint.type);
  }, [targetEndpoint]);
  const sourceTypeLabel = useMemo(() => {
    if (!sourceEndpoint) {
      return 'Unknown';
    }
    if (sourceEndpoint.kind === 'node') {
      return nodeTypeLabelMap[sourceEndpoint.type] ?? sourceEndpoint.type;
    }
    return groupTypeLabelMap[sourceEndpoint.type] ?? sourceEndpoint.type;
  }, [sourceEndpoint]);
  const targetTypeLabel = useMemo(() => {
    if (!targetEndpoint) {
      return 'Unknown';
    }
    if (targetEndpoint.kind === 'node') {
      return nodeTypeLabelMap[targetEndpoint.type] ?? targetEndpoint.type;
    }
    return groupTypeLabelMap[targetEndpoint.type] ?? targetEndpoint.type;
  }, [targetEndpoint]);
  const resolveDisplayLabel = useCallback((endpoint: ConnectionEndpoint | null) => {
    if (!endpoint) {
      return 'Unknown';
    }
    return endpoint.label || endpoint.id || 'Unknown';
  }, []);
  const sourceDisplayLabel = resolveDisplayLabel(sourceEndpoint);
  const targetDisplayLabel = resolveDisplayLabel(targetEndpoint);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <aside
      className={`node-editor connection-editor${isExpanded ? ' is-expanded' : ''}`}
      role="dialog"
      aria-modal="false"
      tabIndex={-1}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      <header
        className="node-editor-header"
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onToggleExpand();
        }}
      >
        <div className="node-editor-title">
          <span className="node-editor-icon">
            <LinkIcon />
          </span>
          <div className="node-editor-title-text">
            <h2>Connection</h2>
            <span className="node-editor-eyebrow">
              {sourceDisplayLabel} {'->'} {targetDisplayLabel}
            </span>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close connection editor">
          <CloseIcon />
        </button>
      </header>

      <form className="node-editor-form" onSubmit={handleSubmit}>
        <div className="node-editor-body connection-editor-body">
          <div className="connection-editor-route">
            <button
              type="button"
              className="connection-node-chip"
              onClick={onOpenSourceEndpoint}
              disabled={!onOpenSourceEndpoint}
            >
              {sourceIcon ? <img src={sourceIcon} alt="" /> : <span className="connection-node-initial">?</span>}
              <span className="connection-node-text">
                <strong>{sourceDisplayLabel}</strong>
                <small>{sourceTypeLabel}</small>
              </span>
            </button>
            <span className="connection-route-arrow" aria-hidden="true">
              {'->'}
            </span>
            <button
              type="button"
              className="connection-node-chip"
              onClick={onOpenTargetEndpoint}
              disabled={!onOpenTargetEndpoint}
            >
              {targetIcon ? <img src={targetIcon} alt="" /> : <span className="connection-node-initial">?</span>}
              <span className="connection-node-text">
                <strong>{targetDisplayLabel}</strong>
                <small>{targetTypeLabel}</small>
              </span>
            </button>
          </div>

          <div className="node-editor-section-stack">
            <div className="node-editor-section-header">
              <span>Connection Details</span>
            </div>
            <section className="node-editor-section">
              <label>
                <span>Relation</span>
                <input
                  value={relation}
                  onChange={(event) => onRelationChange(event.target.value)}
                  placeholder="Describe relation"
                  autoFocus
                  maxLength={50}
                />
              </label>
            </section>
          </div>

          <div className="connection-editor-metadata">
            <div>
              <span className="connection-editor-meta-label">Source ID</span>
              <span className="connection-editor-meta-value">{sourceEndpoint?.id ?? 'Unknown'}</span>
            </div>
            <div>
              <span className="connection-editor-meta-label">Target ID</span>
              <span className="connection-editor-meta-value">{targetEndpoint?.id ?? 'Unknown'}</span>
            </div>
          </div>
        </div>

        <footer className="node-editor-footer">
          <div className="node-editor-footer-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent">
              Save Changes
            </button>
          </div>
          <button type="button" className="danger-link" onClick={onDelete}>
            <TrashIcon /> Delete connection
          </button>
        </footer>
      </form>

      {resizeHandles.map((handle) => (
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
