'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OilSense" style={{width:'64px',height:'64px',borderRadius:'14px',objectFit:'cover',margin:'0 auto 16px',display:'block'}} />
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'var(--text)',margin:'0 0 6px',letterSpacing:'-.4px'}}>OilSense</h1>
          <p style={{fontSize:'14px',color:'var(--text-muted)',margin:0}}>Acesse sua conta</p>
        </div>
        <form onSubmit={handleLogin} className="card card-lg" style={{boxShadow:'var(--shadow-md)'}}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'var(--text)',marginBottom:'6px'}}>E-mail</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'var(--text)',marginBottom:'6px'}}>Senha</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {error && <div style={{background:'#fdecec',border:'1px solid rgba(220,38,38,.25)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#dc2626'}}>{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'12px'}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:'24px',fontSize:'13px',color:'var(--text-muted)'}}>
          OilSense v2 — Manutenção preditiva de transformadores
        </p>
      </div>
    </div>
  )
}