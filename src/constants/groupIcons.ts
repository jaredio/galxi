import type { GroupType } from '../types/graph';
import { getNodeIcon } from './nodeIcons';

const iconVirtualNetwork = getNodeIcon('virtualNetwork');
const iconSubnet = getNodeIcon('subnet');
const iconLogical = getNodeIcon('logicalGroup');

const groupIcons: Record<GroupType, string> = {
  virtualNetwork: iconVirtualNetwork,
  subnet: iconSubnet,
  logicalGroup: iconLogical,
};

export const getGroupIcon = (type: GroupType) => groupIcons[type] ?? iconLogical;
