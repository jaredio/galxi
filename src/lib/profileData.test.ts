
import { describe, expect, it } from 'vitest';

import { buildGroupProfileContent, buildNodeProfileContent } from './profileData';
import type { CanvasGroup, GroupLink, NetworkLink, NetworkNode } from '../types/graph';
import type { ResourceProfileData } from '../types/profile';

const makeNode = (overrides: Partial<NetworkNode>): NetworkNode => ({
  id: 'node-1',
  label: 'App Gateway',
  type: 'applicationGateway',
  group: 'group-2',
  profile: {},
  ...overrides,
});

const makeGroup = (overrides: Partial<CanvasGroup>): CanvasGroup => ({
  id: 'group-1',
  type: 'virtualNetwork',
  title: 'Prod VNet',
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  ...overrides,
});

describe('profileData builders', () => {
  it('buildNodeProfileContent includes placement and connection summaries', () => {
    const subnet = makeGroup({
      id: 'group-2',
      type: 'subnet',
      title: 'App Subnet',
      parentGroupId: 'group-1',
    });
    const nodeProfile: ResourceProfileData = {
      'arm.provisioningState': 'Running',
      'arm.location': 'eastus',
    };
    const targetNode = makeNode({ profile: nodeProfile });
    const peerNode: NetworkNode = {
      id: 'node-2',
      label: 'Backend VM',
      type: 'vm',
      group: 'group-2',
    };
    const links: NetworkLink[] = [
      { source: targetNode.id, target: peerNode.id, relation: 'routes to' },
    ];

    const content = buildNodeProfileContent(targetNode, {
      nodes: [targetNode, peerNode],
      groups: [makeGroup({ id: 'group-1' }), subnet],
      links,
      groupLinks: [],
    });

    expect(content.title).toBe('App Gateway');
    expect(content.status?.label).toBe('Running');

    const placementSection = content.connections?.find((section) => section.id === 'placement');
    expect(placementSection).toBeTruthy();
    expect(placementSection?.items.map((item) => item.label)).toEqual([
      'Prod VNet',
      'App Subnet',
    ]);

    const nodeConnections = content.connections?.find(
      (section) => section.id === 'connections'
    );
    expect(nodeConnections).toBeTruthy();
    expect(nodeConnections?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Backend VM',
          subtitle: 'routes to',
          badge: 'Outgoing',
        }),
      ])
    );
  });

  it('buildGroupProfileContent surfaces child resources and group links', () => {
    const parentGroup = makeGroup({});
    const childGroup = makeGroup({
      id: 'group-2',
      type: 'logicalGroup',
      title: 'Security Zone',
      parentGroupId: parentGroup.id,
    });
    const memberNode: NetworkNode = {
      id: 'node-3',
      label: 'Firewall',
      type: 'firewall',
      group: parentGroup.id,
    };
    const peerGroup: CanvasGroup = makeGroup({
      id: 'group-3',
      title: 'Shared Services',
    });
    const groupLinks: GroupLink[] = [
      {
        sourceGroupId: parentGroup.id,
        targetGroupId: peerGroup.id,
        relation: 'peered with',
      },
    ];

    const content = buildGroupProfileContent(parentGroup, {
      nodes: [memberNode],
      groups: [parentGroup, childGroup, peerGroup],
      links: [],
      groupLinks,
    });

    expect(content.title).toBe('Prod VNet');

    const childGroups = content.connections?.find((section) => section.id === 'child-groups');
    expect(childGroups?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Security Zone' })])
    );

    const memberResources = content.connections?.find(
      (section) => section.id === 'member-nodes'
    );
    expect(memberResources?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Firewall' })])
    );

    const groupConnections = content.connections?.find(
      (section) => section.id === 'group-connections'
    );
    expect(groupConnections?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Shared Services',
          subtitle: 'peered with',
          badge: 'Outgoing',
        }),
      ])
    );
  });
});
