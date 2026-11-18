import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata={title:'AsterStockly — POS & Inventaris',description:'Kelola inventaris, transaksi kasir, omzet, dan stok toko dengan AsterStockly.'}
export const viewport: Viewport={themeColor:'#0b1020',colorScheme:'dark',width:'device-width',initialScale:1}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id" className="bg-[#0b1020]"><body>{children}</body></html>}
