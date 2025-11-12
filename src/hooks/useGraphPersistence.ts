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
  notify?: (message: string) => void;
  onRestore?: (data: GraphData) => void;
};

export const useGraphPersistence = ({
  nodes,
  links,
  groups,
  groupLinks,
  nodePositionsRef,
  groupPositionsRef,
  replaceGraph,
  notify,
  onRestore,
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
    },
    [groupPositionsRef, nodePositionsRef, onRestore, replaceGraph]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      setReady(true);
      return;
    }
    const restored = loadGraph();
    if (restored) {
      logger.info('Restored graph session from persistence', {
        nodes: restored.nodes.length,
        links: restored.links.length,
        groups: restored.groups.length,
        restoredAt: restored.timestamp,
      });
      handleRestore(restored);
    }
    setReady(true);
  }, [handleRestore]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    autosaveCallbackRef.current = debounce((payload) => {
      const success = saveGraph(payload);
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
  }, [notify]);

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
  }, [ready, nodes, links, groups, groupLinks, nodePositionsRef, groupPositionsRef]);
};
