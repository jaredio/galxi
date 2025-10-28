export const tabs = [{ id: 'canvas', label: 'Canvas' }] as const;

export type TabId = (typeof tabs)[number]['id'];
