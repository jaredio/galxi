import { describe, expect, it } from 'vitest';

import { applyParentAssignments } from './groupParenting';
import type { CanvasGroup } from '../types/graph';

const makeGroup = (overrides: Partial<CanvasGroup>): CanvasGroup => ({
  id: 'group',
  type: 'virtualNetwork',
  title: 'Group',
  x: 0,
  y: 0,
  width: 400,
  height: 400,
  ...overrides,
});

describe('applyParentAssignments', () => {
  it('assigns eligible parents based on spatial containment', () => {
    const parent = makeGroup({ id: 'parent', type: 'virtualNetwork' });
    const child = makeGroup({
      id: 'child',
      type: 'subnet',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });

    const result = applyParentAssignments([parent, child]);
    const updatedChild = result.find((group) => group.id === 'child');
    expect(updatedChild?.parentGroupId).toBe('parent');
  });

  it('leaves groups without a valid parent unchanged', () => {
    const loneGroup = makeGroup({ id: 'lone', type: 'logicalGroup' });
    const result = applyParentAssignments([loneGroup]);
    expect(result[0].parentGroupId).toBeUndefined();
  });
});
