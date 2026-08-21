import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata={title:'AsterStockly — Inventory, in orbit',description:'Kelola stok, expiry, dan peringatan inventaris per akun dengan AsterStockly.'}
export const viewport: Viewport={themeColor:'#0b1020',colorScheme:'dark'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id" className="bg-[#0b1020]"><body>{children}</body></html>}
