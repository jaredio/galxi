import { FloatingPanel } from './FloatingPanel';
import { SettingsIcon } from './icons';

type SettingsPanelProps = {
  onClose: () => void;
  onExport: () => void;
  onResetWorkspace: () => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onMove: (next: { x: number; y: number }) => void;
  onResize: (next: { x: number; y: number; width: number; height: number }) => void;
};

export const SettingsPanel = ({
  onClose,
  onExport,
  onResetWorkspace,
  position,
  size,
  onMove,
  onResize,
}: SettingsPanelProps) => {
  const headerContent = (
    <div className="node-editor-title">
      <div className="node-editor-icon node-editor-icon--pill">
        <SettingsIcon />
      </div>
      <div className="node-editor-title-text">
        <p className="node-editor-kicker">Settings</p>
        <h2>Workspace controls</h2>
      </div>
    </div>
  );

  return (
    <FloatingPanel
      className="node-editor settings-panel"
      position={position}
      size={size}
      onMove={onMove}
      onResize={onResize}
      onToggleExpand={() => {}}
      onClose={onClose}
      headerContent={headerContent}
      headerActions={null}
      showResizeHandles={true}
    >
      <div className="settings-panel-body">
        <div className="settings-grid">
          <button type="button" className="settings-tile" onClick={onExport}>
            <div>
              <p className="settings-title">Export JSON</p>
              <p className="settings-copy">Download the current workspace for backup or sharing.</p>
            </div>
          </button>
          <button type="button" className="settings-tile danger" onClick={onResetWorkspace}>
            <div>
              <p className="settings-title">Reset workspace</p>
              <p className="settings-copy">Clear nodes, groups, and links for a fresh start.</p>
            </div>
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
};
