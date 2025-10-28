import type { NodeType } from '../types/graph';

export const nodeTypeOptions: Array<{ value: NodeType; label: string }> = [
  { value: 'vm', label: 'Virtual Machine' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'storage', label: 'Storage Account' },
  { value: 'database', label: 'Database' },
  { value: 'gateway', label: 'Network Gateway' },
];
