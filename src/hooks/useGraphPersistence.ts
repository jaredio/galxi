import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type {
  CanvasGroup,
  GroupLink,
  GroupPositionMap,
  NetworkLink,
  NetworkNode,
  NodePositionMap,
} from '../types/graph';
import { debounce, loadGraph, saveGraph, type GraphData } from '../lib/persistence';
import { logger } from '../lib/logger';
import type { Theme } from '../constants/theme';

type PersistencePayload = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: CanvasGroup[];
  groupLinks: GroupLink[];
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
    if (typeof window === 'undefined') {
      setReady(true);
      return;
    }
    const restored = loadGraph(workspaceId);
    if (restored) {
      logger.info('Restored graph session from persistence', {
        nodes: restored.nodes.length,
        links: restored.links.length,
        groups: restored.groups.length,
        restoredAt: restored.timestamp,
      });
      handleRestore(restored);
      setReady(true);
      return;
    }
    replaceGraph({ nodes: [], links: [], groups: [], groupLinks: [] });
    nodePositionsRef.current = {};
    groupPositionsRef.current = {};
    setReady(true);
  }, [groupPositionsRef, handleRestore, nodePositionsRef, replaceGraph, workspaceId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    autosaveCallbackRef.current = debounce((payload) => {
      const success = saveGraph({ ...payload, theme }, workspaceId);
      if (!success) {
        if (!autosaveErrorRef.current) {
          autosaveErrorRef.current = true;
          notify?.('Autosave failed. Check console logs.');
        }
        return;
      }
      if (autosaveErrorRef.current) {
        autosaveErrorRef.current = false;
        notify?.('Autosave recovered.');
      }
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
    });
  }, [ready, nodes, links, groups, groupLinks, nodePositionsRef, groupPositionsRef, layoutVersion]);
};
