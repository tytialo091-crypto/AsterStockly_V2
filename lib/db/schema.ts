import { date, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const posTransactions = pgTable('pos_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  customerName: text('customer_name'),
  subtotal: integer('subtotal').notNull(),
  discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: integer('discount_amount').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  total: integer('total').notNull(),
  paid: integer('paid').notNull(),
  changeDue: integer('change_due').notNull(),
  paymentMethod: text('payment_method').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const posTransactionItems = pgTable('pos_transaction_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull(),
  productId: uuid('product_id').notNull(),
  productName: text('product_name').notNull(),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  lineTotal: integer('line_total').notNull(),
})

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  category: text('category').notNull().default('Bahan baku'),
  stock: integer('stock').notNull().default(0),
  price: integer('price').notNull().default(0),
  minStock: integer('min_stock').notNull().default(5),
  unit: text('unit').notNull().default('pcs'),
  expiryDate: date('expiry_date', { mode: 'string' }),
  location: text('location').notNull().default('Gudang utama'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
