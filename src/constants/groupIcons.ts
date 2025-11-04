import type { GroupType } from '../types/graph';

const iconVirtualNetwork = new URL('../../icons/VirtualNetwork.svg', import.meta.url).href;
const iconSubnet = new URL('../../icons/Subnet.svg', import.meta.url).href;
const iconLogical = new URL('../../icons/VirtualMachine.svg', import.meta.url).href;

const groupIcons: Record<GroupType, string> = {
  virtualNetwork: iconVirtualNetwork,
  subnet: iconSubnet,
  logicalGroup: iconLogical,
};

export const getGroupIcon = (type: GroupType) => groupIcons[type] ?? iconLogical;
