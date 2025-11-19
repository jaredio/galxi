# auditbuddy.md

## Context
- Commands exercised so far: `npm install`, `npm run build`, `npm run test`, and `npm run test:e2e`.
- `npm run build` still completes but emits Rollup's chunk-size warning for `assets/index-B8iNbnxK.js` (≈549 kB, gzip ≈154 kB).
- Latest Vitest and Playwright runs (after the fixes below) both finish green.

## High-priority findings

1. ✅ **`npm run test` was red because Vitest tried to run Playwright specs**  
   - *Fix*: `vitest.config.ts` now excludes `playwright/**` (while still inheriting `configDefaults.exclude`), so the default unit-test script only executes Vitest suites.

2. ✅ **Vitest hook imported the deprecated `ReactDOMTestUtils.act` helper**  
   - *Fix*: `src/hooks/useGraphPersistence.test.tsx` now imports `act` from `react`, matching the React 19 guidance and eliminating the deprecation spam (the jsdom “act not configured” warnings remain, but they do not block the suite).

3. ✅ **Editing a node's profile discarded user input**  
   - *Fix*: `handleNodeFormSubmit` in `src/app/hooks/usePanelState.ts` now reuses the merged `nodeProfileDraft` for both create and edit flows, so metadata edits persist to the Zustand store and autosave payload.

4. ✅ **Deleting a group left member nodes pointing at a ghost parent**  
   - *Fix*: `removeGroupById` also reassigns affected nodes (`node.group = ''`) before autosave runs, preventing stale IDs from being serialized.

5. ✅ **Profile windows stopped updating because `useCanvasViewModel` memoized stale data**  
   - *Fix*: `profileWindowList` is part of the dependency list again, ensuring the canvas re-renders when profile windows open, move, or close.

6. ✅ **Playwright smoke test assumed the dev server URL and managed localStorage inline**  
   - *Fix*: `playwright/smoke.spec.ts` now resolves the actual base URL via the injected `baseURL` fixture (falling back to `http://127.0.0.1:4173/`), centralizes autosave cleanup in `beforeEach/afterEach`, and no longer relies on implicit `page.goto('/')`. `npm run test:e2e` brings up Vite automatically and passes.

7. ⚠️ **Obsolete constants file**  
   - *Details*: `src/config/ui-constants.ts` defines `PANEL_GEOMETRY`, `PROFILE_WINDOW`, etc., but nothing in `src/` imports it—the live implementations live in `usePanelLayout` and `ProfileWindow`. The stale copy is confusing and risks diverging values.  
   - *Next step*: Either delete the file or refactor the panel/profile components to consume the shared constants so there is only one source of truth.

8. ⚠️ **Production bundle exceeds Vite's 500 kB guidance**  
   - *Details*: `npm run build` reports `assets/index-B8iNbnxK.js` at ~549 kB (gzip ~154 kB). React, D3 force-graph logic, and the dashboard all ship in a single chunk.  
   - *Next step*: Investigate code-splitting (`import()` for the dashboard, lazy-loading the D3 canvas helpers, or Rollup `manualChunks`) so the initial load shrinks.

## Additional observations & risks

- **Minimal automated coverage** – Only a handful of store/hook tests exist today. Consider adding component or integration tests for `useAppController`, `usePanelState`, and the dashboard/canvas flows once the remaining bugs are addressed.
- **Logging TODO** – `src/lib/logger.ts` still contains a “TODO: send to error tracking service” comment; production currently only logs to the console.
- **Monolithic styling** – `src/App.css` is ~60 kB of bespoke CSS, which slows hot reloads and makes incremental styling risky. Component-scoped styles or CSS modules could improve maintainability.
- **DDoS spec gap** – `newprofiles.txt` never defines DDoS plan fields, so the refreshed schema (`src/schemas/resources.ts:1539-1577`) uses Azure’s public plan model (plan ID/type, protection mode, protected resources). Reconcile once the official requirements drop so we don’t miss required telemetry.
- **Storage queue & Oracle assumptions** – Azure’s spec doesn’t mention queue storage or Oracle DBs, so the new schemas at `src/schemas/resources.ts:213-345` still rely on Galxi-defined fields (queue throughput, Oracle shape/workload). Revisit once the Azure integration contract tells us which properties to persist.

## Schema modernization checklist

- [x] **Phase 1 – Compute/Network/Security nodes now align with `newprofiles.txt`.**  
  `vm`, `vmScaleSet`, `appService`, `functionApp`, `containerInstance`, `batchAccount`, `kubernetesCluster`, `loadBalancer`, `applicationGateway`, `publicIp`, `natGateway`, `virtualNetworkGateway`, `localNetworkGateway`, `onPremisesNetworkGateway`, `privateEndpoint`, `routeTable`, `networkInterface`, `bastion`, `networkSecurityGroup`, `applicationSecurityGroup`, `keyVault`, `ddosProtection`, and `webApplicationFirewall` now call `buildResourceSchema` so they inherit the shared ARM metadata block and expose the plain-English Azure fields from `newprofiles.txt` (see `src/schemas/resources.ts:74-1712`). VM profiles, for example, now track `vmSize`, `osDiskStorageType`, NIC associations, and power state via `compute.powerState`. Supporting tests were updated to assert the new keys (`src/state/graphStore.test.ts:38-63`, `src/lib/profileData.test.ts:31-56`), and `npm run test` passes.
- [x] **Phase 2 – Storage & database nodes mirror Azure’s spec.**  
  `storageSchema`, `azureFilesSchema`, `dataLakeSchema`, `storageQueueSchema`, `diskSchema`, `azureSqlDatabaseSchema`, `managedSqlInstanceSchema`, all three flexible-server flavors, `azureCosmosDbSchema`, and `oracleDatabaseSchema` now build profiles from the shared ARM metadata helper (see `src/schemas/resources.ts:157-345` & `src/schemas/resources.ts:805-870`). They expose exactly the Azure fields from `newprofiles.txt`, e.g. storage accounts capture SKU/kind/access tier/HTTPS-only and SQL DBs track server/tier/compute size/status at `src/schemas/resources.ts:243-274`. `npm run test` remains green after the refactor.
- [x] **Phase 3 – Integration & monitoring nodes.**  
  API Management, Data Factory, Event Grid, Event Hubs, Logic Apps, Service Bus, Automation, Azure Monitor, Log Analytics, and Sentinel now inherit the shared ARM metadata section and expose the Azure field lists from `newprofiles.txt` (see `src/schemas/resources.ts:371-617`). Each schema is a single `buildResourceSchema` definition—for example, API Management only surfaces `skuName`, `gatewayUrl`, `publisherEmail`, and `publicIpIds` while Logic Apps track `state`, `endpointUrl`, and `integrationAccountId`. Vitest stayed green after swapping these schemas in, so the profile editor/dashboard wiring still works.

## Suggested next steps

1. Retire or wire up `src/config/ui-constants.ts` so panel/profile geometry is defined in exactly one place.
2. Profile the bundle and introduce lazy-loading/code-splitting to keep primary chunks <500 kB.
3. Expand automated tests (Vitest + Playwright) around the canvas/profile-window workflows to guard the newly fixed behaviors.
