
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { EditIcon, TrashIcon } from './icons';

import { nodeTypeLabelMap } from '../constants/nodeTypeLabels';
import { getNodeIcon } from '../constants/nodeIcons';
import type { NodeType } from '../types/graph';
import type { NodeTypeCategory, NodeTypeOption } from '../constants/nodeOptions';
import { nodeTypeCategoryLabels, nodeTypeCategoryOrder } from '../constants/nodeOptions';
import type { ProfileFormSection, ResourceProfileData } from '../types/profile';
import { ProfileForm } from './ProfileForm';
import { validateLabel } from '../lib/validation';
import { FloatingPanel } from './FloatingPanel';

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
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteNode: () => void;
  nodeTypeOptions: NodeTypeOption[];
  profileDraft: ResourceProfileData;
  profileSections: ProfileFormSection[];
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
  const labelValidation = useMemo(() => validateLabel(values.label), [values.label]);
  const labelError = labelValidation.valid ? null : labelValidation.error;
  const labelErrorId = 'node-label-error';
  const canProceedToDetails = labelValidation.valid;
  const submitDisabled = !labelValidation.valid;
  const filteredNodeTypeOptions = useMemo(
    () => nodeTypeOptions.filter((option) => option.category === typeCategory),
    [nodeTypeOptions, typeCategory]
  );

  useEffect(() => {
    if (!filteredNodeTypeOptions.some((option) => option.value === values.type) && filteredNodeTypeOptions[0]) {
      onTypeChange(filteredNodeTypeOptions[0].value);
    }
  }, [filteredNodeTypeOptions, onTypeChange, values.type]);

  const selectedTypeOption = useMemo(
    () => nodeTypeOptions.find((option) => option.value === values.type) ?? nodeTypeOptions[0],
    [nodeTypeOptions, values.type]
  );

  const renderBasicsSection = useCallback(
    (eyebrow: string, placeholder: string, autoFocus = false) => (
      <section className="wizard-section">
        <div className="wizard-pane">
          <p className="wizard-eyebrow">{eyebrow}</p>
          <label className="wizard-field-row">
            <span>Label</span>
            <input
              value={values.label}
              onChange={(event) => onLabelChange(event.target.value)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              maxLength={100}
              aria-invalid={!labelValidation.valid}
              aria-describedby={labelError ? labelErrorId : undefined}
            />
          </label>
          {labelError && (
            <p className="wizard-field-error" id={labelErrorId} role="alert">
              {labelError}
            </p>
          )}
        </div>
        <div className="node-editor-divider" />
        <div className="type-picker type-picker--premium">
          <div className="type-picker-head">
            <div>
              <span className="type-picker-label">Resource type</span>
              <span className="type-picker-value">{nodeTypeLabelMap[values.type]}</span>
            </div>
          </div>
          <div className="node-editor-category-tabs" role="tablist" aria-label="Node type categories">
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={typeCategory === category}
                className={`node-editor-category-tab${typeCategory === category ? ' is-active' : ''}`}
                onClick={() => setTypeCategory(category)}
              >
                {nodeTypeCategoryLabels[category]}
              </button>
            ))}
          </div>
          <div key={typeCategory} className="node-editor-type-layout">
            <div className="node-editor-type-list" role="listbox" aria-label="Node types">
              {filteredNodeTypeOptions.length === 0 ? (
                <p className="type-card-empty">Nothing in this catalog yet.</p>
              ) : (
                filteredNodeTypeOptions.map((option) => {
                  const active = option.value === values.type;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`node-editor-type-row${active ? ' is-active' : ''}`}
                      onClick={() => onTypeChange(option.value)}
                      aria-pressed={active}
                    >
                      <img src={getNodeIcon(option.value)} alt="" aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="node-editor-type-preview">
              <div className="node-editor-type-preview-header">
                <p className="node-editor-type-preview-title">
                  <img src={getNodeIcon(selectedTypeOption?.value ?? values.type)} alt="" aria-hidden="true" />
                  {selectedTypeOption?.label ?? nodeTypeLabelMap[values.type]}
                </p>
                <span className="node-editor-type-category">
                  Category: {nodeTypeCategoryLabels[selectedTypeOption?.category ?? typeCategory]}
                </span>
              </div>
              <p className="node-editor-type-preview-desc">
                {selectedTypeOption?.description ?? 'Select a resource type to view details.'}
              </p>
              <p className="node-editor-type-preview-footnote">
                Carries into the next step. Refine owners, placement, and connections after creation.
              </p>
            </div>
          </div>
        </div>
      </section>
    ),
    [
      availableCategories,
      filteredNodeTypeOptions,
      labelError,
      labelValidation.valid,
      nodeTypeCategoryLabels,
      nodeTypeLabelMap,
      onLabelChange,
      onTypeChange,
      selectedTypeOption,
      setTypeCategory,
      typeCategory,
      values.label,
      values.type,
    ]
  );

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
  const panelClassName = `node-editor${mode === 'create' ? ' is-create' : ''}`;
  const headerTitle = mode === 'create' ? 'New Node' : values.label || 'Edit Node';
  const headerSubtitle = mode === 'create' ? 'Create node' : nodeTypeLabel;
  const headerContent = (
    <div className="node-editor-title">
      <span className="node-editor-icon">
        <img src={nodeIcon} alt="" />
      </span>
      <div className="node-editor-title-text">
        <h2>{headerTitle}</h2>
        <span className="node-editor-eyebrow">{headerSubtitle}</span>
      </div>
    </div>
  );

  return (
    <FloatingPanel
      className={`${panelClassName}${isExpanded ? ' is-expanded' : ''}`}
      position={position}
      size={size}
      isExpanded={isExpanded}
      onMove={onMove}
      onResize={onResize}
      onToggleExpand={onToggleExpand}
      onClose={onClose}
      headerContent={headerContent}
    >
      <form className="node-editor-form" onSubmit={onSubmit}>
        {!isCreateFlow && (
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
        )}

        <div className="node-editor-body">
        {activeTab === 'info' && (
          <div className="node-editor-section-stack">
            {isCreateFlow ? (
              showDetailsStep ? (
                <ProfileForm
                  sections={profileSections}
                  values={profileDraft}
                    onChange={onProfileFieldChange}
                    hint="All profile fields are optional. Populate only what you have on hand."
                  />
                ) : (
                  renderBasicsSection('New Node', 'Enter node name', mode === 'create')
                )
              ) : (
                <>
                  {renderBasicsSection('Node Basics', 'Node name')}
                  <ProfileForm
                    sections={profileSections}
                    values={profileDraft}
                    onChange={onProfileFieldChange}
                    hint="Update ownership, placement, or policy metadata for this resource."
                  />
                </>
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
                              maxLength={50}
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
                              maxLength={50}
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
          {mode === 'edit' ? (
            <button type="button" className="danger-link" onClick={onDeleteNode}>
              Delete node
            </button>
          ) : (
            <span />
          )}
          <div className="node-editor-footer-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {isCreateFlow ? (
              showDetailsStep ? (
                <>
                  <button type="button" className="btn-ghost" onClick={() => setCreateStep('basics')}>
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitDisabled}>
                    Create Node
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCreateStep('details')}
                  disabled={!canProceedToDetails}
                >
                  Continue
                </button>
              )
            ) : (
              <button type="submit" className="btn-primary" disabled={submitDisabled}>
                Save Changes
              </button>
            )}
          </div>
        </footer>
      </form>
    </FloatingPanel>
  );
};
