export const tabs = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'dashboard', label: 'Dashboard' },
] as const;

export type TabId = (typeof tabs)[number]['id'];
