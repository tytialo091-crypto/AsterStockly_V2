'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Boxes, Check, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

const redirectUrl = () => `${window.location.origin}/auth/callback`

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error')
    if (error) setMessage(error === 'callback_failed' ? 'Sesi autentikasi tidak dapat diselesaikan. Coba lagi.' : `Autentikasi gagal: ${error.replaceAll('_', ' ')}`)
  }, [])

  function changeMode(nextMode: 'login' | 'signup') {
    setMode(nextMode)
    setMessage('')
    setPassword('')
  }

  async function submitPassword(event: React.FormEvent) {
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

    const result = mode === 'signup'
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl(),
            data: { name: name.trim() },
          },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password })

    setLoading(false)
    if (result.error) {
      const errorMessage = result.error.message.toLowerCase()
      if (errorMessage.includes('confirm')) {
        setMessage('Akun berhasil dibuat. Cek email untuk konfirmasi akun.')
      } else if (mode === 'login') {
        setMessage('Email atau password salah.')
      } else {
        setMessage('Registrasi belum berhasil. Pastikan password minimal 6 karakter.')
      }
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Akun berhasil dibuat. Cek email untuk konfirmasi akun sebelum masuk.')
      return
    }

    window.location.assign('/')
  }

  async function signInWithGoogle() {
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    if (!isSupabaseConfigured() || !supabase) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl() },
    })
    if (error) {
      setLoading(false)
      setMessage('Login Google belum tersedia. Aktifkan provider Google di Supabase.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="logo"><div className="brand-mark"><Boxes size={22} /></div><span>Aster<span>Stockly</span></span></div>
        <p className="eyebrow"><Sparkles size={13} /> INVENTORY, IN ORBIT</p>
        <h1>Stok terkendali.<br /><em>Bisnis melaju.</em></h1>
        <p className="auth-copy">Ruang kerja inventaris yang tenang, tajam, dan selalu siap memberi sinyal sebelum masalah datang.</p>
        <div className="trust"><ShieldCheck size={18} /> Data tiap akun terisolasi dan terlindungi</div>
        <div className="auth-perks"><span><Check size={15} /> Pantau stok minimum</span><span><Check size={15} /> Deteksi expiry</span><span><Check size={15} /> Notifikasi browser real-time</span></div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Masuk</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')}>Registrasi</button></div>
        <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Mulai workspace Anda'}</h2>
        <p className="muted">{mode === 'login' ? 'Masuk dengan email dan password Anda.' : 'Buat akun baru dengan email dan password.'}</p>
        <button className="google-button" type="button" onClick={signInWithGoogle} disabled={loading}><span className="google-mark">G</span> Lanjutkan dengan Google</button>
        <div className="auth-divider"><span>atau gunakan email</span></div>
        <form onSubmit={submitPassword}>
          {mode === 'signup' && <label>Nama lengkap<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Anda" /></label>}
          <label>Email<input required autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@bisnis.com" /></label>
          <label>Password<div className="password-field"><input required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 6 karakter" /><button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          <button className="submit-button" disabled={loading}>{loading ? 'Memproses...' : mode === 'login' ? 'Masuk ke workspace' : 'Buat akun'} <ArrowRight size={17} /></button>
        </form>
        {mode === 'login' && <a className="text-button" href="/auth/forgot-password">Lupa password?</a>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <p className="auth-legal">Dengan melanjutkan, Anda menyetujui kebijakan privasi AsterStockly.</p>
      </section>
    </main>
  )
}
