import type { GroupType } from '../types/graph';

const iconVirtualNetwork = new URL('../../icons/groups/VirtualNetwork.svg', import.meta.url).href;
const iconSubnet = new URL('../../icons/groups/Subnet.svg', import.meta.url).href;
const iconLogical = new URL('../../icons/groups/LogicalGroup.svg', import.meta.url).href;

const groupIcons: Record<GroupType, string> = {
  virtualNetwork: iconVirtualNetwork,
  subnet: iconSubnet,
  logicalGroup: iconLogical,
};

export const getGroupIcon = (type: GroupType) => groupIcons[type] ?? iconLogical;
