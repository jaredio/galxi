
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';

import { CloseIcon, EditIcon, TrashIcon } from './icons';

import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { getNodeIcon } from '../constants/nodeIcons';
import type { NodeType } from '../types/graph';
import type { NodeTypeCategory, NodeTypeOption } from '../constants/nodeOptions';
import { nodeTypeCategoryLabels, nodeTypeCategoryOrder } from '../constants/nodeOptions';
import type { ResourceProfileData } from '../types/profile';

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

type NodeProfileSection = {
  id: string;
  title: string;
  fields: Array<{ id: string; label: string; key: string }>;
};

type NodeEditorPanelProps = {
  mode: NodeFormMode;
  values: NodeFormValues;
  nodeType: NodeType;
  onLabelChange: (value: string) => void;
  onTypeChange: (value: NodeType) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteNode: () => void;
  nodeTypeOptions: NodeTypeOption[];
  profileDraft: ResourceProfileData;
  profileSections: NodeProfileSection[];
  onProfileFieldChange: (fieldKey: string, value: string) => void;
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
  onClose,
  onSubmit,
  onDeleteNode,
  nodeTypeOptions,
  profileDraft,
  profileSections,
  onProfileFieldChange,
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
  const [createStep, setCreateStep] = useState<'basics' | 'details'>('basics');
  const categoryByValue = useMemo(
    () => new Map(nodeTypeOptions.map((option) => [option.value, option.category] as const)),
    [nodeTypeOptions]
  );
  const availableCategories = useMemo(
    () =>
      nodeTypeCategoryOrder.filter((category) =>
        nodeTypeOptions.some((option) => option.category === category)
      ),
    [nodeTypeOptions]
  );
  const resolveCategory = useCallback(
    (type: NodeType): NodeTypeCategory =>
      categoryByValue.get(type) ?? availableCategories[0] ?? nodeTypeCategoryOrder[0],
    [categoryByValue, availableCategories]
  );
  const [typeCategory, setTypeCategory] = useState<NodeTypeCategory>(() => resolveCategory(values.type));

  useEffect(() => {
    const nextCategory = resolveCategory(values.type);
    setTypeCategory(nextCategory);
  }, [values.type, resolveCategory]);

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
  useEffect(() => {
    if (mode === 'create') {
      setCreateStep('basics');
    }
  }, [mode, nodeType]);

  const isCreateFlow = mode === 'create';
  const showDetailsStep = isCreateFlow && createStep === 'details';
  const canProceedToDetails = values.label.trim().length > 0;
  const filteredNodeTypeOptions = useMemo(
    () => nodeTypeOptions.filter((option) => option.category === typeCategory),
    [nodeTypeOptions, typeCategory]
  );

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

type NodeProfileFormProps = {
  sections: NodeProfileSection[];
  values: ResourceProfileData;
  onChange: (fieldKey: string, value: string) => void;
};

const NodeProfileForm = ({ sections, values, onChange }: NodeProfileFormProps) => (
  <div className="node-profile-form">
    {sections.map((section) => (
      <section key={section.id} className="node-profile-section">
        <p className="node-profile-section-title">{section.title}</p>
        <div className="node-profile-field-grid">
          {section.fields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder="Optional"
              />
            </label>
          ))}
        </div>
      </section>
    ))}
  </div>
);

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
              {showDetailsStep ? (
                <>
                  <p className="node-profile-hint">All fields are optional. You can edit them later.</p>
                  <NodeProfileForm sections={profileSections} values={profileDraft} onChange={onProfileFieldChange} />
                </>
              ) : (
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
                  <div className="type-picker">
                    <div className="type-picker-head">
                      <span className="type-picker-label">Type</span>
                      <span className="type-picker-value">{nodeTypeLabelMap[values.type]}</span>
                    </div>
                    <div className="type-category-row" role="tablist" aria-label="Node type categories">
                      {availableCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          role="tab"
                          aria-selected={typeCategory === category}
                          className={`type-category${typeCategory === category ? ' selected' : ''}`}
                          onClick={() => setTypeCategory(category)}
                        >
                          {nodeTypeCategoryLabels[category]}
                        </button>
                      ))}
                    </div>
                    <div className="type-card-grid">
                      {filteredNodeTypeOptions.length === 0 ? (
                        <p className="type-card-empty">No node types in this category yet.</p>
                      ) : (
                        filteredNodeTypeOptions.map((option) => {
                          const selected = option.value === values.type;
                          return (
                            <button
                              type="button"
                              key={option.value}
                              className={`type-card${selected ? ' selected' : ''}`}
                              onClick={() => onTypeChange(option.value)}
                              aria-pressed={selected}
                            >
                              <img
                                src={getNodeIcon(option.value)}
                                alt=""
                                aria-hidden="true"
                                className="type-card-icon"
                              />
                              <div className="type-card-body">
                                <span className="type-card-title">{option.label}</span>
                                <span className="type-card-description">{option.description}</span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </section>
              )}
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
            {isCreateFlow ? (
              showDetailsStep ? (
                <>
                  <button type="button" className="btn" onClick={() => setCreateStep('basics')}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-accent">
                    Create Node
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => setCreateStep('details')}
                  disabled={!canProceedToDetails}
                >
                  Continue
                </button>
              )
            ) : (
              <button type="submit" className="btn btn-accent">
                Save Changes
              </button>
            )}
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
