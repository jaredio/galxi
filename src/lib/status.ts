export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const ACTIVE_KEYWORDS = [
  'running',
  'active',
  'online',
  'available',
  'connected',
  'healthy',
  'ready',
  'up',
  'enabled',
];

const INACTIVE_KEYWORDS = [
  'stopped',
  'offline',
  'disconnected',
  'failed',
  'error',
  'inactive',
  'down',
  'disabled',
  'deallocated',
];

export const normalizeStatusValue = (value?: string) => value?.trim().toLowerCase() ?? '';

export const isActiveStatus = (status: string) =>
  ACTIVE_KEYWORDS.some((keyword) => status.includes(keyword));

export const isInactiveStatus = (status: string) =>
  INACTIVE_KEYWORDS.some((keyword) => status.includes(keyword));

export const resolveStatusTone = (status: string): StatusTone => {
  const normalized = normalizeStatusValue(status);
  if (!normalized) {
    return 'neutral';
  }
  if (isActiveStatus(normalized)) {
    return 'success';
  }
  if (isInactiveStatus(normalized)) {
    return 'danger';
  }
  if (['degraded', 'pending', 'initializing', 'warming'].some((keyword) => normalized.includes(keyword))) {
    return 'warning';
  }
  return 'neutral';
};
