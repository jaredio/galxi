import type { NetworkLink, SimulationLink, SimulationNode } from '../types/graph';

export const shortenSegment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  startPadding: number,
  endPadding: number
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  return {
    sx: x1 + ux * startPadding,
    sy: y1 + uy * startPadding,
    tx: x2 - ux * endPadding,
    ty: y2 - uy * endPadding,
  };
};

export const resolveAxis = (
  point: SimulationLink['source'] | SimulationLink['target'],
  axis: 'x' | 'y'
): number => {
  if (typeof point === 'object' && point !== null) {
    const nodePoint = point as SimulationNode;
    const value = nodePoint[axis];
    return typeof value === 'number' ? value : 0;
  }
  return 0;
};

export const resolveId = (point: SimulationLink['source'] | SimulationLink['target']): string => {
  if (typeof point === 'object' && point !== null) {
    return (point as SimulationNode).id;
  }
  return String(point);
};

const resolveEndpointId = (
  endpoint: SimulationLink['source'] | SimulationLink['target'] | string
): string => {
  if (typeof endpoint === 'object') {
    return (endpoint as SimulationNode).id;
  }
  return String(endpoint);
};

export const makeLinkKey = (link: SimulationLink | NetworkLink): string =>
  `${resolveEndpointId(link.source)}->${resolveEndpointId(link.target)}`;

export const makeEdgeKey = (link: SimulationLink): string => makeLinkKey(link);

export const linkTouchesNode = (link: SimulationLink, nodeId: string | null): boolean => {
  if (!nodeId) {
    return false;
  }

  const sourceId = resolveId(link.source);
  const targetId = resolveId(link.target);

  return sourceId === nodeId || targetId === nodeId;
};
