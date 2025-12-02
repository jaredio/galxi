/**
 * Data persistence utilities using localStorage
 * Provides save/load functionality for graph data
 */

import type {
  CanvasGroup,
  CanvasDrawing,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
  NodeType,
} from '../types/graph';
import type { Theme } from '../constants/theme';
import { logger } from './logger';

const STORAGE_KEY_PREFIX = 'galxi-graph-data';
export const STORAGE_VERSION = 2;

const makeStorageKey = (workspaceId?: string) =>
  workspaceId ? `${STORAGE_KEY_PREFIX}:${workspaceId}` : STORAGE_KEY_PREFIX;

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

const isCanvasDrawing = (value: unknown): value is CanvasDrawing => {
  if (!isRecord(value)) {
    return false;
  }
  const baseOk = typeof value.id === 'string' && typeof value.type === 'string';
  if (!baseOk) {
    return false;
  }
  if (value.points && !Array.isArray(value.points)) {
    return false;
  }
  if (Array.isArray(value.points)) {
    const pointsValid = value.points.every(
      (point) =>
        isRecord(point) &&
        typeof point.x === 'number' &&
        Number.isFinite(point.x) &&
        typeof point.y === 'number' &&
        Number.isFinite(point.y)
    );
    if (!pointsValid) {
      return false;
    }
  }
  return true;
};

const isTheme = (value: unknown): value is Theme => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.accent === 'string' &&
    typeof value.accentHover === 'string' &&
    typeof value.background === 'string' &&
    typeof value.surface === 'string' &&
    typeof value.hover === 'string' &&
    typeof value.edge === 'string' &&
    typeof value.textPrimary === 'string' &&
    typeof value.textSecondary === 'string' &&
    typeof value.nodeFill === 'string' &&
    typeof value.nodeBorder === 'string' &&
    typeof value.nodeGlow === 'string' &&
    typeof value.iconAccent === 'string'
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
  if (value.theme && !isTheme(value.theme)) {
    return false;
  }
  if (value.drawings && !Array.isArray(value.drawings)) {
    return false;
  }
  if (Array.isArray(value.drawings) && !value.drawings.every(isCanvasDrawing)) {
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
  drawings?: CanvasDrawing[];
  theme?: Theme;
};

/**
 * Saves graph data to localStorage
 */
export const saveGraph = (
  data: {
    nodes: NetworkNode[];
    links: NetworkLink[];
    groups: CanvasGroup[];
    groupLinks: GroupLink[];
    nodePositions: NodePositionMap;
    groupPositions: GroupPositionMap;
    drawings?: CanvasDrawing[];
    theme?: Theme;
  },
  workspaceId?: string
): boolean => {
  try {
    const graphData: GraphData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      ...data,
    };

    const serialized = JSON.stringify(graphData);
    localStorage.setItem(makeStorageKey(workspaceId), serialized);

    logger.debug('Graph data saved to localStorage', {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
      groupCount: data.groups.length,
      drawingCount: data.drawings?.length ?? 0,
      nodePositions: Object.keys(data.nodePositions).length,
      groupPositions: Object.keys(data.groupPositions).length,
    });

    return true;
  } catch (error) {
    logger.error('Failed to save graph data', error as Error, {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
      drawingCount: data.drawings?.length ?? 0,
    });
    return false;
  }
};

/**
 * Loads graph data from localStorage
 */
export const loadGraph = (workspaceId?: string): GraphData | null => {
  try {
    const serialized = localStorage.getItem(makeStorageKey(workspaceId));

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
      drawingCount: data.drawings?.length || 0,
      timestamp: data.timestamp,
    });

    return {
      ...data,
      version: STORAGE_VERSION,
      nodePositions: data.nodePositions ?? {},
      groupPositions: data.groupPositions ?? {},
      drawings: data.drawings ?? [],
      theme: data.theme,
    };
  } catch (error) {
    logger.error('Failed to load graph data', error as Error);
    return null;
  }
};

/**
 * Clears saved graph data
 */
export const clearGraph = (workspaceId?: string): boolean => {
  try {
    localStorage.removeItem(makeStorageKey(workspaceId));
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
export const hasSavedGraph = (workspaceId?: string): boolean => {
  try {
    return localStorage.getItem(makeStorageKey(workspaceId)) !== null;
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
