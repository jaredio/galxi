import './App.css';

import { AppShell } from './app/AppShell';
import { WorkspaceGate } from './workspace/WorkspaceGate';

const App = () => (
  <WorkspaceGate>{(workspace) => <AppShell workspaceId={workspace.id} />}</WorkspaceGate>
);

export default App;
