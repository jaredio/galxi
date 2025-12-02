import { useGraphStore } from '../../state/graphStore';

export const useAppStateSlices = () => {
  const nodes = useGraphStore((state) => state.nodes);
  const links = useGraphStore((state) => state.links);
  const groupLinks = useGraphStore((state) => state.groupLinks);
  const groups = useGraphStore((state) => state.groups);
  const drawings = useGraphStore((state) => state.drawings);
  const setNodes = useGraphStore((state) => state.setNodes);
  const setLinks = useGraphStore((state) => state.setLinks);
  const setGroupLinks = useGraphStore((state) => state.setGroupLinks);
  const setGroups = useGraphStore((state) => state.setGroups);
  const setDrawings = useGraphStore((state) => state.setDrawings);
  const replaceGraph = useGraphStore((state) => state.replaceGraph);

  return {
    nodes,
    links,
    groupLinks,
    groups,
    drawings,
    setNodes,
    setLinks,
    setGroupLinks,
    setGroups,
    setDrawings,
    replaceGraph,
  };
};
