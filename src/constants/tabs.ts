export const tabs = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'layers', label: 'Layers' },
  { id: 'insights', label: 'Insights' },
  { id: 'deployments', label: 'Deployments' },
] as const;

export type TabId = (typeof tabs)[number]['id'];
