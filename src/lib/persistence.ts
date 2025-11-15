/**
 * Data persistence utilities using localStorage
 * Provides save/load functionality for graph data
 */

import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  NodeType,
} from '../types/graph';
import { logger } from './logger';

const STORAGE_KEY = 'galxi-graph-data';
const STORAGE_VERSION = 2;

const LEGACY_NODE_TYPE_MAP: Record<string, NodeType> = {
  gateway: 'applicationGateway',
};

const migrateLegacyNodeTypes = (nodes: NetworkNode[]) => {
  const replacements: Record<string, number> = {};
  const migrated = nodes.map((node) => {
    const legacyType = LEGACY_NODE_TYPE_MAP[(node as NetworkNode & { type: string }).type];
    if (!legacyType) {
      return node;
    }
    const legacyKey = (node as NetworkNode & { type: string }).type;
    replacements[legacyKey] = (replacements[legacyKey] ?? 0) + 1;
    return { ...node, type: legacyType };
  });
  if (Object.keys(replacements).length > 0) {
    logger.warn('Replaced legacy node types with supported equivalents', { replacements });
  }
  return migrated;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNodePositionMap = (value: unknown): value is NodePositionMap => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (coords) =>
      isRecord(coords) &&
      typeof coords.x === 'number' &&
      Number.isFinite(coords.x) &&
      typeof coords.y === 'number' &&
      Number.isFinite(coords.y)
  );
};

const isNetworkNode = (value: unknown): value is NetworkNode => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.label === 'string' &&
    (typeof value.group === 'string' || typeof value.group === 'undefined')
  );
};

const isNetworkLink = (value: unknown): value is NetworkLink => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.source === 'string' &&
    typeof value.target === 'string' &&
    typeof value.relation === 'string'
  );
};

const isCanvasGroup = (value: unknown): value is CanvasGroup => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.title === 'string' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  );
};

const isGroupLink = (value: unknown): value is GroupLink => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.sourceGroupId === 'string' &&
    typeof value.targetGroupId === 'string' &&
    typeof value.relation === 'string'
  );
};

const isGraphDataPayload = (value: unknown): value is GraphData => {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.version !== 'number' || typeof value.timestamp !== 'string') {
    return false;
  }
  if (
    !Array.isArray(value.nodes) ||
    !value.nodes.every(isNetworkNode) ||
    !Array.isArray(value.links) ||
    !value.links.every(isNetworkLink)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.groups) ||
    !value.groups.every(isCanvasGroup) ||
    !Array.isArray(value.groupLinks) ||
    !value.groupLinks.every(isGroupLink)
  ) {
    return false;
  }
  if (!isNodePositionMap(value.nodePositions ?? {})) {
    return false;
  }
  if (!isNodePositionMap(value.groupPositions ?? {})) {
    return false;
  }
  return true;
};

export type GraphData = {
  version: number;
  timestamp: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
  nodePositions: NodePositionMap;
  groupPositions: GroupPositionMap;
};

/**
 * Saves graph data to localStorage
 */
export const saveGraph = (data: {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
  nodePositions: NodePositionMap;
  groupPositions: GroupPositionMap;
}): boolean => {
  try {
    const graphData: GraphData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      ...data,
    };

    const serialized = JSON.stringify(graphData);
    localStorage.setItem(STORAGE_KEY, serialized);

    logger.debug('Graph data saved to localStorage', {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
      groupCount: data.groups.length,
      nodePositions: Object.keys(data.nodePositions).length,
      groupPositions: Object.keys(data.groupPositions).length,
    });

    return true;
  } catch (error) {
    logger.error('Failed to save graph data', error as Error, {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
    });
    return false;
  }
};

/**
 * Loads graph data from localStorage
 */
export const loadGraph = (): GraphData | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);

    if (!serialized) {
      logger.debug('No saved graph data found');
      return null;
    }

    const parsed = JSON.parse(serialized) as unknown;

    if (!isGraphDataPayload(parsed)) {
      logger.warn('Saved graph data failed validation, ignoring payload');
      return null;
    }

    const normalizedNodes = migrateLegacyNodeTypes(parsed.nodes);

    const data: GraphData = {
      ...parsed,
      nodes: normalizedNodes,
      nodePositions: parsed.nodePositions ?? {},
      groupPositions: parsed.groupPositions ?? {},
    };

    // Validate version
    if (data.version > STORAGE_VERSION) {
      logger.warn('Graph data version is newer than supported, ignoring saved data', {
        savedVersion: data.version,
        currentVersion: STORAGE_VERSION,
      });
      return null;
    }
    if (data.version < STORAGE_VERSION) {
      logger.info('Upgrading graph data from older version', {
        savedVersion: data.version,
        currentVersion: STORAGE_VERSION,
      });
    }

    logger.info('Graph data loaded from localStorage', {
      nodeCount: data.nodes?.length || 0,
      linkCount: data.links?.length || 0,
      groupCount: data.groups?.length || 0,
      timestamp: data.timestamp,
    });

    return {
      ...data,
      version: STORAGE_VERSION,
      nodePositions: data.nodePositions ?? {},
      groupPositions: data.groupPositions ?? {},
    };
  } catch (error) {
    logger.error('Failed to load graph data', error as Error);
    return null;
  }
};

/**
 * Clears saved graph data
 */
export const clearGraph = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.info('Graph data cleared from localStorage');
    return true;
  } catch (error) {
    logger.error('Failed to clear graph data', error as Error);
    return false;
  }
};

/**
 * Checks if there is saved graph data
 */
export const hasSavedGraph = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

/**
 * Debounce utility for auto-saving
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};
