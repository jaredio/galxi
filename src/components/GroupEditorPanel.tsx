import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';

import { CloseIcon, NetworkIcon, TrashIcon } from './icons';

import { getGroupIcon } from '../constants/groupIcons';
import { groupTypeCategoryLabels, groupTypeCategoryOrder, groupTypeOptions } from '../constants/groupTypes';
import { groupTypeLabelMap } from '../constants/groupLabels';
import type { GroupType } from '../types/graph';

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
}: GroupEditorPanelProps) => {
  const pointerCleanupRef = useRef<(() => void) | null>(null);
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

  useEffect(() => {
    setGroupCategory(resolveCategory(values.type));
  }, [values.type, resolveCategory]);

  const filteredGroupOptions = useMemo(
    () => groupTypeOptions.filter((option) => option.category === groupCategory),
    [groupCategory]
  );

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
      onMove({ x: baseX + deltaX, y: baseY + deltaY });
    });
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLSpanElement>, handle: ResizeHandle) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { clientX, clientY, pointerId } = event;

    trackPointer(pointerId, (moveEvent) => {
      const deltaX = moveEvent.clientX - clientX;
      const deltaY = moveEvent.clientY - clientY;

      const geometry = { ...position, width: size.width, height: size.height };

      if (handle.includes('left')) {
        const nextWidth = Math.max(320, size.width - deltaX);
        geometry.x = position.x + (size.width - nextWidth);
        geometry.width = nextWidth;
      }
      if (handle.includes('right')) {
        geometry.width = Math.max(320, size.width + deltaX);
      }
      if (handle.includes('top')) {
        const nextHeight = Math.max(220, size.height - deltaY);
        geometry.y = position.y + (size.height - nextHeight);
        geometry.height = nextHeight;
      }
      if (handle.includes('bottom')) {
        geometry.height = Math.max(220, size.height + deltaY);
      }

      onResize(geometry);
    });
  };

  const groupIcon = useMemo(() => getGroupIcon(values.type), [values.type]);
  const saveButtonLabel = mode === 'create' ? 'Create Group' : 'Save Changes';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(event);
  };

  return (
    <aside
      className={`node-editor group-editor${isExpanded ? ' is-expanded' : ''}`}
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
            {groupIcon ? <img src={groupIcon} alt="" /> : <NetworkIcon />}
          </span>
          <div className="node-editor-title-text">
            <h2>{mode === 'create' ? 'Create Group' : 'Edit Group'}</h2>
            <span className="node-editor-eyebrow">
              {groupTypeLabelMap[values.type] ?? 'Group'}
            </span>
          </div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close group editor">
          <CloseIcon />
        </button>
      </header>

      <form className="node-editor-form" onSubmit={handleSubmit}>
        <div className="node-editor-body group-editor-body">
          <section className="node-editor-section">
            <label>
              <span>Group Name</span>
              <input
                value={values.title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Descriptive label"
                autoFocus={mode === 'create'}
              />
            </label>
            <div className="type-picker">
              <div className="type-picker-head">
                <span className="type-picker-label">Group Type</span>
                <span className="type-picker-value">{groupTypeLabelMap[values.type]}</span>
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
              <div className="type-card-grid">
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
                      <img src={getGroupIcon(option.value)} alt="" aria-hidden="true" className="type-card-icon" />
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
        </div>

        <footer className="node-editor-footer">
          <div className="node-editor-footer-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent">
              {saveButtonLabel}
            </button>
          </div>
          {mode === 'edit' && onDelete && (
            <button type="button" className="danger-link" onClick={onDelete}>
              <TrashIcon /> Delete group
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
