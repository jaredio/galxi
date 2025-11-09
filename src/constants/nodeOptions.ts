import type { NodeType } from '../types/graph';

export type NodeTypeCategory = 'compute' | 'network' | 'security' | 'storage' | 'integration';

export type NodeTypeOption = {
  value: NodeType;
  label: string;
  description: string;
  category: NodeTypeCategory;
};

export const nodeTypeCategoryOrder: NodeTypeCategory[] = ['compute', 'network', 'security', 'storage', 'integration'];

export const nodeTypeCategoryLabels: Record<NodeTypeCategory, string> = {
  compute: 'Compute',
  network: 'Networking',
  security: 'Security',
  storage: 'Storage',
  integration: 'Integration',
};

export const nodeTypeOptions: NodeTypeOption[] = [
  {
    value: 'vm',
    label: 'Virtual Machine',
    description: 'General purpose compute workloads, Windows/Linux VMs.',
    category: 'compute',
  },
  {
    value: 'loadBalancer',
    label: 'Load Balancer',
    description: 'Distribute traffic across services and expose public endpoints.',
    category: 'network',
  },
  {
    value: 'publicIp',
    label: 'Public IP',
    description: 'Static or dynamic public IP addresses for ingress.',
    category: 'network',
  },
  {
    value: 'natGateway',
    label: 'NAT Gateway',
    description: 'Outbound internet access for private resources.',
    category: 'network',
  },
  {
    value: 'networkInterface',
    label: 'Network Interface (NIC)',
    description: 'NICs attached to compute resources and subnets.',
    category: 'network',
  },
  {
    value: 'bastion',
    label: 'Bastion Host',
    description: 'Managed bastion service for secure RDP/SSH to VMs.',
    category: 'network',
  },
  {
    value: 'vmScaleSet',
    label: 'VM Scale Set',
    description: 'Elastic set of identical VMs with managed scaling.',
    category: 'compute',
  },
  {
    value: 'appService',
    label: 'App Service',
    description: 'Managed web apps and APIs running on App Service Plans.',
    category: 'compute',
  },
  {
    value: 'functionApp',
    label: 'Function App',
    description: 'Serverless runtimes for background jobs and APIs.',
    category: 'compute',
  },
  {
    value: 'firewall',
    label: 'Firewall',
    description: 'Perimeter security for virtual networks and services.',
    category: 'security',
  },
  {
    value: 'storage',
    label: 'Storage Account',
    description: 'Blob/File/Queue tables for application data.',
    category: 'storage',
  },
  {
    value: 'disk',
    label: 'Managed Disk',
    description: 'Premium/standard disks attached to compute.',
    category: 'storage',
  },
];
