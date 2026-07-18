import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" -> repo root mapping so tests can import
      // modules the same way the app does, without an extra plugin.
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
