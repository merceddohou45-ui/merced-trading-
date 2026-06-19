import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  },
  coverage: {
    provider: 'istanbul',
    reporter: ['text', 'lcov'],
    reportsDirectory: 'coverage',
    all: true,
    include: ['src/lib/indicators/**'],
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  }
});
