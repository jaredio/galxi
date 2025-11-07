
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';

import { CloseIcon, EditIcon, TrashIcon } from './icons';

import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { getNodeIcon } from '../constants/nodeIcons';
import type { NodeType } from '../types/graph';

export type NodeFormMode = 'create' | 'edit';

export type NodeFormValues = {
  label: string;
  type: NodeType;
  group: string;
};

export type NodeConnection = {
  key: string;
  direction: 'incoming' | 'outgoing';
  peerLabel: string;
  relation: string;
};

type NodeEditorPanelProps = {
  mode: NodeFormMode;
  values: NodeFormValues;
  nodeType: NodeType;
  onLabelChange: (value: string) => void;
  onTypeChange: (value: NodeType) => void;
  placementLabel: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteNode: () => void;
  nodeTypeOptions: Array<{ value: NodeType; label: string }>;
  connections: NodeConnection[];
  onConnectionRelationChange: (key: string, relation: string) => void;
  onConnectionRemove: (key: string) => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onMove: (position: { x: number; y: number }) => void;
  onResize: (geometry: { x: number; y: number; width: number; height: number }) => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
};

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

export const NodeEditorPanel = ({
  mode,
  values,
  nodeType,
  onLabelChange,
  onTypeChange,
  placementLabel,
  onClose,
  onSubmit,
  onDeleteNode,
  nodeTypeOptions,
  connections,
  onConnectionRelationChange,
  onConnectionRemove,
  position,
  size,
  onMove,
  onResize,
  onToggleExpand,
  isExpanded,
}: NodeEditorPanelProps) => {
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'connections'>('info');

  const stopTrackingPointer = useCallback(() => {
    if (pointerCleanupRef.current) {
      pointerCleanupRef.current();
      pointerCleanupRef.current = null;
    }
  }, []);

  const trackPointer = useCallback(
    (pointerId: number, onPointerMove: (event: PointerEvent) => void, onPointerUp?: () => void) => {
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
        onPointerUp?.();
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
  useEffect(() => {
    setActiveTab('info');
  }, [mode, nodeType]);

  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.detail > 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { clientX, clientY, pointerId } = event;
    const baseX = position.x;
    const baseY = position.y;
    trackPointer(
      pointerId,
      (moveEvent) => {
        const deltaX = moveEvent.clientX - clientX;
        const deltaY = moveEvent.clientY - clientY;
        onMove({
          x: baseX + deltaX,
          y: baseY + deltaY,
        });
      },
      undefined
    );
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

  const incomingConnections = useMemo(
    () => connections.filter((connection) => connection.direction === 'incoming'),
    [connections]
  );
  const outgoingConnections = useMemo(
    () => connections.filter((connection) => connection.direction === 'outgoing'),
    [connections]
  );
  const nodeIcon = useMemo(() => getNodeIcon(nodeType), [nodeType]);
  const nodeTypeLabel = useMemo(() => nodeTypeLabelMap[nodeType] ?? nodeType, [nodeType]);
  const totalConnections = connections.length;
  const connectionsTabDisabled = mode === 'create';

  return (
    <aside
      className={`node-editor${mode === 'create' ? ' is-create' : ''}${isExpanded ? ' is-expanded' : ''}`}
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
            <img src={nodeIcon} alt="" />
          </span>
          <div className="node-editor-title-text">
            <h2>{values.label || 'Untitled Node'}</h2>
            <span className="node-editor-eyebrow">
              {mode === 'create' ? 'Create node' : nodeTypeLabel}
            </span>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close node editor">
          <CloseIcon />
        </button>
      </header>

      <form className="node-editor-form" onSubmit={onSubmit}>
        <div className="node-editor-tabs" role="tablist">
          <button
            type="button"
            className={`node-editor-tab${activeTab === 'info' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'info'}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            type="button"
            className={`node-editor-tab${activeTab === 'connections' ? ' active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'connections'}
            onClick={() => setActiveTab('connections')}
            disabled={connectionsTabDisabled}
          >
            Connections
            <span className="node-editor-tab-count">{totalConnections}</span>
          </button>
        </div>

        <div className="node-editor-body">
          {activeTab === 'info' && (
            <div className="node-editor-section-stack">
              <div className="node-editor-section-header">
                <span>Node Details</span>
                <EditIcon className="node-editor-section-icon" />
              </div>
              <section className="node-editor-section">
                <label>
                  <span>Label</span>
                  <input
                    value={values.label}
                    onChange={(event) => onLabelChange(event.target.value)}
                    placeholder="Enter node name"
                    autoFocus={mode === 'create'}
                  />
                </label>
                <label>
                  <span>Type</span>
                  <select value={values.type} onChange={(event) => onTypeChange(event.target.value as NodeType)}>
                    {nodeTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Placement</span>
                  <p className="node-editor-placement-value">
                    {mode === 'create' ? 'Auto-assigned when placed on canvas' : placementLabel}
                  </p>
                </label>
              </section>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="node-editor-connections">
              <div className="node-editor-section-header">
                <span>Connections</span>
                <EditIcon className="node-editor-section-icon" />
              </div>
              {mode !== 'edit' ? (
                <p className="node-editor-empty">Connections will appear after the node is created.</p>
              ) : incomingConnections.length === 0 && outgoingConnections.length === 0 ? (
                <p className="node-editor-empty">No connections yet.</p>
              ) : (
                <>
                  {outgoingConnections.length > 0 && (
                    <div className="connection-group">
                      <span className="connection-group-label">Outgoing</span>
                      {outgoingConnections.map((connection) => (
                        <div key={connection.key} className="connection-item">
                          <div className="connection-details">
                            <span className="connection-peer">{connection.peerLabel}</span>
                            <input
                              value={connection.relation}
                              onChange={(event) =>
                                onConnectionRelationChange(connection.key, event.target.value)
                              }
                              placeholder="Describe relation"
                            />
                          </div>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => onConnectionRemove(connection.key)}
                            aria-label="Remove connection"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {incomingConnections.length > 0 && (
                    <div className="connection-group">
                      <span className="connection-group-label">Incoming</span>
                      {incomingConnections.map((connection) => (
                        <div key={connection.key} className="connection-item">
                          <div className="connection-details">
                            <span className="connection-peer">{connection.peerLabel}</span>
                            <input
                              value={connection.relation}
                              onChange={(event) =>
                                onConnectionRelationChange(connection.key, event.target.value)
                              }
                              placeholder="Describe relation"
                            />
                          </div>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => onConnectionRemove(connection.key)}
                            aria-label="Remove connection"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <footer className="node-editor-footer">
          <div className="node-editor-footer-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent">
              {mode === 'create' ? 'Create Node' : 'Save Changes'}
            </button>
          </div>
          {mode === 'edit' && (
            <button type="button" className="danger-link" onClick={onDeleteNode}>
              <TrashIcon /> Delete node
            </button>
          )}
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
