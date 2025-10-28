import { nodeTypeOptions } from './nodeOptions';
import type { NodeType } from '../types/graph';

export const nodeTypeLabelMap = Object.fromEntries(
  nodeTypeOptions.map(({ value, label }) => [value, label] as const)
) as Record<NodeType, string>;
