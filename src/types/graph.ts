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
  ;

export type GroupType = 'virtualNetwork' | 'subnet' | 'logicalGroup';
export type DrawingTool = 'rect' | 'circle' | 'pen' | 'text' | 'eraser' | 'hand';

export type CanvasDrawing = {
  id: string;
  type: 'rect' | 'circle' | 'pen' | 'text' | 'eraser';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: { x: number; y: number }[];
  text?: string;
  size?: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
};

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
