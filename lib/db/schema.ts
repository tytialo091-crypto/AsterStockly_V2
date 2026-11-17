import { date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  category: text('category').notNull().default('Bahan baku'),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(5),
  unit: text('unit').notNull().default('pcs'),
  expiryDate: date('expiry_date', { mode: 'string' }),
  location: text('location').notNull().default('Gudang utama'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
