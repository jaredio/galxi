import type { CanvasGroup, GroupLink, GroupType, NetworkLink, NetworkNode, NodeType } from '../types/graph';
import { isActiveStatus, isInactiveStatus, normalizeStatusValue } from './status';

export type CanvasData = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
};

export type DashboardData = {
  totals: {
    nodes: number;
    groups: number;
    connections: number;
    nodeLinks: number;
    groupLinks: number;
    activeNodes: number;
    inactiveNodes: number;
    unknownNodes: number;
  };
  nodeTypeBreakdown: Array<{ type: NodeType; count: number }>;
  groupTypeBreakdown: Array<{ type: GroupType; count: number }>;
};

export const generateDashboardSummary = ({ nodes, groups, links, groupLinks }: CanvasData): DashboardData => {
  const nodeTypeCounts = new Map<NodeType, number>();
  const groupTypeCounts = new Map<GroupType, number>();

  let activeNodes = 0;
  let inactiveNodes = 0;

  nodes.forEach((node) => {
    nodeTypeCounts.set(node.type, (nodeTypeCounts.get(node.type) ?? 0) + 1);
    const status = normalizeStatusValue(node.profile?.['overview.status']);
    if (isActiveStatus(status)) {
      activeNodes += 1;
    } else if (isInactiveStatus(status)) {
      inactiveNodes += 1;
    }
  });

  groups.forEach((group) => {
    groupTypeCounts.set(group.type, (groupTypeCounts.get(group.type) ?? 0) + 1);
  });

  const nodeTypeBreakdown = Array.from(nodeTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const groupTypeBreakdown = Array.from(groupTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const totals = {
    nodes: nodes.length,
    groups: groups.length,
    connections: links.length + groupLinks.length,
    nodeLinks: links.length,
    groupLinks: groupLinks.length,
    activeNodes,
    inactiveNodes,
    unknownNodes: Math.max(nodes.length - activeNodes - inactiveNodes, 0),
  };

  return {
    totals,
    nodeTypeBreakdown,
    groupTypeBreakdown,
  };
};
