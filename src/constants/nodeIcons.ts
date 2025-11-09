import type { NodeType } from '../types/graph';

const iconVirtualMachine = new URL('../../icons/nodes/compute/VirtualMachine.svg', import.meta.url).href;
const iconDisk = new URL('../../icons/nodes/storage/Disk.svg', import.meta.url).href;
const iconAppService = new URL('../../icons/nodes/compute/AppService.svg', import.meta.url).href;
const iconFirewall = new URL('../../icons/nodes/security/Firewall.svg', import.meta.url).href;
const iconStorage = new URL('../../icons/nodes/storage/StorageAccount.svg', import.meta.url).href;
const iconFunctionApp = new URL('../../icons/nodes/compute/FunctionApp.svg', import.meta.url).href;
const iconVmScaleSet = new URL('../../icons/nodes/compute/VMScaleSet.svg', import.meta.url).href;
const iconKubernetes = new URL('../../icons/nodes/compute/Kubernetes.svg', import.meta.url).href;
const iconContainerInstance = new URL('../../icons/nodes/compute/ContainerInstance.svg', import.meta.url).href;
const iconBatchAccount = new URL('../../icons/nodes/compute/BatchAccount.svg', import.meta.url).href;
const iconAzureFiles = new URL('../../icons/nodes/storage/AzureFiles.svg', import.meta.url).href;
const iconStorageQueue = new URL('../../icons/nodes/storage/StorageQueue.svg', import.meta.url).href;
const iconDataLake = new URL('../../icons/nodes/storage/DataLake.svg', import.meta.url).href;
const iconAzureSqlDatabase = new URL('../../icons/nodes/database/AzureSQLDatabase.svg', import.meta.url).href;
const iconManagedSqlInstance = new URL('../../icons/nodes/database/ManagedDatabaseInstance.svg', import.meta.url).href;
const iconAzureDatabaseMySql = new URL('../../icons/nodes/database/AzureDatabaseMySQLServer.svg', import.meta.url).href;
const iconAzureDatabaseMariaDb = new URL('../../icons/nodes/database/AzureDatabaseMariaDBServer.svg', import.meta.url).href;
const iconAzureDatabasePostgreSql = new URL('../../icons/nodes/database/AzureDataBasePostgreSQLServer.svg', import.meta.url).href;
const iconAzureCosmosDb = new URL('../../icons/nodes/database/AzureCosmosDB.svg', import.meta.url).href;
const iconOracleDatabase = new URL('../../icons/nodes/database/OracleDatabase.svg', import.meta.url).href;
const iconApiManagement = new URL('../../icons/nodes/integration/APIManagement.svg', import.meta.url).href;
const iconDataFactory = new URL('../../icons/nodes/integration/DataFactory.svg', import.meta.url).href;
const iconEventGrid = new URL('../../icons/nodes/integration/EventGrid.svg', import.meta.url).href;
const iconEventHub = new URL('../../icons/nodes/integration/EventHub.svg', import.meta.url).href;
const iconLogicApp = new URL('../../icons/nodes/integration/LogicApp.svg', import.meta.url).href;
const iconServiceBus = new URL('../../icons/nodes/integration/ServiceBus.svg', import.meta.url).href;
const iconAutomationAccount = new URL('../../icons/nodes/monitoring/AutomationAccount.svg', import.meta.url).href;
const iconAzureMonitor = new URL('../../icons/nodes/monitoring/AzureMonitor.svg', import.meta.url).href;
const iconLogAnalytics = new URL('../../icons/nodes/monitoring/LogAnalytics.svg', import.meta.url).href;
const iconSentinel = new URL('../../icons/nodes/monitoring/AzureSentinel.svg', import.meta.url).href;
const iconLoadBalancer = new URL('../../icons/nodes/network/LoadBalancer.svg', import.meta.url).href;
const iconPublicIp = new URL('../../icons/nodes/network/PublicIPAddress.svg', import.meta.url).href;
const iconNatGateway = new URL('../../icons/nodes/network/NATGateway.svg', import.meta.url).href;
const iconNetworkInterface = new URL('../../icons/nodes/network/NetworkInterface.svg', import.meta.url).href;
const iconBastion = new URL('../../icons/nodes/network/Bastion.svg', import.meta.url).href;
const iconApplicationGateway = new URL('../../icons/nodes/network/ApplicationGateway.svg', import.meta.url).href;
const iconExpressRoute = new URL('../../icons/nodes/network/ExpressRouteCircuit.svg', import.meta.url).href;
const iconVirtualNetworkGateway = new URL('../../icons/nodes/network/VirtualNetworkGateway.svg', import.meta.url).href;
const iconLocalNetworkGateway = new URL('../../icons/nodes/network/LocalNetworkGateway.svg', import.meta.url).href;
const iconOnPremisesNetworkGateway = new URL('../../icons/nodes/network/OnPremisesNetworkGateway.svg', import.meta.url).href;
const iconPrivateEndpoint = new URL('../../icons/nodes/network/PrivateEndpoint.svg', import.meta.url).href;
const iconRouteTable = new URL('../../icons/nodes/network/RouteTable.svg', import.meta.url).href;
const iconNetworkSecurityGroup = new URL('../../icons/nodes/security/NetworkSecurityGroup.svg', import.meta.url).href;
const iconApplicationSecurityGroup = new URL('../../icons/nodes/security/ApplicationSecurityGroup.svg', import.meta.url).href;
const iconKeyVault = new URL('../../icons/nodes/security/KeyVault.svg', import.meta.url).href;
const iconDdosProtection = new URL('../../icons/nodes/security/DDoSProtection.svg', import.meta.url).href;
const iconWaf = new URL('../../icons/nodes/security/WebApplicationFirewall.svg', import.meta.url).href;

export const nodeIcons: Record<NodeType, string> = {
  vm: iconVirtualMachine,
  firewall: iconFirewall,
  storage: iconStorage,
  azureFiles: iconAzureFiles,
  disk: iconDisk,
  functionApp: iconFunctionApp,
  appService: iconAppService,
  vmScaleSet: iconVmScaleSet,
  kubernetesCluster: iconKubernetes,
  containerInstance: iconContainerInstance,
  batchAccount: iconBatchAccount,
  loadBalancer: iconLoadBalancer,
  publicIp: iconPublicIp,
  natGateway: iconNatGateway,
  networkInterface: iconNetworkInterface,
  bastion: iconBastion,
  applicationGateway: iconApplicationGateway,
  expressRouteCircuit: iconExpressRoute,
  virtualNetworkGateway: iconVirtualNetworkGateway,
  localNetworkGateway: iconLocalNetworkGateway,
  onPremisesNetworkGateway: iconOnPremisesNetworkGateway,
  privateEndpoint: iconPrivateEndpoint,
  routeTable: iconRouteTable,
  networkSecurityGroup: iconNetworkSecurityGroup,
  applicationSecurityGroup: iconApplicationSecurityGroup,
  keyVault: iconKeyVault,
  ddosProtection: iconDdosProtection,
  webApplicationFirewall: iconWaf,
  dataLake: iconDataLake,
  storageQueue: iconStorageQueue,
  azureSqlDatabase: iconAzureSqlDatabase,
  managedSqlInstance: iconManagedSqlInstance,
  azureDatabaseForMySql: iconAzureDatabaseMySql,
  azureDatabaseForMariaDb: iconAzureDatabaseMariaDb,
  azureDatabaseForPostgreSql: iconAzureDatabasePostgreSql,
  azureCosmosDb: iconAzureCosmosDb,
  oracleDatabase: iconOracleDatabase,
  apiManagement: iconApiManagement,
  dataFactory: iconDataFactory,
  eventGrid: iconEventGrid,
  eventHub: iconEventHub,
  logicApp: iconLogicApp,
  serviceBus: iconServiceBus,
  automationAccount: iconAutomationAccount,
  azureMonitor: iconAzureMonitor,
  logAnalyticsWorkspace: iconLogAnalytics,
  sentinelWorkspace: iconSentinel,
  database: iconStorage,
  gateway: iconVirtualMachine,
};

export const defaultNodeIcon = iconVirtualMachine;

export const getNodeIcon = (type: NodeType) => nodeIcons[type] ?? defaultNodeIcon;
