import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDb = globalThis as typeof globalThis & { inventoryPool?: Pool }

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('Neon DATABASE_URL is not configured.')
  if (!globalForDb.inventoryPool) {
    globalForDb.inventoryPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    })
  }
  return globalForDb.inventoryPool
}

export const db = drizzle(getPool(), { schema })
