import type { FormEvent } from 'react';

import { CloseIcon, EditIcon, TrashIcon } from './icons';
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
  onLabelChange: (value: string) => void;
  onTypeChange: (value: NodeType) => void;
  onGroupChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteNode: () => void;
  nodeTypeOptions: Array<{ value: NodeType; label: string }>;
  connections: NodeConnection[];
  onConnectionRelationChange: (key: string, relation: string) => void;
  onConnectionRemove: (key: string) => void;
};

export const NodeEditorPanel = ({
  mode,
  values,
  onLabelChange,
  onTypeChange,
  onGroupChange,
  onClose,
  onSubmit,
  onDeleteNode,
  nodeTypeOptions,
  connections,
  onConnectionRelationChange,
  onConnectionRemove,
}: NodeEditorPanelProps) => (
  <aside className={`node-editor-panel${mode === 'create' ? ' is-create' : ''}`} role="dialog" aria-modal="false">
    <header className="node-editor-header">
      <div className="node-editor-title">
        <span className="node-editor-eyebrow">{mode === 'create' ? 'Create node' : 'Node details'}</span>
        <h2>{values.label || 'Untitled Node'}</h2>
      </div>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Close node editor">
        <CloseIcon />
      </button>
    </header>

    <form className="node-editor-form" onSubmit={onSubmit}>
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
          <span>Group</span>
          <input
            value={values.group}
            onChange={(event) => onGroupChange(event.target.value)}
            placeholder="Optional grouping label"
          />
        </label>
      </section>

      {mode === 'edit' && (
        <section className="node-editor-section">
          <div className="node-editor-section-header">
            <span>Connections</span>
            <EditIcon className="node-editor-section-icon" />
          </div>
          {connections.length === 0 ? (
            <p className="node-editor-empty">No connections yet.</p>
          ) : (
            <ul className="node-editor-connection-list">
              {connections.map((connection) => (
                <li key={connection.key} className="node-editor-connection-item">
                  <div className="node-editor-connection-meta">
                    <span className={`connection-direction ${connection.direction}`}>
                      {connection.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                    </span>
                    <span className="connection-peer">{connection.peerLabel}</span>
                  </div>
                  <div className="node-editor-connection-controls">
                    <input
                      value={connection.relation}
                      onChange={(event) => onConnectionRelationChange(connection.key, event.target.value)}
                      placeholder="Describe relation"
                    />
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => onConnectionRemove(connection.key)}
                      aria-label="Remove connection"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="node-editor-footer">
        <div className="node-editor-footer-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
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
  </aside>
);
