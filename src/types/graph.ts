import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import type { ResourceProfileData } from './profile';

export type NodeType =
  | 'vm'
  | 'firewall'
  | 'storage'
  | 'disk'
  | 'functionApp'
  | 'appService'
  | 'vmScaleSet'
  | 'containerInstance'
  | 'batchAccount'
  | 'kubernetesCluster'
  | 'loadBalancer'
  | 'applicationGateway'
  | 'publicIp'
  | 'natGateway'
  | 'expressRouteCircuit'
  | 'virtualNetworkGateway'
  | 'localNetworkGateway'
  | 'onPremisesNetworkGateway'
  | 'privateEndpoint'
  | 'routeTable'
  | 'networkInterface'
  | 'bastion'
  | 'networkSecurityGroup'
  | 'applicationSecurityGroup'
  | 'keyVault'
  | 'ddosProtection'
  | 'webApplicationFirewall'
  | 'dataLake'
  | 'azureFiles'
  | 'storageQueue'
  | 'azureSqlDatabase'
  | 'managedSqlInstance'
  | 'azureDatabaseForMySql'
  | 'azureDatabaseForMariaDb'
  | 'azureDatabaseForPostgreSql'
  | 'azureCosmosDb'
  | 'oracleDatabase'
  | 'apiManagement'
  | 'dataFactory'
  | 'eventGrid'
  | 'eventHub'
  | 'logicApp'
  | 'serviceBus'
  | 'automationAccount'
  | 'azureMonitor'
  | 'logAnalyticsWorkspace'
  | 'sentinelWorkspace'
  | 'database'
  | 'gateway';

export type GroupType = 'virtualNetwork' | 'subnet' | 'logicalGroup';

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  group: string;
  profile?: ResourceProfileData;
}

export interface NetworkLink {
  source: string;
  target: string;
  relation: string;
}

export interface CanvasGroup {
  id: string;
  type: GroupType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentGroupId?: string;
  profile?: ResourceProfileData;
}

export interface GroupLink {
  sourceGroupId: string;
  targetGroupId: string;
  relation: string;
}

export type SimulationNode = NetworkNode & SimulationNodeDatum;
export type SimulationLink = NetworkLink & SimulationLinkDatum<SimulationNode>;

export type NodePosition = { x: number; y: number };
export type NodePositionMap = Record<string, NodePosition>;
export type GroupPosition = { x: number; y: number };
export type GroupPositionMap = Record<string, GroupPosition>;
