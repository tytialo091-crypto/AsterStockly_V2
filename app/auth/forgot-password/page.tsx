'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    if (!isSupabaseConfigured()) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      setLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      setLoading(false)
      return
    }
    // Use the current deployed origin so reset links never point to an old v0 preview.
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', '/auth/reset-password')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl.toString(),
    })
    setLoading(false)
    setMessage(error ? 'Permintaan belum dapat diproses. Silakan coba lagi.' : 'Jika email terdaftar, tautan reset password akan dikirim ke inbox Anda.')
  }

  return <main className="auth-page"><section className="auth-card auth-card-centered"><h2>Lupa password?</h2><p className="muted">Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru.</p><form onSubmit={submit}><label htmlFor="email">Email<input id="email" required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@bisnis.com" /></label>{message && <p className="form-message" role="status">{message}</p>}<button className="primary full" disabled={loading}>{loading ? 'Mengirim...' : 'Kirim tautan reset'}</button></form><p className="legal"><Link href="/auth">Kembali ke halaman masuk</Link></p></section></main>
}
