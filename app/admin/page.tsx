'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ADMIN_EMAILS = ['andredahora@oilssense.com']

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string,any>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ company_name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/stats', {
      headers: session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {},
    })
    if (res.ok) { const d = await res.json(); setSubs(d.subscriptions||[]); setStats(d.stats||{}) }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(session.user.email||'')) { router.push('/dashboard'); return }
      setUser(session.user)
      await loadStats()
      setLoading(false)
    })
  }, [])

  function genPassword() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
    let p = ''; for (let i = 0; i < 12; i++) p += c[Math.floor(Math.random() * c.length)]
    setForm(f => ({ ...f, password: p }))
  }

  async function createClient_() {
    setCreating(true); setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/create-client', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session?.access_token, ...form }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Erro')
      setMsg({ ok: true, text: `Cliente "${form.company_name}" criado. Login: ${form.email} / senha: ${form.password}` })
      setForm({ company_name: '', email: '', password: '' })
      await loadStats()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
    } finally { setCreating(false) }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/><span className="loading-text">Carregando...</span></div>

  const clientes = subs.filter((s: any) => s.plan !== 'admin')
  const totals = subs.reduce((acc: any, s: any) => {
    const st = stats[s.id] || {}
    return {
      transformers: acc.transformers + (st.transformers||0),
      analyses: acc.analyses + (st.analyses||0),
      alerts: acc.alerts + (st.alerts||0),
      orders: acc.orders + (st.orders||0)
    }
  }, {transformers:0, analyses:0, alerts:0, orders:0})

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} isAdmin={true} alertCount={totals.alerts} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:'10px'}}>
              Master Admin <span className="badge badge-admin">Admin</span>
            </h1>
            <p className="page-subtitle">Visao geral de todos os clientes</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>{setShowForm(v=>!v);setMsg(null)}}>
            {showForm ? 'Cancelar' : '+ Novo Cliente'}
          </button>
        </header>
        <div className="page-body">
          {showForm && (
            <div className="card" style={{marginBottom:'20px',maxWidth:'560px'}}>
              <div className="agent-head"><span className="agent-title">Criar novo cliente</span></div>
              <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'14px'}}>Cria um login e uma conta isolada (tenant). Os dados desse cliente ficam separados dos demais.</p>
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <input className="input" placeholder="Nome da empresa" value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value}))} />
                <input className="input" type="email" placeholder="E-mail de login" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                <div style={{display:'flex',gap:'8px'}}>
                  <input className="input" placeholder="Senha (mín. 8 caracteres)" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
                  <button className="btn btn-secondary btn-sm" type="button" onClick={genPassword}>Gerar</button>
                </div>
                <button className="btn btn-primary" disabled={creating||!form.company_name||!form.email||form.password.length<8} onClick={createClient_}>
                  {creating ? 'Criando...' : 'Criar cliente'}
                </button>
                {msg && (
                  <div style={{fontSize:'12px',padding:'10px 12px',borderRadius:'8px',background:msg.ok?'#e6f7ef':'#fdecec',color:msg.ok?'#059669':'#dc2626',lineHeight:1.5}}>
                    {msg.ok ? '✓ ' : '✗ '}{msg.text}
                    {msg.ok && <div style={{marginTop:'4px',color:'var(--text-muted)'}}>Anote a senha — ela não será exibida novamente.</div>}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="stat-grid" style={{marginBottom:'24px'}}>
            {[
              {l:'Clientes',        v:clientes.length,      c:'var(--text)'},
              {l:'Transformadores', v:totals.transformers,  c:'#3b82f6'},
              {l:'Alertas',         v:totals.alerts,        c:'#ef4444'},
              {l:'OS Abertas',      v:totals.orders,        c:'#fbbf24'},
            ].map(s => (
              <div key={s.l} className="stat-card" style={{padding:'14px 18px',cursor:'default'}}>
                <div className="stat-value" style={{fontSize:'24px',color:s.c}}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>
          <h2 style={{fontSize:'13px',fontWeight:'600',marginBottom:'14px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Clientes</h2>
          {clientes.length === 0 ? (
            <div className="empty-state"><div className="empty-title">Nenhum cliente ainda</div></div>
          ) : clientes.map((s: any) => {
            const st = stats[s.id] || {}
            return (
              <div key={s.id} className="row-item">
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{s.company_name}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)'}}>Plano: {s.plan} — Desde {new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{display:'flex',gap:'20px'}}>
                  {[
                    {l:'Ativos',   v:st.transformers, c:'#3b82f6'},
                    {l:'Analises', v:st.analyses,     c:'var(--text)'},
                    {l:'Alertas',  v:st.alerts,       c:'#ef4444'},
                    {l:'OS',       v:st.orders,       c:'#fbbf24'},
                  ].map(x => (
                    <div key={x.l} style={{textAlign:'center'}}>
                      <div style={{fontSize:'18px',fontWeight:'700',color:(x.v||0)>0?x.c:'var(--text-dim)'}}>{x.v||0}</div>
                      <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <span className={"badge " + (s.status==='active'?'badge-normal':'')}>{s.status}</span>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}