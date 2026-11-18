'use server'

import { and, count, eq, gte, inArray, lt, lte, sql, sum } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { inventoryItems, posTransactionItems, posTransactions } from '@/lib/db/schema'

export type CartLineInput = { productId: string; quantity: number }
export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer'

function jakartaDayRange() {
  const now = new Date()
  const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const start = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), jakarta.getUTCDate()) - 7 * 60 * 60 * 1000)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

export async function getDashboardMetrics() {
  const { start, end } = jakartaDayRange()
  const [sales, products, lowStock] = await Promise.all([
    db.select({ revenue: sum(posTransactions.total), transactions: count() })
      .from(posTransactions)
      .where(and(gte(posTransactions.createdAt, start), lt(posTransactions.createdAt, end))),
    db.select({ total: count() }).from(inventoryItems),
    db.select({ total: count() }).from(inventoryItems).where(lte(inventoryItems.stock, 5)),
  ])
  return {
    revenue: Number(sales[0]?.revenue ?? 0),
    transactions: Number(sales[0]?.transactions ?? 0),
    products: Number(products[0]?.total ?? 0),
    lowStock: Number(lowStock[0]?.total ?? 0),
  }
}

export async function getCashierProducts() {
  return db.select({
    id: inventoryItems.id,
    name: inventoryItems.name,
    sku: inventoryItems.sku,
    category: inventoryItems.category,
    stock: inventoryItems.stock,
    price: inventoryItems.price,
  }).from(inventoryItems).orderBy(inventoryItems.name)
}

export async function createPosTransaction(input: {
  lines: CartLineInput[]
  customerName?: string
  discountPercent: number
  includeTax: boolean
  paid: number
  paymentMethod: PaymentMethod
}) {
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 100) throw new Error('Keranjang tidak valid.')
  if (!['Tunai', 'QRIS', 'Transfer'].includes(input.paymentMethod)) throw new Error('Metode pembayaran tidak valid.')
  const discountPercent = Number(input.discountPercent)
  const paid = Number(input.paid)
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100 || Math.round(discountPercent * 100) !== discountPercent * 100) throw new Error('Diskon harus di antara 0 sampai 100 persen.')
  if (!Number.isSafeInteger(paid) || paid < 0) throw new Error('Jumlah bayar tidak valid.')
  const customerName = (input.customerName ?? '').trim().slice(0, 120) || null
  const quantities = new Map<string, number>()
  for (const line of input.lines) {
    if (typeof line.productId !== 'string' || !/^[0-9a-f-]{36}$/i.test(line.productId)) throw new Error('Produk dalam keranjang tidak valid.')
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 999) throw new Error('Jumlah barang tidak valid.')
    const quantity = (quantities.get(line.productId) ?? 0) + line.quantity
    if (quantity > 999) throw new Error('Jumlah barang melewati batas.')
    quantities.set(line.productId, quantity)
  }

  const result = await db.transaction(async tx => {
    const products = await tx.select().from(inventoryItems).where(inArray(inventoryItems.id, [...quantities.keys()]))
    if (products.length !== quantities.size) throw new Error('Ada barang yang sudah tidak tersedia.')
    const productById = new Map(products.map(product => [product.id, product]))
    const lines = [...quantities.entries()].map(([productId, quantity]) => {
      const product = productById.get(productId)
      if (!product || product.stock < quantity) throw new Error(`Stok ${product?.name ?? 'barang'} tidak mencukupi.`)
      const lineTotal = product.price * quantity
      if (!Number.isSafeInteger(lineTotal)) throw new Error('Nilai transaksi terlalu besar.')
      return { product, quantity, lineTotal }
    })
    const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0)
    if (!Number.isSafeInteger(subtotal)) throw new Error('Nilai transaksi terlalu besar.')
    const discountAmount = Math.round(subtotal * discountPercent / 100)
    const taxable = subtotal - discountAmount
    const taxAmount = input.includeTax ? Math.round(taxable * 0.11) : 0
    const total = taxable + taxAmount
    if (!Number.isSafeInteger(total) || paid < total) throw new Error('Uang yang dibayarkan belum mencukupi.')

    for (const line of lines) {
      const [updated] = await tx.update(inventoryItems)
        .set({ stock: line.product.stock - line.quantity })
        .where(and(eq(inventoryItems.id, line.product.id), gte(inventoryItems.stock, line.quantity)))
        .returning({ id: inventoryItems.id })
      if (!updated) throw new Error(`Stok ${line.product.name} berubah. Periksa keranjang lalu coba lagi.`)
    }

    const code = `AST-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const [transaction] = await tx.insert(posTransactions).values({
      code,
      customerName,
      subtotal,
      discountPercent: discountPercent.toFixed(2),
      discountAmount,
      taxAmount,
      total,
      paid,
      changeDue: paid - total,
      paymentMethod: input.paymentMethod,
    }).returning()
    await tx.insert(posTransactionItems).values(lines.map(line => ({
      transactionId: transaction.id,
      productId: line.product.id,
      productName: line.product.name,
      sku: line.product.sku,
      quantity: line.quantity,
      unitPrice: line.product.price,
      lineTotal: line.lineTotal,
    })))
    return {
      id: transaction.id,
      code: transaction.code,
      customerName: transaction.customerName,
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount,
      total,
      paid,
      changeDue: paid - total,
      paymentMethod: input.paymentMethod,
      createdAt: transaction.createdAt.toISOString(),
      lines: lines.map(line => ({
        productId: line.product.id,
        productName: line.product.name,
        sku: line.product.sku,
        quantity: line.quantity,
        unitPrice: line.product.price,
        lineTotal: line.lineTotal,
      })),
    }
  })
  revalidatePath('/')
  revalidatePath('/kasir')
  return result
}
