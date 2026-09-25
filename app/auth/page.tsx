'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Boxes, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

const redirectUrl = () =>
  process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    if (!isSupabaseConfigured() || !supabase) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: mode === 'signup',
        emailRedirectTo: redirectUrl(),
        data: mode === 'signup' ? { name: name.trim() } : undefined,
      },
    })
    setLoading(false)
    if (error) {
      setMessage('Kode OTP belum dapat dikirim. Pastikan email valid lalu coba lagi.')
      return
    }
    setStep('otp')
    setCooldown(30)
    setMessage(`Kode OTP sudah dikirim ke ${email.trim()}.`)
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    if (!supabase) {
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })
    setLoading(false)
    if (error) {
      setMessage('Kode OTP salah atau sudah kedaluwarsa.')
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
        <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setStep('email'); setMessage('') }}>Masuk</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setStep('email'); setMessage('') }}>Registrasi</button></div>
        <h2>{step === 'otp' ? 'Masukkan kode OTP' : mode === 'login' ? 'Selamat datang kembali' : 'Mulai workspace Anda'}</h2>
        <p className="muted">{step === 'otp' ? 'Gunakan kode 6 digit yang dikirim ke email Anda.' : 'Masuk tanpa password menggunakan email atau Google.'}</p>
        {step === 'email' ? <>
          <button className="google-button" type="button" onClick={signInWithGoogle} disabled={loading}><span className="google-mark">G</span> Lanjutkan dengan Google</button>
          <div className="auth-divider"><span>atau gunakan OTP email</span></div>
          <form onSubmit={requestOtp}>{mode === 'signup' && <label>Nama lengkap<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Anda" /></label>}<label>Email<input required autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@bisnis.com" /></label><button className="submit-button" disabled={loading}>{loading ? 'Mengirim kode...' : 'Kirim kode OTP'} <ArrowRight size={17} /></button></form>
        </> : <form onSubmit={verifyOtp}><label>Kode OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" /></label><button className="submit-button" disabled={loading}>{loading ? 'Memverifikasi...' : 'Verifikasi dan masuk'} <ArrowRight size={17} /></button><button type="button" className="text-button" disabled={cooldown > 0 || loading} onClick={() => { setStep('email'); setOtp(''); setMessage('') }}>{cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : 'Kirim ulang kode'}</button></form>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <p className="auth-legal">Dengan melanjutkan, Anda menyetujui kebijakan privasi AsterStockly.</p>
      </section>
    </main>
  )
}
