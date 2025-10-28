# Galxi

Galxi is an experimental topology canvas built with React, D3, and Vite. Sketch infrastructure diagrams, link services, and explore relationships through an interactive force-directed graph.

## Features

- **Context actions** - right-click the canvas to add nodes or target an existing node to edit or delete in place.
- **Floating node editor** - draggable, resizable glass panel for tweaking labels, groups, types, and connections.
- **Connection management** - edit relationship labels or prune edges directly from the inspector.
- **Keyboard helpers** - duplicate the active node with <kbd>Ctrl</kbd> + <kbd>D</kbd> or delete it with <kbd>Delete</kbd>.
- **Zoom & pan** - smooth zoom controls with reset, plus drag-to-position via D3 under the hood.

## Getting Started

\\\ash
npm install
npm run dev
\\\

Open the dev server URL that Vite prints (usually http://localhost:5173) and start mapping your topology.

## Scripts

- 
pm run dev - start Vite in development mode
- 
pm run build - type-check with TypeScript and build for production
- 
pm run preview - preview the production build locally

## Tech Stack

- React 19
- TypeScript
- D3.js
- Vite 7

## License

This project is provided as-is under the MIT license.

