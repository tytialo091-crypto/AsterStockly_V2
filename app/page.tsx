'use client'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { deleteInventoryItem, listInventoryItems, saveInventoryItem } from '@/app/actions/inventory'
import { DashboardMetrics } from '@/components/dashboard-metrics'
import {
  Bell, Boxes, CalendarClock, LayoutGrid, Menu, MessageCircle, PackagePlus,
  Pencil, Search, Settings, ShieldCheck, ShoppingCart, Trash2, TriangleAlert, UserRound, X,
} from 'lucide-react'

type View = 'ringkasan' | 'produk' | 'expiry' | 'notifikasi' | 'pengaturan'

type Item = {
  id: string
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

const EXPIRY_WINDOW_MS = 14 * 86400000

export default function Page() {
  const { data: inventoryRows, error: inventoryError, mutate: refreshInventory } = useSWR('inventory-items', listInventoryItems, { refreshInterval: 3000, revalidateOnFocus: true })
  const items = useMemo(() => (inventoryRows ?? []).map(row => ({
    ...row,
    min_stock: row.minStock,
    expiry_date: row.expiryDate,
    created_at: row.createdAt.toISOString(),
  })) as Item[], [inventoryRows])
  const [databaseMessage, setDatabaseMessage] = useState('')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNotif, setShowNotif] = useState(false)
  const [view, setView] = useState<View>('ringkasan')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [form, setForm] = useState({
    name: '', sku: '', category: 'Lainnya', stock: 0, price: 0, min_stock: 5, unit: 'pcs', expiry_date: '', location: 'Gudang utama',
  })

  useEffect(() => {
    if (typeof Notification === 'undefined') setNotifPermission('unsupported')
    else setNotifPermission(Notification.permission)
  }, [])

  const [category, setCategory] = useState('Semua kategori')
  const categories = useMemo(() => ['Semua kategori', ...Array.from(new Set(items.map(i => i.category)))], [items])

  const filtered = useMemo(
    () => items
      .filter(i => `${i.name} ${i.sku} ${i.category}`.toLowerCase().includes(query.toLowerCase()))
      .filter(i => category === 'Semua kategori' || i.category === category),
    [items, query, category],
  )
  const low = items.filter(i => i.stock <= 5)
  const visibleDatabaseMessage = databaseMessage || (inventoryError ? 'Neon belum dapat dijangkau. Produk tidak ditampilkan sampai database tersedia.' : '')
  const exp = items.filter(i => i.expiry_date && new Date(i.expiry_date).getTime() - Date.now() < EXPIRY_WINDOW_MS)
  const expSorted = useMemo(
    () => [...items]
      .filter(i => i.expiry_date)
      .sort((a, b) => new Date(a.expiry_date as string).getTime() - new Date(b.expiry_date as string).getTime()),
    [items],
  )
  const alerts = [
    ...low.map(i => ({ id: `low-${i.id}`, text: `${i.name} tinggal ${i.stock} ${i.unit}, di bawah minimum ${i.min_stock}.` })),
    ...exp.map(i => ({ id: `exp-${i.id}`, text: `${i.name} akan expired pada ${new Date(i.expiry_date as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}.` })),
  ]

  const pageMeta: Record<View, { eyebrow: string; title: string }> = {
    ringkasan: { eyebrow: 'RINGKASAN INVENTARIS', title: 'Selamat datang' },
    produk: { eyebrow: 'MANAJEMEN PRODUK', title: 'Produk' },
    expiry: { eyebrow: 'EXPIRY & BATCH', title: 'Kedaluwarsa & batch' },
    notifikasi: { eyebrow: 'PUSAT NOTIFIKASI', title: 'Notifikasi' },
    pengaturan: { eyebrow: 'AKUN', title: 'Pengaturan' },
  }

  function goTo(v: View) {
    setView(v)
    setSidebarOpen(false)
  }

  // Kirim notifikasi browser (gratis, tanpa layanan pihak ketiga) untuk tiap alert aktif.
  function notifyBrowser() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (alerts.length === 0) return
    new Notification('AsterStockly — Perlu perhatian', {
      body: `${low.length} produk stok menipis, ${exp.length} produk mendekati expiry.`,
      tag: 'asterstockly-stock-alert',
    })
  }

  async function enableBrowserNotifications() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') notifyBrowser()
  }

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', sku: '', category: 'Lainnya', stock: 0, price: 0, min_stock: 5, unit: 'pcs', expiry_date: '', location: 'Gudang utama' })
    setShowAdd(true)
  }

  function openEdit(item: Item) {
    setEditingId(item.id)
    setForm({ name: item.name, sku: item.sku, category: item.category, stock: item.stock, price: item.price, min_stock: item.min_stock, unit: item.unit, expiry_date: item.expiry_date ?? '', location: item.location })
    setShowAdd(true)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    const sku = form.sku.trim()
    const stock = Number(form.stock)
    const price = Number(form.price)
    const minStock = Number(form.min_stock)
    if (!name || !sku || !Number.isInteger(stock) || stock < 0 || !Number.isSafeInteger(price) || price < 0 || !Number.isInteger(minStock) || minStock < 0) return
    const payload = { ...form, name, sku, stock, price, min_stock: minStock, expiry_date: form.expiry_date || null }
    try {
      await saveInventoryItem(payload, editingId ?? undefined)
      await refreshInventory()
      setDatabaseMessage('')
      setShowAdd(false)
      setEditingId(null)
      setForm({ name: '', sku: '', category: 'Lainnya', stock: 0, price: 0, min_stock: 5, unit: 'pcs', expiry_date: '', location: 'Gudang utama' })
    } catch {
      setDatabaseMessage('Produk belum tersimpan. Pastikan Neon terhubung dan SKU belum digunakan.')
    }
  }

  async function remove(id: string) {
    try {
      await deleteInventoryItem(id)
      await refreshInventory()
      setDatabaseMessage('')
    } catch {
      setDatabaseMessage('Produk belum dihapus. Pastikan database Neon tersedia.')
    }
  }

  const productTable = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Expiry</th><th>Lokasi</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map(i => (
            <tr key={i.id}>
              <td><b>{i.name}</b><small>{i.sku}</small></td>
              <td>{i.category}</td>
              <td>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(i.price)}</td>
              <td><span className={i.stock <= 5 ? 'status low' : 'status'}>{i.stock} {i.unit}</span></td>
              <td>{i.expiry_date ? new Date(i.expiry_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td>{i.location}</td>
              <td className="row-actions"><button className="delete" onClick={() => openEdit(i)} aria-label={`Edit ${i.name}`}><Pencil size={16} /></button><button className="delete" onClick={() => remove(i.id)} aria-label={`Hapus ${i.name}`}><Trash2 size={16} /></button></td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty-row muted">Tidak ada produk yang cocok.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <main className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={sidebarOpen ? 'open' : ''}>
        <div className="logo">
          <div className="brand-mark"><Boxes size={20} /></div>
          <span>Aster<span>Stockly</span></span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu"><X size={18} /></button>
        </div>
        <nav>
          <a className={view === 'ringkasan' ? 'nav-active' : ''} onClick={() => goTo('ringkasan')}><LayoutGrid size={18} /> Ringkasan</a>
          <a className={view === 'produk' ? 'nav-active' : ''} onClick={() => goTo('produk')}><PackagePlus size={18} /> Produk</a>
          <a href="/kasir"><ShoppingCart size={18} /> Kasir</a>
          <a className={view === 'expiry' ? 'nav-active' : ''} onClick={() => goTo('expiry')}><CalendarClock size={18} /> Expiry & batch</a>
          <a className={view === 'notifikasi' ? 'nav-active' : ''} onClick={() => goTo('notifikasi')}>
            <MessageCircle size={18} /> Notifikasi
            {alerts.length > 0 && <span className="nav-badge">{alerts.length}</span>}
          </a>
        </nav>
        <div className="sidebar-bottom">
          <a className={view === 'pengaturan' ? 'nav-active' : ''} onClick={() => goTo('pengaturan')}><Settings size={18} /> Pengaturan</a>
          <button onClick={openCreate}><PackagePlus size={18} /> Tambah data</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Buka menu"><Menu size={20} /></button>
            <div>
              <p className="eyebrow">{pageMeta[view].eyebrow}</p>
              <h1>{pageMeta[view].title}{view === 'ringkasan' ? ', tim AsterStockly' : ''}{view === 'ringkasan' ? '.' : ''}</h1>
            </div>
          </div>
          <div className="top-actions">
            <div className="notif-wrap">
              <button className="icon-button" onClick={() => setShowNotif(v => !v)} aria-label={`Notifikasi${alerts.length ? `, ${alerts.length} peringatan` : ''}`} aria-expanded={showNotif}>
                <Bell size={19} />
                {alerts.length > 0 && <i />}
              </button>
              {showNotif && (
                <div className="notif-dropdown">
                  <div className="notif-head">
                    <b>Notifikasi</b>
                    {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                      <button className="link" onClick={enableBrowserNotifications}>Aktifkan notifikasi browser</button>
                    )}
                  </div>
                  {alerts.length === 0 ? (
                    <p className="muted notif-empty">Tidak ada peringatan saat ini.</p>
                  ) : (
                    <ul className="notif-list">
                      {alerts.map(a => <li key={a.id}>{a.text}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="avatar"><UserRound size={17} /></div>
          </div>
        </header>

        <div className="content">
          {visibleDatabaseMessage && <p className="muted demo-note" role="status">{visibleDatabaseMessage}</p>}

          {view === 'ringkasan' && (
            <>
              <DashboardMetrics />
              <div className="expiry-summary"><CalendarClock size={16} /><span>{exp.length} produk mendekati tanggal kedaluwarsa</span></div>

              <div className="section-head">
                <div>
                  <h2>Inventaris produk</h2>
                  <p className="muted">Pantau stok dan kondisi barang Anda.</p>
                </div>
                <button className="primary" onClick={openCreate}><PackagePlus size={17} /> Tambah produk</button>
              </div>

              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama atau SKU..." />
                </div>
                <select className="filter" value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {productTable}

              {alerts.length > 0 && (
                <div className="alert-panel">
                  <div className="alert-icon"><Bell size={18} /></div>
                  <div><b>Perlu perhatian</b><p>{low.length} produk stok menipis dan {exp.length} produk mendekati expiry.</p></div>
                  {notifPermission === 'granted' ? (
                    <button className="ghost" onClick={notifyBrowser}>Kirim notifikasi sekarang</button>
                  ) : notifPermission === 'unsupported' ? null : (
                    <button className="ghost" onClick={enableBrowserNotifications}>Aktifkan notifikasi</button>
                  )}
                </div>
              )}
            </>
          )}

          {view === 'produk' && (
            <>
              <div className="section-head">
                <div>
                  <h2>Semua produk</h2>
                  <p className="muted">{items.length} produk terdaftar di akun Anda.</p>
                </div>
                <button className="primary" onClick={openCreate}><PackagePlus size={17} /> Tambah produk</button>
              </div>
              <div className="toolbar">
                <div className="search">
                  <Search size={17} />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama atau SKU..." />
                </div>
                <select className="filter" value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {productTable}
            </>
          )}

          {view === 'expiry' && (
            <>
              <div className="section-head">
                <div>
                  <h2>Kedaluwarsa & batch</h2>
                  <p className="muted">Diurutkan dari tanggal expiry terdekat.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Produk</th><th>Kategori</th><th>Expiry</th><th>Sisa waktu</th><th>Lokasi</th></tr>
                  </thead>
                  <tbody>
                    {expSorted.map(i => {
                      const days = Math.ceil((new Date(i.expiry_date as string).getTime() - Date.now()) / 86400000)
                      const soon = days < 14
                      return (
                        <tr key={i.id}>
                          <td><b>{i.name}</b><small>{i.sku}</small></td>
                          <td>{i.category}</td>
                          <td>{new Date(i.expiry_date as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td><span className={soon ? 'status low' : 'status'}>{days < 0 ? 'Sudah lewat' : `${days} hari lagi`}</span></td>
                          <td>{i.location}</td>
                        </tr>
                      )
                    })}
                    {expSorted.length === 0 && (
                      <tr><td colSpan={5} className="empty-row muted">Belum ada produk dengan tanggal expiry.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {view === 'notifikasi' && (
            <>
              <div className="section-head">
                <div>
                  <h2>Semua notifikasi</h2>
                  <p className="muted">Peringatan stok menipis dan produk mendekati expiry.</p>
                </div>
                {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                  <button className="primary" onClick={enableBrowserNotifications}><Bell size={17} /> Aktifkan notifikasi browser</button>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="panel"><p className="muted" style={{ margin: 0 }}>Tidak ada peringatan saat ini. Semua stok dan expiry dalam kondisi aman.</p></div>
              ) : (
                <div className="panel">
                  <ul className="notif-list notif-list-page">
                    {alerts.map(a => <li key={a.id}>{a.text}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}

          {view === 'pengaturan' && (
            <>
              <div className="section-head">
                <div>
                  <h2>Pengaturan akun</h2>
                  <p className="muted">Informasi akun dan preferensi notifikasi.</p>
                </div>
              </div>
              <div className="panel settings-panel">
                <div className="settings-row">
                  <div className="settings-icon"><UserRound size={18} /></div>
                  <div><b>Mode akses</b><p className="muted">Data publik untuk seluruh tim</p></div>
                </div>
                <div className="settings-row">
                  <div className="settings-icon"><ShieldCheck size={18} /></div>
                  <div><b>Status notifikasi browser</b><p className="muted">{notifPermission === 'granted' ? 'Aktif' : notifPermission === 'unsupported' ? 'Tidak didukung di perangkat ini' : 'Belum diaktifkan'}</p></div>
                  {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                    <button className="ghost" onClick={enableBrowserNotifications}>Aktifkan</button>
                  )}
                </div>
                <div className="settings-row">
                  <div className="settings-icon"><Boxes size={18} /></div>
                  <div><b>Bagikan workspace</b><p className="muted">Semua anggota tim dapat melihat dan mengelola data publik.</p></div>
                  <button className="ghost" onClick={() => navigator.clipboard?.writeText(window.location.href)}>Salin link</button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setShowAdd(false)}><X size={19} /></button>
            <h2>{editingId ? 'Edit produk' : 'Tambah produk'}</h2>
            <p className="muted">{editingId ? 'Perbarui detail item inventaris Anda.' : 'Simpan item baru ke inventaris bersama.'}</p>
            <form onSubmit={add}>
              <label>Nama produk<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              <div className="form-grid">
                <label>SKU<input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></label>
                <label>Kategori<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>Makanan</option><option>Minuman</option><option>Snack</option><option>Lainnya</option></select></label>
                <label>Harga (Rp)<input required type="number" min="0" step="1" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></label>
                <label>Satuan<input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></label>
                <label>Stok<input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></label>
                <label>Min. stok<input type="number" min="0" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: Number(e.target.value) })} /></label>
              </div>
              <label>Tanggal expiry<input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></label>
              <button className="primary full">Simpan produk</button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
