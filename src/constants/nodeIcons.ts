import type { NodeType } from '../types/graph';

const iconVirtualMachine = new URL('../../icons/VirtualMachine.svg', import.meta.url).href;
const iconFirewall = new URL('../../icons/10084-icon-service-Firewalls.svg', import.meta.url).href;
const iconStorage = new URL('../../icons/StorageContainer.svg', import.meta.url).href;

export const nodeIcons: Record<NodeType, string> = {
  vm: iconVirtualMachine,
  firewall: iconFirewall,
  storage: iconStorage,
  database: iconStorage,
  gateway: iconVirtualMachine,
};

export const defaultNodeIcon = iconVirtualMachine;

export const getNodeIcon = (type: NodeType) => nodeIcons[type] ?? defaultNodeIcon;
