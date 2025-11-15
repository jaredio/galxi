import { useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';

import { LinkIcon, TrashIcon } from './icons';

import { getGroupIcon } from '../constants/groupIcons';
import { getNodeIcon } from '../constants/nodeIcons';
import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { groupTypeLabelMap } from '../constants/groupLabels';
import type { GroupType, NodeType } from '../types/graph';
import { FloatingPanel } from './FloatingPanel';

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

  const headerContent = (
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
  );

  return (
    <FloatingPanel
      className={`node-editor connection-editor${isExpanded ? ' is-expanded' : ''}`}
      position={position}
      size={size}
      isExpanded={isExpanded}
      onMove={onMove}
      onResize={onResize}
      onToggleExpand={onToggleExpand}
      onClose={onClose}
      headerContent={headerContent}
    >
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
    </FloatingPanel>
  );
};
