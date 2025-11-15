import { beforeEach, describe, expect, it } from 'vitest';

import { clearGraph, hasSavedGraph, loadGraph, saveGraph } from './persistence';

type StoreRecord = Record<string, string>;

class MemoryStorage implements Storage {
  private store: StoreRecord = {};

  get length() {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

const STORAGE_KEY = 'galxi-graph-data';

const sampleGraph = () => ({
  nodes: [{ id: 'node-1', label: 'Node 1', type: 'vm', group: '' }],
  links: [{ source: 'node-1', target: 'node-1', relation: 'self' }],
  groups: [
    {
      id: 'group-1',
      type: 'virtualNetwork',
      title: 'Group 1',
      x: 0,
      y: 0,
      width: 400,
      height: 400,
    },
  ],
  groupLinks: [],
  nodePositions: { 'node-1': { x: 0, y: 0 } },
  groupPositions: { 'group-1': { x: 0, y: 0 } },
});

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
  clearGraph();
});

describe('persistence helpers', () => {
  it('saves and loads the current graph', () => {
    const graph = sampleGraph();
    expect(saveGraph(graph)).toBe(true);
    expect(hasSavedGraph()).toBe(true);

    const loaded = loadGraph();
    expect(loaded).not.toBeNull();
    expect(loaded?.nodes).toHaveLength(graph.nodes.length);
    expect(loaded?.links[0]).toMatchObject(graph.links[0]);
    expect(loaded?.nodePositions['node-1']).toEqual({ x: 0, y: 0 });
  });

  it('returns null when payload fails validation', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(loadGraph()).toBeNull();
  });

  it('ignores version mismatches', () => {
    const graph = sampleGraph();
    const payload = { ...graph, version: 999, timestamp: new Date().toISOString() };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    expect(loadGraph()).toBeNull();
  });

  it('migrates legacy gateway node types to applicationGateway', () => {
    const graph = sampleGraph();
    graph.nodes[0].type = 'gateway' as unknown as typeof graph.nodes[number]['type'];
    const payload = { ...graph, version: 1, timestamp: new Date().toISOString() };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    const loaded = loadGraph();
    expect(loaded?.nodes[0].type).toBe('applicationGateway');
  });
});
