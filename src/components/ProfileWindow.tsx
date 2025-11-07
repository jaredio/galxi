import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type { ProfileField, ProfileSection, ProfileWindowContent } from '../types/profile';
import { CloseIcon, EditIcon } from './icons';

type ProfileWindowProps = ProfileWindowContent & {
  position: { x: number; y: number };
  zIndex: number;
  onMove: (position: { x: number; y: number }) => void;
  onClose: () => void;
  onFocus: () => void;
  editable?: boolean;
  onFieldChange?: (fieldId: string, value: string) => void;
  onOpenEditor?: () => void;
};

type SectionProps = ProfileSection & {
  editing: boolean;
  onFieldChange?: (fieldId: string, value: string) => void;
};

type FieldProps = ProfileField & {
  editing: boolean;
  onFieldChange?: (fieldId: string, value: string) => void;
};

const STATUS_OPTIONS = ['Unknown', 'Running', 'Stopped', 'Degraded', 'Error', 'Healthy', 'Active', 'Disabled'];

const isStatusField = (fieldId: string) => fieldId.endsWith('.status');

const ProfileFieldRow = ({ id, label, value, editable = true, editing, onFieldChange }: FieldProps) => (
  <div className="profile-kv">
    <dt>{label}</dt>
    <dd>
      {editing && editable && onFieldChange ? (
        isStatusField(id) ? (
          <select
            className="profile-select"
            value={value}
            onChange={(event) => onFieldChange(id, event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="profile-input"
            value={value}
            onChange={(event) => onFieldChange(id, event.target.value)}
          />
        )
      ) : (
        <span>{value}</span>
      )}
    </dd>
  </div>
);

const ProfileSectionBlock = ({ id, title, items, editing, onFieldChange }: SectionProps) => (
  <section className="profile-section" aria-labelledby={`profile-section-${id}`}>
    <h3 id={`profile-section-${id}`} className="profile-section-title">
      {title}
    </h3>
    <dl className="profile-kv-grid">
      {items.map((item) => (
        <ProfileFieldRow
          key={item.id}
          {...item}
          editing={editing}
          onFieldChange={onFieldChange}
        />
      ))}
    </dl>
  </section>
);

export const ProfileWindow = ({
  title,
  typeLabel,
  overview,
  sections,
  status,
  iconSrc,
  meta,
  position,
  zIndex,
  onMove,
  onClose,
  onFocus,
  editable = false,
  onFieldChange,
  onOpenEditor,
}: ProfileWindowProps) => {
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const stopTrackingPointer = useCallback(() => {
    if (pointerCleanupRef.current) {
      pointerCleanupRef.current();
      pointerCleanupRef.current = null;
    }
  }, []);

  useEffect(() => stopTrackingPointer, [stopTrackingPointer]);

  const trackPointer = useCallback(
    (pointerId: number, offsetX: number, offsetY: number) => {
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) {
          return;
        }
        onMove({
          x: event.clientX - offsetX,
          y: event.clientY - offsetY,
        });
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
    [onMove]
  );

  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || event.detail > 1) {
        return;
      }
      event.preventDefault();
      onFocus();
      const offsetX = event.clientX - position.x;
      const offsetY = event.clientY - position.y;
      trackPointer(event.pointerId, offsetX, offsetY);
    },
    [onFocus, position.x, position.y, trackPointer]
  );

  const toggleEditing = () => {
    if (!editable || !onFieldChange) {
      return;
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <article
      className="profile-window"
      style={{ left: position.x, top: position.y, zIndex }}
      onMouseDownCapture={onFocus}
    >
      <header className="profile-header" onPointerDown={handleHeaderPointerDown}>
        <div className="profile-identity">
          <span className="profile-icon" aria-hidden="true">
            {iconSrc ? <img src={iconSrc} alt="" /> : <EditIcon />}
          </span>
          <div className="profile-titles">
            <p className="profile-title">{title}</p>
            <span className="profile-type">{typeLabel}</span>
          </div>
        </div>
        <div className="profile-header-actions">
          {status && (
            <span className={`profile-status profile-status--${status.tone}`}>{status.label}</span>
          )}
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close profile">
            <CloseIcon />
          </button>
        </div>
      </header>

      {meta && meta.length > 0 && (
        <div className="profile-meta">
          {meta.map((chip) => (
            <span key={chip.label} className="profile-meta-chip">
              <strong>{chip.label}:</strong> {chip.value}
            </span>
          ))}
        </div>
      )}

      <div className="profile-body">
        <ProfileSectionBlock
          id="overview"
          title="Overview"
          items={overview}
          editing={isEditing}
          onFieldChange={onFieldChange}
        />
        {sections.map((section) => (
          <ProfileSectionBlock
            key={section.id}
            {...section}
            editing={isEditing}
            onFieldChange={onFieldChange}
          />
        ))}
      </div>

      {(editable || onOpenEditor) && (
        <div className="profile-actions profile-actions--footer">
          {onOpenEditor && (
            <button type="button" className="profile-button profile-button--subtle" onClick={onOpenEditor}>
              <EditIcon /> Resource Editor
            </button>
          )}
          {editable && onFieldChange && (
            <button type="button" className="profile-button" onClick={toggleEditing}>
              {isEditing ? 'Finish Editing' : 'Edit Details'}
            </button>
          )}
        </div>
      )}
    </article>
  );
};
