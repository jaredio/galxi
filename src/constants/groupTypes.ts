import type { GroupType } from '../types/graph';

export type GroupTypeCategory = 'network' | 'logical';

export type GroupTypeOption = {
  value: GroupType;
  label: string;
  description: string;
  category: GroupTypeCategory;
};

export const groupTypeCategoryOrder: GroupTypeCategory[] = ['network', 'logical'];

export const groupTypeCategoryLabels: Record<GroupTypeCategory, string> = {
  network: 'Network Scopes',
  logical: 'Logical Groupings',
};

export const groupTypeOptions: GroupTypeOption[] = [
  {
    value: 'virtualNetwork',
    label: 'Virtual Network',
    description: 'Top-level network perimeter for subnets and security domains.',
    category: 'network',
  },
  {
    value: 'subnet',
    label: 'Subnet',
    description: 'Segment traffic within a vNet for isolated workloads.',
    category: 'network',
  },
  {
    value: 'logicalGroup',
    label: 'Logical Group',
    description: 'Organize resources by application or environment boundary.',
    category: 'logical',
  },
];
