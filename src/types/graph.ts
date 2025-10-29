import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3';

export type NodeType =
  | 'vm'
  | 'firewall'
  | 'storage'
  | 'database'
  | 'gateway'
  | 'virtualNetwork'
  | 'subnet'
  | 'logicalGroup';

export interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  group: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  relation: string;
}

export type SimulationNode = NetworkNode & SimulationNodeDatum;
export type SimulationLink = NetworkLink & SimulationLinkDatum<SimulationNode>;

export type NodePosition = { x: number; y: number };
export type NodePositionMap = Record<string, NodePosition>;
