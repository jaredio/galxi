/**
 * Data persistence utilities using localStorage
 * Provides save/load functionality for graph data
 */

import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../types/graph';
import { logger } from './logger';

const STORAGE_KEY = 'galxi-graph-data';
const STORAGE_VERSION = 1;

export type GraphData = {
  version: number;
  timestamp: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
};

/**
 * Saves graph data to localStorage
 */
export const saveGraph = (data: {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
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

    const data = JSON.parse(serialized) as GraphData;

    // Validate version
    if (data.version !== STORAGE_VERSION) {
      logger.warn('Graph data version mismatch, ignoring saved data', {
        savedVersion: data.version,
        currentVersion: STORAGE_VERSION,
      });
      return null;
    }

    logger.info('Graph data loaded from localStorage', {
      nodeCount: data.nodes?.length || 0,
      linkCount: data.links?.length || 0,
      groupCount: data.groups?.length || 0,
      timestamp: data.timestamp,
    });

    return data;
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
