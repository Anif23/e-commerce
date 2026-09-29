import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/ecommerce_test?schema=public';

// The env module reads process.env at import time, so the test database has to
// be set before any application module is loaded.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.PAYMENT_MODE = 'mock';
process.env.JWT_SECRET = 'test-access-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: ['./tests/globalSetup.js'],
    // The suite shares one database, so run files sequentially.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
