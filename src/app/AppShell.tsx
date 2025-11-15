import { CanvasView } from './CanvasView';
import { DashboardView } from './DashboardView';
import { useAppController } from './hooks/useAppController';
import { Topbar } from '../components/Topbar';

export const AppShell = () => {
  const { activeTab, setActiveTab, isCanvasView, canvasViewModel, dashboardViewModel } = useAppController();

  return (
    <div className="app">
      <Topbar activeTab={activeTab} onSelectTab={setActiveTab} />
      {isCanvasView ? <CanvasView model={canvasViewModel} /> : <DashboardView model={dashboardViewModel} />}
    </div>
  );
};

export default AppShell;
