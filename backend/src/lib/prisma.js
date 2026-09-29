import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma is wired through the official `pg` driver adapter.
 * The adapter keeps the client pool inside the Node process (no Rust query engine
 * binary), which makes boot faster and works in every deployment target.
 */
const createClient = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
};

// Reuse one client across hot reloads / test workers.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
