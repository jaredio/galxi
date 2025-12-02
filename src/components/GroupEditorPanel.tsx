import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { NetworkIcon } from './icons';

import { getGroupIcon } from '../constants/groupIcons';
import { groupTypeCategoryLabels, groupTypeCategoryOrder, groupTypeOptions } from '../constants/groupTypes';
import { groupTypeLabelMap } from '../constants/groupLabels';
import type { GroupType } from '../types/graph';
import type { ProfileFormSection, ResourceProfileData } from '../types/profile';
import { ProfileForm } from './ProfileForm';
import { validateGroupTitle } from '../lib/validation';
import { FloatingPanel } from './FloatingPanel';

type GroupEditorPanelProps = {
  mode: 'create' | 'edit';
  values: { title: string; type: GroupType };
  onTitleChange: (value: string) => void;
  onTypeChange: (value: GroupType) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onMove: (position: { x: number; y: number }) => void;
  onResize: (geometry: { x: number; y: number; width: number; height: number }) => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  profileDraft: ResourceProfileData;
  profileSections: ProfileFormSection[];
  onProfileFieldChange: (fieldKey: string, value: string) => void;
};

export const GroupEditorPanel = ({
  mode,
  values,
  onTitleChange,
  onTypeChange,
  onClose,
  onSubmit,
  onDelete,
  position,
  size,
  onMove,
  onResize,
  onToggleExpand,
  isExpanded,
  profileDraft,
  profileSections,
  onProfileFieldChange,
}: GroupEditorPanelProps) => {
  const categoryByType = useMemo(
    () => new Map(groupTypeOptions.map((option) => [option.value, option.category] as const)),
    []
  );
  const availableCategories = useMemo(
    () => groupTypeCategoryOrder.filter((category) => groupTypeOptions.some((option) => option.category === category)),
    []
  );
  const resolveCategory = useCallback(
    (type: GroupType) => categoryByType.get(type) ?? availableCategories[0] ?? groupTypeCategoryOrder[0],
    [categoryByType, availableCategories]
  );
  const [groupCategory, setGroupCategory] = useState(resolveCategory(values.type));
  const isCreateFlow = mode === 'create';
  const [createStep, setCreateStep] = useState<'basics' | 'details'>('basics');
  const showDetailsStep = isCreateFlow && createStep === 'details';
  const titleValidation = useMemo(() => validateGroupTitle(values.title), [values.title]);
  const titleError = titleValidation.valid ? null : titleValidation.error;
  const titleErrorId = 'group-title-error';
  const canProceedToDetails = titleValidation.valid;
  const submitDisabled = !titleValidation.valid;
  const filteredGroupOptions = useMemo(
    () => groupTypeOptions.filter((option) => option.category === groupCategory),
    [groupCategory]
  );

  useEffect(() => {
    if (!filteredGroupOptions.some((option) => option.value === values.type) && filteredGroupOptions[0]) {
      onTypeChange(filteredGroupOptions[0].value);
    }
  }, [filteredGroupOptions, onTypeChange, values.type]);

  useEffect(() => {
    setGroupCategory(resolveCategory(values.type));
  }, [values.type, resolveCategory]);
  useEffect(() => {
    if (mode === 'create') {
      setCreateStep('basics');
    }
  }, [mode, values.type]);

  const selectedGroupOption = useMemo(
    () => groupTypeOptions.find((option) => option.value === values.type) ?? groupTypeOptions[0],
    [values.type]
  );

  const renderBasicsSection = useCallback(
    (eyebrow: string, placeholder: string, autoFocus = false) => (
      <section className="wizard-section">
        <div className="wizard-pane">
          <p className="wizard-eyebrow">{eyebrow}</p>
          <label className="wizard-field-row">
            <span>Group Name</span>
            <input
              value={values.title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              maxLength={100}
              aria-invalid={!titleValidation.valid}
              aria-describedby={titleError ? titleErrorId : undefined}
            />
          </label>
          {titleError && (
            <p className="wizard-field-error" id={titleErrorId} role="alert">
              {titleError}
            </p>
          )}
        </div>
        <div className="node-editor-divider" />
        <div className="type-picker type-picker--premium">
          <div className="type-picker-head">
            <div>
              <span className="type-picker-label">Group Type</span>
              <span className="type-picker-value">{groupTypeLabelMap[values.type]}</span>
            </div>
          </div>
          {availableCategories.length > 1 && (
            <div className="node-editor-category-tabs" role="tablist" aria-label="Group type categories">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={groupCategory === category}
                  className={`node-editor-category-tab${groupCategory === category ? ' is-active' : ''}`}
                  onClick={() => setGroupCategory(category)}
                >
                  {groupTypeCategoryLabels[category]}
                </button>
              ))}
            </div>
          )}
          <div key={groupCategory} className="node-editor-type-layout">
            <div className="node-editor-type-list" role="listbox" aria-label="Group types">
              {filteredGroupOptions.length === 0 ? (
                <p className="type-card-empty">Nothing in this catalog yet.</p>
              ) : (
                filteredGroupOptions.map((option) => {
                  const active = option.value === values.type;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`node-editor-type-row${active ? ' is-active' : ''}`}
                      onClick={() => onTypeChange(option.value)}
                      aria-pressed={active}
                    >
                      <img src={getGroupIcon(option.value)} alt="" aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="node-editor-type-preview">
              <div className="node-editor-type-preview-header">
                <p className="node-editor-type-preview-title">
                  <img src={getGroupIcon(selectedGroupOption?.value ?? values.type)} alt="" aria-hidden="true" />
                  {selectedGroupOption?.label ?? groupTypeLabelMap[values.type]}
                </p>
                <span className="node-editor-type-category">
                  Category: {groupTypeCategoryLabels[selectedGroupOption?.category ?? groupCategory]}
                </span>
              </div>
              <p className="node-editor-type-preview-desc">
                {selectedGroupOption?.description ?? 'Select a group type to view details.'}
              </p>
              <p className="node-editor-type-preview-footnote">
                Persists into the next step. You can adjust scope details after creation.
              </p>
            </div>
          </div>
        </div>
      </section>
    ),
    [
      availableCategories,
      filteredGroupOptions,
      groupCategory,
      groupTypeCategoryLabels,
      groupTypeLabelMap,
      onTitleChange,
      onTypeChange,
      selectedGroupOption,
      setGroupCategory,
      titleError,
      titleValidation.valid,
      values.title,
      values.type,
    ]
  );


  const groupIcon = useMemo(() => getGroupIcon(values.type), [values.type]);
  const saveButtonLabel = mode === 'create' ? 'Create Group' : 'Save Changes';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(event);
  };

  const panelClassName = 'node-editor group-editor';
  const headerTitle = mode === 'create' ? 'New Group' : values.title || 'Edit Group';
  const headerSubtitle = groupTypeLabelMap[values.type] ?? 'Group';
  const headerContent = (
    <div className="node-editor-title">
      <span className="node-editor-icon">
        {groupIcon ? <img src={groupIcon} alt="" /> : <NetworkIcon />}
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
      <form className="node-editor-form" onSubmit={handleSubmit}>
        <div className="node-editor-body group-editor-body">
          {isCreateFlow ? (
            showDetailsStep ? (
              <ProfileForm
                sections={profileSections}
                values={profileDraft}
                onChange={onProfileFieldChange}
                hint="Document ownership, placement, or policy data for this scope. Everything stays optional."
              />
            ) : (
              renderBasicsSection('New Group', 'Descriptive label', mode === 'create')
            )
          ) : (
            <>
              {renderBasicsSection('Group Basics', 'Descriptive label')}
              <ProfileForm
                sections={profileSections}
                values={profileDraft}
                onChange={onProfileFieldChange}
                hint="Update ownership, placement, or policy data for this scope."
              />
            </>
          )}
        </div>

        <footer className="node-editor-footer">
          {mode === 'edit' && onDelete ? (
            <button type="button" className="danger-link" onClick={onDelete}>
              Delete group
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
                    {saveButtonLabel}
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
                {saveButtonLabel}
              </button>
            )}
          </div>
        </footer>
      </form>
    </FloatingPanel>
  );
};
