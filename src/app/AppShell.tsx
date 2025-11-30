import { Suspense, lazy, useState } from 'react';

import { CanvasView } from './CanvasView';
import { useAppController } from './hooks/useAppController';
import { Topbar } from '../components/Topbar';
import { ThemePanel } from '../components/ThemePanel';
import { SettingsPanel } from '../components/SettingsPanel';

const DashboardView = lazy(async () => {
  const module = await import('./DashboardView');
  return { default: module.DashboardView };
});

type AppShellProps = {
  workspaceId?: string;
};

export const AppShell = ({ workspaceId }: AppShellProps) => {
  const [themePanelGeometry, setThemePanelGeometry] = useState({
    x: 180,
    y: 120,
    width: 540,
    height: 520,
  });
  const [settingsGeometry, setSettingsGeometry] = useState({
    x: 220,
    y: 160,
    width: 520,
    height: 320,
  });

  const {
    activeTab,
    setActiveTab,
    isCanvasView,
    canvasViewModel,
    dashboardViewModel,
    theme,
    setTheme,
    resetTheme,
    themePanelOpen,
    settingsPanelOpen,
    closeThemePanel,
    closeSettingsPanel,
    exportWorkspace,
    resetWorkspace,
  } = useAppController({ workspaceId });

  return (
    <>
      <div className="app">
        <Topbar activeTab={activeTab} onSelectTab={setActiveTab} />
        {isCanvasView ? (
          <CanvasView model={canvasViewModel} />
        ) : (
          <Suspense fallback={<div className="view-loading">Loading dashboard…</div>}>
            <DashboardView model={dashboardViewModel} />
          </Suspense>
        )}
      </div>

      {themePanelOpen && (
        <ThemePanel
          theme={theme}
          onChangeTheme={setTheme}
          onReset={resetTheme}
          onClose={closeThemePanel}
          position={{ x: themePanelGeometry.x, y: themePanelGeometry.y }}
          size={{ width: themePanelGeometry.width, height: themePanelGeometry.height }}
          onMove={(next) => setThemePanelGeometry((prev) => ({ ...prev, ...next }))}
          onResize={(next) => setThemePanelGeometry((prev) => ({ ...prev, ...next }))}
        />
      )}

      {settingsPanelOpen && (
        <SettingsPanel
          onClose={closeSettingsPanel}
          onExport={exportWorkspace}
          onResetWorkspace={resetWorkspace}
          position={{ x: settingsGeometry.x, y: settingsGeometry.y }}
          size={{ width: settingsGeometry.width, height: settingsGeometry.height }}
          onMove={(next) => setSettingsGeometry((prev) => ({ ...prev, ...next }))}
          onResize={(next) => setSettingsGeometry((prev) => ({ ...prev, ...next }))}
        />
      )}
    </>
  );
};

export default AppShell;
