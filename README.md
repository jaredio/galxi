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

## License

This project is provided as-is under the MIT license.

