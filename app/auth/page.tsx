'use client'
import { useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { ArrowRight, Boxes, Check, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false); const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (mode === 'signup' && password !== confirmPassword) {
      setLoading(false)
      setMessage('Konfirmasi password tidak cocok.')
      return
    }
    if (!isSupabaseConfigured()) {
      setLoading(false)
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      return
    }
    const supabase = createClient()
    if (!supabase) {
      setLoading(false)
      setMessage('Layanan autentikasi belum tersedia di environment ini.')
      return
    }
    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { name: name.trim() },
              emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
            },
          })
      setLoading(false)
      if (result.error) {
        setMessage(result.error.message.toLowerCase().includes('confirm')
          ? 'Email Anda belum dikonfirmasi. Cek inbox untuk tautan konfirmasi.'
          : 'Email atau password belum benar. Silakan coba lagi.')
        return
      }
      if (mode === 'signup') {
        setMessage('Registrasi berhasil. Cek email untuk konfirmasi akun.')
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setMessage('Login berhasil, tetapi sesi belum tersedia. Silakan coba lagi.')
        return
      }
      window.location.assign('/')
    } catch {
      setLoading(false)
      setMessage('Login belum dapat diproses. Periksa koneksi lalu coba lagi.')
    }
  }
  return <main className="auth-page"><section className="auth-brand"><div className="logo"><div className="brand-mark"><Boxes size={22} /></div><span>Aster<span>Stockly</span></span></div><p className="eyebrow"><Sparkles size={13} /> INVENTORY, IN ORBIT</p><h1>Stok terkendali.<br /><em>Bisnis melaju.</em></h1><p className="auth-copy">Ruang kerja inventaris yang tenang, tajam, dan selalu siap memberi sinyal sebelum masalah datang.</p><div className="trust"><ShieldCheck size={18} /> Data tiap akun terisolasi dan terlindungi</div><div className="auth-perks"><span><Check size={15} /> Pantau stok minimum</span><span><Check size={15} /> Deteksi expiry</span><span><Check size={15} /> Notifikasi browser real-time</span></div></section><section className="auth-card"><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Masuk</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Registrasi</button></div><h2>{mode === 'login' ? 'Selamat datang kembali' : 'Mulai workspace Anda'}</h2><p className="muted">{mode === 'login' ? 'Masuk untuk melihat inventaris AsterStockly.' : 'Buat akun dan rapikan operasional hari ini.'}</p><form onSubmit={submit}>{mode === 'signup' && <label>Nama lengkap<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Anda" /></label>}<label>Email<input required autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@bisnis.com" /></label><label>Password<div className="password-field"><input required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 6 karakter" /><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{mode === 'signup' && <label>Konfirmasi password<div className="password-field"><input required minLength={6} autoComplete="new-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password" /><button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}{message && <p className="form-message">{message}</p>}<button className="primary full" disabled={loading}>{loading ? 'Memproses...' : mode === 'login' ? 'Masuk ke workspace' : 'Buat akun'} <ArrowRight size={17} /></button></form><p className="legal"><a href="/auth/forgot-password">Lupa password?</a><br />Dengan melanjutkan, Anda menyetujui penggunaan AsterStockly untuk kebutuhan operasional bisnis Anda.</p></section></main>
}
