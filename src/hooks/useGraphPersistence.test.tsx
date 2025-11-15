import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { StrictMode, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGraphPersistence } from './useGraphPersistence';
import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode, NodePositionMap, GroupPositionMap } from '../types/graph';

const persistenceMocks = vi.hoisted(() => {
  const saveGraphMock = vi.fn(() => true);
  const loadGraphMock = vi.fn(() => null);
  const debounceMock = vi.fn(<T extends (...args: any[]) => void>(fn: T) => {
    return (...args: Parameters<T>) => {
      fn(...args);
    };
  });
  return { saveGraphMock, loadGraphMock, debounceMock };
});

vi.mock('../lib/persistence', () => ({
  saveGraph: persistenceMocks.saveGraphMock,
  loadGraph: persistenceMocks.loadGraphMock,
  debounce: persistenceMocks.debounceMock,
}));

const nodes: NetworkNode[] = [];
const links: NetworkLink[] = [];
const groups: CanvasGroup[] = [];
const groupLinks: GroupLink[] = [];

const TestHarness = ({ layoutVersion }: { layoutVersion: number }) => {
  const nodePositionsRef = useRef<NodePositionMap>({});
  const groupPositionsRef = useRef<GroupPositionMap>({});

  useGraphPersistence({
    nodes,
    links,
    groups,
    groupLinks,
    nodePositionsRef,
    groupPositionsRef,
    replaceGraph: vi.fn(),
    layoutVersion,
  });

  return null;
};

describe('useGraphPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves when only the layout version changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <StrictMode>
          <TestHarness layoutVersion={0} />
        </StrictMode>
      );
    });

    expect(persistenceMocks.saveGraphMock).toHaveBeenCalledTimes(1);

    act(() => {
      root.render(
        <StrictMode>
          <TestHarness layoutVersion={1} />
        </StrictMode>
      );
    });

    expect(persistenceMocks.saveGraphMock).toHaveBeenCalledTimes(2);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
