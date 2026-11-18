'use server'

import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { inventoryItems } from '@/lib/db/schema'

export type InventoryInput = {
  name: string
  sku: string
  category: string
  stock: number
  price: number
  min_stock: number
  unit: string
  expiry_date: string | null
  location: string
}

function validateInput(input: InventoryInput) {
  const value = {
    name: input.name.trim(),
    sku: input.sku.trim(),
    category: input.category.trim(),
    stock: Number(input.stock),
    price: Number(input.price),
    min_stock: Number(input.min_stock),
    unit: input.unit.trim(),
    expiry_date: input.expiry_date || null,
    location: input.location.trim(),
  }
  if (!value.name || value.name.length > 160) throw new Error('Nama produk wajib diisi (maksimal 160 karakter).')
  if (!value.sku || value.sku.length > 80) throw new Error('SKU wajib diisi (maksimal 80 karakter).')
  if (!Number.isInteger(value.stock) || value.stock < 0 || value.stock > 2_000_000_000) throw new Error('Jumlah stok tidak valid.')
  if (!Number.isSafeInteger(value.price) || value.price < 0 || value.price > 2_000_000_000) throw new Error('Harga tidak valid.')
  if (!Number.isInteger(value.min_stock) || value.min_stock < 0 || value.min_stock > 2_000_000_000) throw new Error('Stok minimum tidak valid.')
  if (!value.category || !value.unit || !value.location) throw new Error('Kategori, satuan, dan lokasi wajib diisi.')
  if (value.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(value.expiry_date)) throw new Error('Tanggal kedaluwarsa tidak valid.')
  return value
}

export async function listInventoryItems() {
  return db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt))
}

export async function saveInventoryItem(input: InventoryInput, id?: string) {
  const value = validateInput(input)
  const [saved] = id
    ? await db.update(inventoryItems).set({
        name: value.name, sku: value.sku, category: value.category, stock: value.stock, price: value.price,
        minStock: value.min_stock, unit: value.unit, expiryDate: value.expiry_date,
        location: value.location,
      }).where(eq(inventoryItems.id, id)).returning()
    : await db.insert(inventoryItems).values({
        name: value.name, sku: value.sku, category: value.category, stock: value.stock, price: value.price,
        minStock: value.min_stock, unit: value.unit, expiryDate: value.expiry_date,
        location: value.location,
      }).returning()
  if (!saved) throw new Error('Produk tidak ditemukan.')
  revalidatePath('/')
  return { ...saved, min_stock: saved.minStock, expiry_date: saved.expiryDate, created_at: saved.createdAt.toISOString() }
}

export async function deleteInventoryItem(id: string) {
  const [deleted] = await db.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning({ id: inventoryItems.id })
  if (!deleted) throw new Error('Produk tidak ditemukan.')
  revalidatePath('/')
  return deleted.id
}
