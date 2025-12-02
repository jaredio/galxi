import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type {
  CanvasDrawing,
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
} from '../types/graph';
import { debounce, type GraphData } from '../lib/persistence';
import { logger } from '../lib/logger';
import type { Theme } from '../constants/theme';
import { getWorkspace, saveWorkspace, type ApiDrawing } from '../lib/api';

type PersistencePayload = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
  drawings?: CanvasDrawing[];
};

type UseGraphPersistenceOptions = PersistencePayload & {
  nodePositionsRef: MutableRefObject<NodePositionMap>;
  groupPositionsRef: MutableRefObject<GroupPositionMap>;
  replaceGraph: (payload: PersistencePayload) => void;
  layoutVersion?: number;
  notify?: (message: string) => void;
  onRestore?: (data: GraphData) => void;
  workspaceId?: string;
  onThemeRestore?: (theme: Theme) => void;
  theme?: Theme;
};

export const useGraphPersistence = ({
  nodes,
  links,
  groups,
  groupLinks,
  drawings = [],
  nodePositionsRef,
  groupPositionsRef,
  replaceGraph,
  layoutVersion = 0,
  notify,
  onRestore,
  workspaceId,
  onThemeRestore,
  theme,
}: UseGraphPersistenceOptions) => {
  const [ready, setReady] = useState(false);
  const autosaveCallbackRef = useRef<
    | null
    | ((payload: {
        nodes: NetworkNode[];
        links: NetworkLink[];
        groups: CanvasGroup[];
        groupLinks: GroupLink[];
        nodePositions: NodePositionMap;
        groupPositions: GroupPositionMap;
        drawings?: CanvasDrawing[];
      }) => void)
  >(null);
  const autosaveErrorRef = useRef(false);

  const handleRestore = useCallback(
    (data: GraphData) => {
      replaceGraph({
        nodes: data.nodes,
        links: data.links,
        groups: data.groups,
        groupLinks: data.groupLinks,
        drawings: data.drawings as CanvasDrawing[] | undefined,
      });
      nodePositionsRef.current = data.nodePositions ?? {};
      groupPositionsRef.current = data.groupPositions ?? {};
      onRestore?.(data);
      if (data.theme) {
        onThemeRestore?.(data.theme);
      }
    },
    [groupPositionsRef, nodePositionsRef, onRestore, onThemeRestore, replaceGraph]
  );

  useEffect(() => {
    let cancelled = false;
    const restoreFromBackend = async () => {
      if (!workspaceId) {
        replaceGraph({ nodes: [], links: [], groups: [], groupLinks: [], drawings: [] });
        nodePositionsRef.current = {};
        groupPositionsRef.current = {};
        setReady(true);
        return;
      }
      try {
        const data = await getWorkspace(workspaceId);
        if (cancelled) return;
        const restored: GraphData = {
          version: 1,
          nodes: data.nodes as NetworkNode[],
          links: data.links as unknown as NetworkLink[],
          groups: data.groups as CanvasGroup[],
          groupLinks: [],
          nodePositions: {},
          groupPositions: {},
          drawings: (data.drawings as ApiDrawing[]) ?? [],
          timestamp: new Date().toISOString(),
        };
        logger.info('Restored graph from backend', {
          nodes: restored.nodes.length,
          links: restored.links.length,
          groups: restored.groups.length,
        });
        handleRestore(restored);
      } catch (err) {
        logger.error('Failed to load workspace from backend', err as Error);
        replaceGraph({ nodes: [], links: [], groups: [], groupLinks: [], drawings: [] });
        nodePositionsRef.current = {};
        groupPositionsRef.current = {};
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };
    restoreFromBackend();
    return () => {
      cancelled = true;
    };
  }, [groupPositionsRef, handleRestore, nodePositionsRef, replaceGraph, workspaceId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    autosaveCallbackRef.current = debounce((payload) => {
      if (!workspaceId) return;
      saveWorkspace(workspaceId, {
        nodes: payload.nodes,
        groups: payload.groups,
        links: payload.links,
        drawings: payload.drawings ?? [],
        name: undefined,
      })
        .then(() => {
          if (autosaveErrorRef.current) {
            autosaveErrorRef.current = false;
            notify?.('Autosave recovered.');
          }
        })
        .catch((err) => {
          logger.error('Autosave failed', err as Error);
          if (!autosaveErrorRef.current) {
            autosaveErrorRef.current = true;
            notify?.('Autosave failed. Check console logs.');
          }
        });
    }, 1200);

    return () => {
      autosaveCallbackRef.current = null;
    };
  }, [notify, theme, workspaceId]);

  useEffect(() => {
    if (!ready || !autosaveCallbackRef.current) {
      return;
    }
    autosaveCallbackRef.current({
      nodes,
      links,
      groups,
      groupLinks,
      nodePositions: { ...nodePositionsRef.current },
      groupPositions: { ...groupPositionsRef.current },
      drawings,
    });
  }, [ready, nodes, links, groups, groupLinks, drawings, nodePositionsRef, groupPositionsRef, layoutVersion]);
};
