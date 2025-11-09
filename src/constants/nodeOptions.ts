import type { NodeType } from '../types/graph';

export type NodeTypeCategory =
  | 'compute'
  | 'network'
  | 'security'
  | 'storage'
  | 'database'
  | 'integration'
  | 'monitoring';

export type NodeTypeOption = {
  value: NodeType;
  label: string;
  description: string;
  category: NodeTypeCategory;
};

export const nodeTypeCategoryOrder: NodeTypeCategory[] = [
  'compute',
  'network',
  'security',
  'storage',
  'database',
  'integration',
  'monitoring',
];

export const nodeTypeCategoryLabels: Record<NodeTypeCategory, string> = {
  compute: 'Compute',
  network: 'Networking',
  security: 'Security',
  storage: 'Storage',
  database: 'Databases',
  integration: 'Integration',
  monitoring: 'Monitoring',
};

export const nodeTypeOptions: NodeTypeOption[] = [
  {
    value: 'vm',
    label: 'Virtual Machine',
    description: 'General purpose compute workloads, Windows/Linux VMs.',
    category: 'compute',
  },
  {
    value: 'vmScaleSet',
    label: 'VM Scale Set',
    description: 'Elastic set of identical VMs with managed scaling.',
    category: 'compute',
  },
  {
    value: 'appService',
    label: 'App Service',
    description: 'Managed web apps and APIs running on App Service Plans.',
    category: 'compute',
  },
  {
    value: 'functionApp',
    label: 'Function App',
    description: 'Serverless runtimes for background jobs and APIs.',
    category: 'compute',
  },
  {
    value: 'containerInstance',
    label: 'Container Instance',
    description: 'Azure Container Instances (ACI) for single-container workloads.',
    category: 'compute',
  },
  {
    value: 'batchAccount',
    label: 'Batch Account',
    description: 'Azure Batch accounts for large-scale batch compute jobs.',
    category: 'compute',
  },
  {
    value: 'kubernetesCluster',
    label: 'Kubernetes Cluster',
    description: 'Managed Azure Kubernetes Service (AKS) cluster.',
    category: 'compute',
  },
  {
    value: 'loadBalancer',
    label: 'Load Balancer',
    description: 'Distribute traffic across services and expose public endpoints.',
    category: 'network',
  },
  {
    value: 'applicationGateway',
    label: 'Application Gateway',
    description: 'Layer 7 load balancer with routing and WAF features.',
    category: 'network',
  },
  {
    value: 'publicIp',
    label: 'Public IP',
    description: 'Static or dynamic public IP addresses for ingress.',
    category: 'network',
  },
  {
    value: 'natGateway',
    label: 'NAT Gateway',
    description: 'Outbound internet access for private resources.',
    category: 'network',
  },
  {
    value: 'expressRouteCircuit',
    label: 'ExpressRoute Circuit',
    description: 'Private connection between Azure and on-premises networks.',
    category: 'network',
  },
  {
    value: 'virtualNetworkGateway',
    label: 'Virtual Network Gateway',
    description: 'Gateway for VPN/ExpressRoute connections to a virtual network.',
    category: 'network',
  },
  {
    value: 'localNetworkGateway',
    label: 'Local Network Gateway',
    description: 'Represents on-premises VPN devices and address spaces.',
    category: 'network',
  },
  {
    value: 'onPremisesNetworkGateway',
    label: 'On-Premises Network Gateway',
    description: 'Gateway modeling on-premises connectivity.',
    category: 'network',
  },
  {
    value: 'privateEndpoint',
    label: 'Private Endpoint',
    description: 'Private network access to a specific resource.',
    category: 'network',
  },
  {
    value: 'routeTable',
    label: 'Route Table',
    description: 'Custom routes applied to subnets.',
    category: 'network',
  },
  {
    value: 'networkInterface',
    label: 'Network Interface (NIC)',
    description: 'NICs attached to compute resources and subnets.',
    category: 'network',
  },
  {
    value: 'bastion',
    label: 'Bastion Host',
    description: 'Managed bastion service for secure RDP/SSH to VMs.',
    category: 'network',
  },
  {
    value: 'firewall',
    label: 'Firewall',
    description: 'Perimeter security for virtual networks and services.',
    category: 'security',
  },
  {
    value: 'networkSecurityGroup',
    label: 'Network Security Group',
    description: 'Control inbound/outbound traffic at subnet or NIC scope.',
    category: 'security',
  },
  {
    value: 'applicationSecurityGroup',
    label: 'Application Security Group',
    description: 'Group NICs for simplified NSG targeting.',
    category: 'security',
  },
  {
    value: 'keyVault',
    label: 'Key Vault',
    description: 'Store keys, secrets, and certificates for workloads.',
    category: 'security',
  },
  {
    value: 'ddosProtection',
    label: 'DDoS Protection Plan',
    description: 'Network-level protection against distributed attacks.',
    category: 'security',
  },
  {
    value: 'webApplicationFirewall',
    label: 'Web Application Firewall',
    description: 'Layer 7 firewall policies for Application Gateway or Front Door.',
    category: 'security',
  },
  {
    value: 'storage',
    label: 'Storage Account',
    description: 'Blob/File/Queue tables for application data.',
    category: 'storage',
  },
  {
    value: 'azureFiles',
    label: 'Azure Files',
    description: 'SMB/NFS shares served from Azure Files storage.',
    category: 'storage',
  },
  {
    value: 'dataLake',
    label: 'Data Lake Storage',
    description: 'Hierarchical data lake built on Storage Gen2 for analytics.',
    category: 'storage',
  },
  {
    value: 'storageQueue',
    label: 'Storage Queue',
    description: 'Durable queue messaging within a Storage Account.',
    category: 'storage',
  },
  {
    value: 'disk',
    label: 'Managed Disk',
    description: 'Premium/standard disks attached to compute.',
    category: 'storage',
  },
  {
    value: 'azureSqlDatabase',
    label: 'Azure SQL Database',
    description: 'Single databases or elastic pools on Azure SQL Database.',
    category: 'database',
  },
  {
    value: 'managedSqlInstance',
    label: 'SQL Managed Instance',
    description: 'Fully managed SQL Server instance for lift-and-shift workloads.',
    category: 'database',
  },
  {
    value: 'azureDatabaseForMySql',
    label: 'Azure Database for MySQL',
    description: 'Managed MySQL servers with built-in HA and scaling.',
    category: 'database',
  },
  {
    value: 'azureDatabaseForMariaDb',
    label: 'Azure Database for MariaDB',
    description: 'Managed MariaDB instances with automatic patching and backups.',
    category: 'database',
  },
  {
    value: 'azureDatabaseForPostgreSql',
    label: 'Azure Database for PostgreSQL',
    description: 'Flexible server for PostgreSQL workloads.',
    category: 'database',
  },
  {
    value: 'azureCosmosDb',
    label: 'Azure Cosmos DB',
    description: 'Globally distributed NoSQL with multiple data models.',
    category: 'database',
  },
  {
    value: 'oracleDatabase',
    label: 'Oracle Database Service',
    description: 'Oracle database workloads hosted on Azure.',
    category: 'database',
  },
  {
    value: 'apiManagement',
    label: 'API Management',
    description: 'Centralized API gateway with policies, analytics, and developer portal.',
    category: 'integration',
  },
  {
    value: 'dataFactory',
    label: 'Data Factory',
    description: 'Orchestrate data pipelines across services and regions.',
    category: 'integration',
  },
  {
    value: 'eventGrid',
    label: 'Event Grid Topic',
    description: 'Pub/sub routing for event-driven architectures.',
    category: 'integration',
  },
  {
    value: 'eventHub',
    label: 'Event Hubs',
    description: 'High-throughput streaming ingestion service.',
    category: 'integration',
  },
  {
    value: 'logicApp',
    label: 'Logic App',
    description: 'Workflow automation with managed connectors.',
    category: 'integration',
  },
  {
    value: 'serviceBus',
    label: 'Service Bus Namespace',
    description: 'Enterprise messaging with queues and topics.',
    category: 'integration',
  },
  {
    value: 'automationAccount',
    label: 'Automation Account',
    description: 'Runbooks, schedules, and hybrid workers for operations automation.',
    category: 'monitoring',
  },
  {
    value: 'azureMonitor',
    label: 'Azure Monitor',
    description: 'Unified metrics, logs, and alerts for Azure workloads.',
    category: 'monitoring',
  },
  {
    value: 'logAnalyticsWorkspace',
    label: 'Log Analytics Workspace',
    description: 'Central workspace for log collection, queries, and insights.',
    category: 'monitoring',
  },
  {
    value: 'sentinelWorkspace',
    label: 'Microsoft Sentinel',
    description: 'Cloud-native SIEM/SOAR built on Log Analytics.',
    category: 'monitoring',
  },
];
