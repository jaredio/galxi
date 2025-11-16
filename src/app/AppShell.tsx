import { Suspense, lazy } from 'react';

import { CanvasView } from './CanvasView';
import { useAppController } from './hooks/useAppController';
import { Topbar } from '../components/Topbar';

const DashboardView = lazy(async () => {
  const module = await import('./DashboardView');
  return { default: module.DashboardView };
});

export const AppShell = () => {
  const { activeTab, setActiveTab, isCanvasView, canvasViewModel, dashboardViewModel } = useAppController();

  return (
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
  );
};

export default AppShell;
