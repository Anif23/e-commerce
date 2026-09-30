import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

/**
 * Creates a throwaway database (ecommerce_test) and applies every migration in
 * prisma/migrations, so the suite always runs against the committed schema.
 */
const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/ecommerce_test?schema=public';

const url = new URL(baseUrl);
const databaseName = url.pathname.replace('/', '');

const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres';

const migrationsDir = path.resolve(process.cwd(), 'prisma/migrations');

const migrationFiles = () =>
  fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => path.join(migrationsDir, name, 'migration.sql'))
    .filter((file) => fs.existsSync(file));

export const setup = async () => {
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();

  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);

  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  }

  await admin.end();

  const client = new pg.Client({ connectionString: baseUrl });
  await client.connect();

  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  for (const file of migrationFiles()) {
    await client.query(fs.readFileSync(file, 'utf8'));
  }

  await client.end();
};

export const teardown = async () => {
  // The database is intentionally left behind so `vitest --watch` can reuse it.
};
