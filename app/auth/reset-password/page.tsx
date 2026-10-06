'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      return
    }
    const supabase = createClient()
    if (!supabase) return

    let settled = false
    const resolveSession = (session: { user?: unknown } | null) => {
      if (settled) return
      settled = true
      setReady(Boolean(session))
      if (!session) setMessage('Tautan reset tidak valid atau sudah kedaluwarsa. Minta link reset baru.')
    }

    supabase.auth.getSession().then(({ data }) => resolveSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) resolveSession(session)
    })
    const timeout = window.setTimeout(() => resolveSession(null), 2500)
    return () => {
      window.clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setMessage('Konfirmasi password tidak cocok.')
      return
    }
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    if (!supabase) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    setMessage(error ? 'Password belum dapat diperbarui. Silakan minta tautan baru.' : 'Password berhasil diperbarui. Silakan masuk kembali.')
    if (!error) await supabase.auth.signOut()
  }

  return <main className="auth-page"><section className="auth-card auth-card-centered"><h2>Buat password baru</h2><p className="muted">Gunakan minimal 6 karakter untuk mengamankan akun Anda.</p>{ready ? <form onSubmit={submit}><label htmlFor="password">Password baru<input id="password" required minLength={6} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label><label htmlFor="confirm">Konfirmasi password<input id="confirm" required minLength={6} type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /></label>{message && <p className="form-message" role="status">{message}</p>}<button className="primary full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan password'}</button></form> : message && <p className="form-message" role="alert">{message}</p>}<p className="legal"><Link href="/auth">Kembali ke halaman masuk</Link></p></section></main>
}
