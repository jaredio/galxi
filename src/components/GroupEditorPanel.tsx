import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { NetworkIcon, TrashIcon } from './icons';

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
    setGroupCategory(resolveCategory(values.type));
  }, [values.type, resolveCategory]);
  useEffect(() => {
    if (mode === 'create') {
      setCreateStep('basics');
    }
  }, [mode, values.type]);

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
        <div className="wizard-divider" />
        <div className="type-picker type-picker--premium">
          <div className="type-picker-head">
            <div>
              <span className="type-picker-label">Group Type</span>
              <span className="type-picker-value">{groupTypeLabelMap[values.type]}</span>
            </div>
          </div>
          {availableCategories.length > 1 && (
            <div className="type-category-row" role="tablist" aria-label="Group type categories">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={groupCategory === category}
                  className={`type-category${groupCategory === category ? ' selected' : ''}`}
                  onClick={() => setGroupCategory(category)}
                >
                  {groupTypeCategoryLabels[category]}
                </button>
              ))}
            </div>
          )}
          <div key={groupCategory} className="type-card-grid type-card-grid--animated">
            {filteredGroupOptions.map((option) => {
              const selected = option.value === values.type;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={`type-card${selected ? ' selected' : ''}`}
                  onClick={() => onTypeChange(option.value)}
                  aria-pressed={selected}
                >
                  <div className="type-card-icon" aria-hidden="true">
                    <img src={getGroupIcon(option.value)} alt="" />
                  </div>
                  <div className="type-card-body">
                    <span className="type-card-title">{option.label}</span>
                    <span className="type-card-description">{option.description}</span>
                  </div>
                </button>
              );
            })}
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
                  <button type="submit" className="btn btn-accent" disabled={submitDisabled}>
                    {saveButtonLabel}
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
              <button type="submit" className="btn btn-accent" disabled={submitDisabled}>
                {saveButtonLabel}
              </button>
            )}
          </div>
          {mode === 'edit' && onDelete && (
            <button type="button" className="danger-link" onClick={onDelete}>
              <TrashIcon /> Delete group
            </button>
          )}
        </footer>
      </form>
    </FloatingPanel>
  );
};
