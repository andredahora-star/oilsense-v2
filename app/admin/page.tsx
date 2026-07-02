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
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(session.user.email||'')) { router.push('/dashboard'); return }
      setUser(session.user)
      const res = await fetch('/api/admin/stats')
      if (res.ok) { const d = await res.json(); setSubs(d.subscriptions||[]); setStats(d.stats||{}) }
      setLoading(false)
    })
  }, [])

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
        </header>
        <div className="page-body">
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