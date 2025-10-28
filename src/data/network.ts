import type { NetworkLink, NetworkNode } from '../types/graph';

export const networkData = {
  nodes: [
    { id: 'fw-edge', label: 'Edge Firewall', type: 'firewall', group: 'Security' },
    { id: 'fw-internal', label: 'Core Firewall', type: 'firewall', group: 'Security' },
    { id: 'vm-web-1', label: 'Web Frontend VM', type: 'vm', group: 'Frontend' },
    { id: 'vm-web-2', label: 'Web Worker VM', type: 'vm', group: 'Frontend' },
    { id: 'vm-control', label: 'Control Plane VM', type: 'vm', group: 'Platform' },
    { id: 'vm-analytics', label: 'Analytics VM', type: 'vm', group: 'Data' },
    { id: 'storage-logs', label: 'Log Storage', type: 'storage', group: 'Observability' },
    { id: 'storage-lake', label: 'Data Lake Storage', type: 'storage', group: 'Data' },
  ],
  links: [
    { source: 'fw-edge', target: 'fw-internal', relation: 'chains' },
    { source: 'fw-edge', target: 'vm-web-1', relation: 'permits' },
    { source: 'fw-edge', target: 'vm-web-2', relation: 'permits' },
    { source: 'fw-internal', target: 'vm-control', relation: 'segments' },
    { source: 'fw-internal', target: 'vm-analytics', relation: 'segments' },
    { source: 'vm-web-1', target: 'storage-logs', relation: 'streams' },
    { source: 'vm-web-2', target: 'storage-logs', relation: 'streams' },
    { source: 'vm-analytics', target: 'storage-lake', relation: 'ingests' },
    { source: 'vm-control', target: 'storage-lake', relation: 'backups' },
    { source: 'storage-logs', target: 'storage-lake', relation: 'replicates' },
  ],
} satisfies { nodes: NetworkNode[]; links: NetworkLink[] };
