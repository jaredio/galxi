import type { NodeType } from '../types/graph';

const iconVirtualMachine = new URL('../../icons/nodes/compute/VirtualMachine.svg', import.meta.url).href;
const iconDisk = new URL('../../icons/nodes/storage/Disk.svg', import.meta.url).href;
const iconAppService = new URL('../../icons/nodes/compute/AppService.svg', import.meta.url).href;
const iconFirewall = new URL('../../icons/nodes/security/Firewall.svg', import.meta.url).href;
const iconStorage = new URL('../../icons/nodes/storage/StorageContainer.svg', import.meta.url).href;
const iconFunctionApp = new URL('../../icons/nodes/compute/FunctionApp.svg', import.meta.url).href;
const iconVmScaleSet = new URL('../../icons/nodes/compute/VMScaleSet.svg', import.meta.url).href;
const iconLoadBalancer = new URL('../../icons/nodes/network/LoadBalancer.svg', import.meta.url).href;
const iconPublicIp = new URL('../../icons/nodes/network/PublicIPAddress.svg', import.meta.url).href;
const iconNatGateway = new URL('../../icons/nodes/network/NATGateway.svg', import.meta.url).href;
const iconNetworkInterface = new URL('../../icons/nodes/network/NetworkInterface.svg', import.meta.url).href;
const iconBastion = new URL('../../icons/nodes/network/Bastion.svg', import.meta.url).href;

export const nodeIcons: Record<NodeType, string> = {
  vm: iconVirtualMachine,
  firewall: iconFirewall,
  storage: iconStorage,
  disk: iconDisk,
  functionApp: iconFunctionApp,
  appService: iconAppService,
  vmScaleSet: iconVmScaleSet,
  loadBalancer: iconLoadBalancer,
  publicIp: iconPublicIp,
  natGateway: iconNatGateway,
  networkInterface: iconNetworkInterface,
  bastion: iconBastion,
  database: iconStorage,
  gateway: iconVirtualMachine,
  virtualNetwork: iconVirtualMachine,
  subnet: iconFirewall,
  logicalGroup: iconStorage,
};

export const defaultNodeIcon = iconVirtualMachine;

export const getNodeIcon = (type: NodeType) => nodeIcons[type] ?? defaultNodeIcon;
