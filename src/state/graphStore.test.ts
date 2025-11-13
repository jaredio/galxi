import { beforeEach, describe, expect, it } from 'vitest';

import { useGraphStore } from './graphStore';

beforeEach(() => {
  useGraphStore.setState({
    nodes: [],
    links: [],
    groups: [],
    groupLinks: [],
  });
});

describe('graph store', () => {
  it('updates nodes via setter helpers', () => {
    const { setNodes } = useGraphStore.getState();
    setNodes(() => [{ id: 'node-1', label: 'Node 1', type: 'vm', group: '' }]);
    expect(useGraphStore.getState().nodes).toHaveLength(1);
  });

  it('replaceGraph hydrates missing profiles', () => {
    const payload = {
      nodes: [{ id: 'node-1', label: 'Node 1', type: 'vm', group: '' }],
      links: [],
      groups: [{ id: 'group-1', title: 'Group', type: 'virtualNetwork', x: 0, y: 0, width: 100, height: 100 }],
      groupLinks: [],
    };
    useGraphStore.getState().replaceGraph(payload);
    const { nodes, groups } = useGraphStore.getState();
    expect(nodes[0].profile).toBeDefined();
    expect(groups[0].profile).toBeDefined();
  });
});
