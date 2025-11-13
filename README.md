# Galxi

Galxi is a visual topology designer for cloud and network architects. It lets you sketch out VNets, subnets, services, and logical groupings on an interactive canvas, simulate relationships with a force-directed graph, and capture metadata about each connection. The goal is to provide a fast, opinionated space for mapping infrastructure without losing the clarity of a high-fidelity diagram.

## Tech Stack

- **React 19** – component architecture and state flow.
- **TypeScript 5.9** – type safety across the canvas and editor tooling.
- **D3.js 7** – force simulation, SVG rendering, and interaction bindings.
- **Zustand 5** – lightweight store for nodes, groups, and links.
- **Vite 7** – build tool + dev server.

## Requirements

- **Node.js 20.19+ (or 22.12+)** – the Vite toolchain enforces this minimum. Use the provided `.nvmrc` to align local and CI environments before installing dependencies.

## Getting Started

1. **Select the right Node version**
   ```bash
   nvm use
   ```
   (Or install Node 20.19.x manually if you are not using `nvm`.)
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the dev server**
   ```bash
   npm run dev
   ```
   Vite will serve Galxi at `http://localhost:5173` by default.

## Available Scripts

- `npm run dev` – start the Vite dev server with hot module reload.
- `npm run build` – type-check with `tsc` and build the production bundle.
- `npm run preview` – preview the production build locally.
- `npm run test` – execute the Vitest suite in CI mode.
- `npm run test:watch` – run Vitest in watch mode during development.

## Testing

Unit tests are powered by **Vitest + jsdom**. Run `npm run test` (or `npm run test:watch`) to exercise the suites covering persistence, validation, group parenting, and the Zustand store. Coverage is generated via V8 instrumentation and can be configured in `vitest.config.ts`.

## License

This project is provided as-is under the MIT license.

