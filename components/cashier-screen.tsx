'use client'

import { useMemo, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { ArrowLeft, Check, Minus, Plus, Printer, Search, ShoppingBag, Trash2, X } from 'lucide-react'
import { createPosTransaction, getCashierProducts, type PaymentMethod } from '@/app/actions/pos'

type Product = Awaited<ReturnType<typeof getCashierProducts>>[number]
type Receipt = Awaited<ReturnType<typeof createPosTransaction>>
type CartLine = { product: Product; quantity: number }
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Lainnya']
const categoryFor = (category: string) => categories.includes(category) && category !== 'Semua' ? category : 'Lainnya'

export function CashierScreen() {
  const { data: products = [], error, isLoading, mutate: refreshProducts } = useSWR('cashier-products', getCashierProducts, { refreshInterval: 3000, revalidateOnFocus: true })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Semua')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [includeTax, setIncludeTax] = useState(false)
  const [paid, setPaid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai')
  const [isPaying, setIsPaying] = useState(false)
  const [shake, setShake] = useState(false)
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const filteredProducts = useMemo(() => products.filter(product => {
    const matchesSearch = `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (category === 'Semua' || categoryFor(product.category) === category)
  }), [products, search, category])
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const discountAmount = Math.round(subtotal * discountPercent / 100)
  const taxAmount = includeTax ? Math.round((subtotal - discountAmount) * 0.11) : 0
  const total = subtotal - discountAmount + taxAmount
  const paidAmount = Number(paid) || 0
  const change = Math.max(0, paidAmount - total)
  const formatMoney = (amount: number) => currency.format(amount)

  function addToCart(product: Product) {
    if (product.stock <= 0) return
    setMessage('')
    setCart(current => {
      const found = current.find(line => line.product.id === product.id)
      if (found) return current.map(line => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) } : line)
      return [...current, { product, quantity: 1 }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(current => current.flatMap(line => {
      if (line.product.id !== productId) return [line]
      const quantity = Math.min(line.product.stock, line.quantity + delta)
      return quantity < 1 ? [] : [{ ...line, quantity }]
    }))
  }

  async function pay() {
    if (!cart.length || isPaying) return
    if (paidAmount < total) {
      setShake(true)
      window.setTimeout(() => setShake(false), 500)
      setMessage('Uang yang dibayarkan belum mencukupi.')
      return
    }
    setIsPaying(true)
    setMessage('')
    try {
      const completed = await createPosTransaction({
        lines: cart.map(line => ({ productId: line.product.id, quantity: line.quantity })),
        customerName,
        discountPercent,
        includeTax,
        paid: paidAmount,
        paymentMethod,
      })
      setReceipt(completed)
      setCart([])
      setPaid('')
      setCustomerName('')
      setDiscountPercent(0)
      setIncludeTax(false)
      await Promise.all([refreshProducts(), mutate('dashboard-metrics')])
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Transaksi gagal disimpan. Coba lagi.')
      await refreshProducts()
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <main className="cashier-page">
      <header className="cashier-header">
        <a className="cashier-back" href="/"><ArrowLeft size={18} /><span>Dashboard</span></a>
        <div className="cashier-title"><span className="eyebrow">ASTERSTOCKLY POS</span><h1>Kasir</h1></div>
        <div className="cashier-live"><i /> Data tersimpan otomatis</div>
      </header>

      <div className="cashier-layout">
        <section className="catalog-panel">
          <div className="catalog-heading"><div><h2>Daftar barang</h2><p>{products.length} barang tersedia di toko</p></div><span className="catalog-count">{filteredProducts.length}</span></div>
          <div className="cashier-search"><Search size={17} /><input aria-label="Cari barang" placeholder="Cari nama barang atau SKU..." value={search} onChange={event => setSearch(event.target.value)} /></div>
          <div className="category-tabs" role="group" aria-label="Filter kategori">
            {categories.map(item => <button key={item} className={category === item ? 'selected' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          {isLoading ? <div className="catalog-empty">Memuat barang...</div> : error ? <div className="catalog-empty">Barang belum dapat dimuat dari database Neon.</div> : filteredProducts.length === 0 ? (
            <div className="catalog-empty"><div className="empty-bag"><ShoppingBag size={22} /></div><b>{products.length === 0 ? 'Belum ada barang' : 'Barang tidak ditemukan'}</b><span>{products.length === 0 ? 'Tambahkan barang beserta harga dari menu Produk.' : 'Coba kata kunci atau kategori lain.'}</span></div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map(product => {
                const outOfStock = product.stock <= 0
                return <button key={product.id} className={`product-tile${outOfStock ? ' out-of-stock' : ''}`} onClick={() => addToCart(product)} disabled={outOfStock} aria-label={`${product.name}, ${formatMoney(product.price)}, stok ${product.stock}${outOfStock ? ', habis' : ', tambah ke keranjang'}`}>
                  <span className="product-category">{categoryFor(product.category)}</span><b>{product.name}</b><small>{product.sku}</small><strong>{formatMoney(product.price)}</strong><span className={`stock-label${product.stock <= 5 ? ' stock-alert' : ''}`}>{outOfStock ? 'Stok habis' : `Stok ${product.stock}`}</span>
                </button>
              })}
            </div>
          )}
        </section>

        <aside className="cart-panel" aria-label="Keranjang belanja">
          <div className="cart-heading"><div><h2>Keranjang</h2><p>{cart.reduce((sum, line) => sum + line.quantity, 0)} item dipilih</p></div>{cart.length > 0 && <button className="clear-cart" onClick={() => setCart([])}><Trash2 size={15} /> Bersihkan</button>}</div>
          <div className="cart-lines">
            {cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={22} /><span>Belum ada barang di keranjang.</span></div> : cart.map(line => <div className="cart-line" key={line.product.id}>
              <div className="cart-line-info"><b>{line.product.name}</b><small>{formatMoney(line.product.price)} / {line.product.unit}</small><strong>{formatMoney(line.product.price * line.quantity)}</strong></div>
              <div className="quantity-controls"><button aria-label={`Kurangi ${line.product.name}`} onClick={() => updateQuantity(line.product.id, -1)}><Minus size={14} /></button><span>{line.quantity}</span><button aria-label={`Tambah ${line.product.name}`} disabled={line.quantity >= line.product.stock} onClick={() => updateQuantity(line.product.id, 1)}><Plus size={14} /></button><button className="remove-line" aria-label={`Hapus ${line.product.name}`} onClick={() => setCart(current => current.filter(item => item.product.id !== line.product.id))}><X size={15} /></button></div>
            </div>)}
          </div>

          <div className="checkout-form">
            <label className="checkout-label">Nama pelanggan <span>Opsional</span><input value={customerName} maxLength={120} onChange={event => setCustomerName(event.target.value)} placeholder="Nama pelanggan" /></label>
            <label className="checkout-label">Diskon (%)<input type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={event => setDiscountPercent(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} /></label>
            <label className="tax-toggle"><input type="checkbox" checked={includeTax} onChange={event => setIncludeTax(event.target.checked)} /><span>Tambahkan PPN 11%</span></label>
            <div className="price-breakdown"><div><span>Subtotal</span><b>{formatMoney(subtotal)}</b></div>{discountAmount > 0 && <div><span>Diskon ({discountPercent}%)</span><b>−{formatMoney(discountAmount)}</b></div>}{includeTax && <div><span>PPN 11%</span><b>{formatMoney(taxAmount)}</b></div>}<div className="grand-total"><span>Total</span><strong>{formatMoney(total)}</strong></div></div>
            <label className={`checkout-label payment-field${shake ? ' shake' : ''}`}>Uang dibayar<input type="number" min="0" step="1" value={paid} onChange={event => setPaid(event.target.value)} placeholder="Masukkan nominal" /></label>
            <div className="exact-payment"><span>Kembalian</span><b>{formatMoney(change)}</b><button type="button" onClick={() => setPaid(String(total))} disabled={!cart.length}>Uang pas</button></div>
            <label className="checkout-label">Metode pembayaran<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}><option>Tunai</option><option>QRIS</option><option>Transfer</option></select></label>
            {message && <p className="checkout-message" role="alert">{message}</p>}
            <button className="pay-button" onClick={pay} disabled={!cart.length || isPaying}>{isPaying ? 'Menyimpan transaksi...' : `Bayar ${formatMoney(total)}`}</button>
          </div>
        </aside>
      </div>

      {receipt && <div className="receipt-backdrop" role="presentation" onClick={() => setReceipt(null)}><section className="receipt-card" role="dialog" aria-modal="true" aria-labelledby="receipt-title" onClick={event => event.stopPropagation()}>
        <button className="receipt-close" aria-label="Tutup struk" onClick={() => setReceipt(null)}><X size={18} /></button>
        <div className="receipt-success"><span><Check size={18} /></span><b id="receipt-title">Pembayaran berhasil</b></div>
        <div className="receipt-paper"><header><strong>ASTERSTOCKLY</strong><span>STRUK PEMBELIAN</span><small>{new Date(receipt.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })}</small></header>
          <div className="receipt-code"><span>Kode transaksi</span><b>{receipt.code}</b></div>{receipt.customerName && <div className="receipt-code"><span>Pelanggan</span><b>{receipt.customerName}</b></div>}
          <div className="receipt-items">{receipt.lines.map(line => <div key={line.productId}><span>{line.productName}<small>{line.quantity} × {formatMoney(line.unitPrice)}</small></span><b>{formatMoney(line.lineTotal)}</b></div>)}</div>
          <div className="receipt-totals"><div><span>Subtotal</span><b>{formatMoney(receipt.subtotal)}</b></div>{receipt.discountAmount > 0 && <div><span>Diskon</span><b>−{formatMoney(receipt.discountAmount)}</b></div>}{receipt.taxAmount > 0 && <div><span>PPN 11%</span><b>{formatMoney(receipt.taxAmount)}</b></div>}<div className="receipt-total"><span>Total</span><b>{formatMoney(receipt.total)}</b></div><div><span>{receipt.paymentMethod} · Bayar</span><b>{formatMoney(receipt.paid)}</b></div><div><span>Kembalian</span><b>{formatMoney(receipt.changeDue)}</b></div></div>
          <footer>Terima kasih sudah berbelanja.</footer>
        </div>
        <button className="primary full print-button" onClick={() => window.print()}><Printer size={17} /> Print struk</button>
      </section></div>}
    </main>
  )
}
