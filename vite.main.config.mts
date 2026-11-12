import { defineConfig } from 'vite';

// Forge derives its built-in module list from the host Node.js version.
// Electron may provide newer modules (such as node:sqlite), so preserve
// all explicit Node.js imports for resolution by Electron at runtime.
export default defineConfig({
  build: {
    rollupOptions: {
      external: [/^node:/],
    },
  },
});
