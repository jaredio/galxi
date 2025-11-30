# Galxi

Galxi is a visual topology designer for cloud and network architects. It lets you sketch out VNets, subnets, services, and logical groupings on an interactive canvas, simulate relationships with a force-directed graph, and capture metadata about each connection. The goal is to provide a fast, opinionated space for mapping infrastructure without losing the clarity of a high-fidelity diagram.

## Tech Stack

- **React 19** - component architecture and state flow.
- **TypeScript 5.9** - type safety across the canvas and editor tooling.
- **D3.js 7** - force simulation, SVG rendering, and interaction bindings.
- **Zustand 5** - lightweight store for nodes, groups, and links.
- **Vite 7** - build tool + dev server.

## Requirements

- **Node.js 20.19+ (or 22.12+)** - the Vite toolchain enforces this minimum. Use the provided `.nvmrc` to align local and CI environments before installing dependencies.

## Available Scripts

- `npm run dev` - Vite dev server with HMR.
- `npm run build` - `tsc` type-check + Vite production build.
- `npm run preview` - preview the production build locally.
- `npm run test` - execute Vitest once (CI mode).
- `npm run test:watch` - run Vitest in watch mode.
- `npm run test:e2e` - headless Playwright smoke test (ensure `npx playwright install` has been run once).

## Workspaces

Galxi now opens with a workspace chooser so you can create or import separate topology sessions. New workspaces save to browser storage under distinct keys. You can import a JSON export from another session via the “Import JSON” button on the welcome screen.

## Testing

Unit tests are powered by **Vitest + jsdom**. Run `npm run test` (or `npm run test:watch`) to exercise the suites covering persistence, validation, group parenting, and the Zustand store. Coverage is generated via V8 instrumentation and can be configured in `vitest.config.ts`.

End-to-end coverage is handled by **Playwright**. After installing the browsers with `npx playwright install`, run `npm run test:e2e` to execute the smoke test that creates a node, waits for autosave, and reloads the canvas to verify persistence.

## License

This project is provided as-is under the MIT license.
