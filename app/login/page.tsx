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
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{width:'100%',maxWidth:'400px',padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:'40px'}}>
          <div style={{width:'56px',height:'56px',borderRadius:'14px',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:'#0d1117',margin:'0 auto 16px'}}>OS</div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#e6edf3',margin:'0 0 6px'}}>OilSense</h1>
          <p style={{fontSize:'14px',color:'#8b949e',margin:0}}>Acesse sua conta</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'500',color:'#e6edf3',marginBottom:'6px'}}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{width:'100%',padding:'10px 14px',background:'#161b22',border:'1px solid #30363d',borderRadius:'8px',color:'#e6edf3',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              placeholder="seu@email.com"
            />
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'500',color:'#e6edf3',marginBottom:'6px'}}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{width:'100%',padding:'10px 14px',background:'#161b22',border:'1px solid #30363d',borderRadius:'8px',color:'#e6edf3',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              placeholder="••••••••"
            />
          </div>
          {error && <div style={{background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.3)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#e74c3c'}}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{width:'100%',padding:'12px',background:loading?'#1a4731':'#22c55e',color:'#0d1117',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'600',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit'}}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:'24px',fontSize:'13px',color:'#8b949e'}}>
          OilSense v2 — Manutenção preditiva de transformadores
        </p>
      </div>
    </div>
  )
}