import { FloatingPanel } from './FloatingPanel';
import { PaletteIcon } from './icons';
import type { Theme } from '../constants/theme';

type ThemeField = {
  key: keyof Theme;
  label: string;
};

const fields: ThemeField[] = [
  { key: 'accent', label: 'Accent' },
  { key: 'accentHover', label: 'Accent Hover' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'hover', label: 'Hover' },
  { key: 'edge', label: 'Borders' },
  { key: 'textPrimary', label: 'Text Primary' },
  { key: 'textSecondary', label: 'Text Secondary' },
  { key: 'nodeFill', label: 'Node Fill' },
  { key: 'nodeBorder', label: 'Node Border' },
  { key: 'nodeGlow', label: 'Node Glow' },
  { key: 'iconAccent', label: 'Icon Accent' },
];

type ThemePanelProps = {
  theme: Theme;
  onChangeTheme: (next: Theme) => void;
  onClose: () => void;
  onReset: () => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onMove: (next: { x: number; y: number }) => void;
  onResize: (next: { x: number; y: number; width: number; height: number }) => void;
};

export const ThemePanel = ({
  theme,
  onChangeTheme,
  onClose,
  onReset,
  position,
  size,
  onMove,
  onResize,
}: ThemePanelProps) => {
  const handleInput = (key: keyof Theme, value: string) => {
    onChangeTheme({
      ...theme,
      [key]: value,
    });
  };

  const headerContent = (
    <div className="node-editor-title">
      <div className="node-editor-icon node-editor-icon--pill">
        <PaletteIcon />
      </div>
      <div className="node-editor-title-text">
        <h2>Theme</h2>
      </div>
    </div>
  );

  return (
    <FloatingPanel
      className="node-editor theme-panel"
      position={position}
      size={size}
      onMove={onMove}
      onResize={onResize}
      onToggleExpand={() => {}}
      onClose={onClose}
      headerContent={headerContent}
      showResizeHandles={true}
    >
      <div className="theme-panel-body" style={{ flex: 1, overflow: 'auto' }}>
        <div className="theme-panel-subtitle-row">
          <p className="theme-panel-subtitle">Tune accents, surfaces, labels, and icon tint.</p>
          <button type="button" className="profile-button" onClick={onReset}>
            Reset
          </button>
        </div>
        <div className="theme-grid">
          {fields.map((field) => (
            <label key={field.key} className="theme-field">
              <span>{field.label}</span>
              <div className="theme-input">
                <input
                  type="color"
                  value={theme[field.key]}
                  onChange={(event) => handleInput(field.key, event.target.value)}
                  aria-label={field.label}
                />
                <input
                  type="text"
                  value={theme[field.key]}
                  onChange={(event) => handleInput(field.key, event.target.value)}
                  aria-label={`${field.label} value`}
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    </FloatingPanel>
  );
};
