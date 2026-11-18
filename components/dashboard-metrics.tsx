'use client'

import useSWR from 'swr'
import { Banknote, Boxes, ReceiptText, TriangleAlert } from 'lucide-react'
import { getDashboardMetrics } from '@/app/actions/pos'

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export function DashboardMetrics() {
  const { data, error } = useSWR('dashboard-metrics', getDashboardMetrics, { refreshInterval: 3000, revalidateOnFocus: true })
  const value = (amount: number | undefined, format = false) => error ? '—' : data ? (format ? money.format(amount ?? 0) : (amount ?? 0).toLocaleString('id-ID')) : '…'
  return (
    <div className="stats stats--pos" aria-live="polite" aria-label="Ringkasan toko diperbarui otomatis">
      <div className="stat-card"><div className="stat-icon"><Banknote size={18} /></div><span>Omzet hari ini</span><strong>{value(data?.revenue, true)}</strong><small>Total uang masuk hari ini</small></div>
      <div className="stat-card"><div className="stat-icon"><ReceiptText size={18} /></div><span>Transaksi hari ini</span><strong>{value(data?.transactions)}</strong><small>Transaksi berhasil</small></div>
      <div className="stat-card"><div className="stat-icon"><Boxes size={18} /></div><span>Total barang</span><strong>{value(data?.products)}</strong><small>Barang terdaftar</small></div>
      <div className="stat-card"><div className="stat-icon danger"><TriangleAlert size={18} /></div><span>Stok menipis</span><strong className="red">{value(data?.lowStock)}</strong><small>Stok 5 atau kurang</small></div>
    </div>
  )
}
