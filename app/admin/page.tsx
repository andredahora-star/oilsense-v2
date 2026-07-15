'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/useAuth'

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin, supabase } = useAuth()
  const [subs, setSubs] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string,any>>({})
  const [loadingStats, setLoadingStats] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ company_name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState({ company_name: '', plan: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [actionMsg, setActionMsg] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [busyAction, setBusyAction] = useState<string|null>(null)
  const router = useRouter()

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/stats', {
      headers: session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {},
      cache: 'no-store',
    })
    if (res.ok) { const d = await res.json(); setSubs(d.subscriptions||[]); setStats(d.stats||{}) }
  }

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) { router.push('/dashboard'); return }
    loadStats().then(() => setLoadingStats(false))
  }, [authLoading, isAdmin])

  const loading = authLoading || loadingStats

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

  function toggleExpand(s: any) {
    if (expandedId === s.id) { setExpandedId(null); return }
    setExpandedId(s.id)
    setEditForm({ company_name: s.company_name || '', plan: s.plan || '' })
    setActionMsg(m => ({ ...m, [s.id]: undefined as any }))
  }

  async function callUpdateClient(body: Record<string, any>) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/update-client', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session?.access_token, ...body }),
    })
    const d = await res.json()
    if (!res.ok || !d.success) throw new Error(d.error || 'Erro')
    return d
  }

  async function saveEdit(subscriptionId: string) {
    setSavingEdit(true)
    try {
      await callUpdateClient({ subscription_id: subscriptionId, company_name: editForm.company_name, plan: editForm.plan })
      setActionMsg(m => ({ ...m, [subscriptionId]: { ok: true, text: 'Dados atualizados.' } }))
      await loadStats()
    } catch (e: any) {
      setActionMsg(m => ({ ...m, [subscriptionId]: { ok: false, text: e.message } }))
    } finally { setSavingEdit(false) }
  }

  async function toggleStatus(s: any) {
    const newStatus = s.status === 'suspenso' ? 'ativo' : 'suspenso'
    setBusyAction(s.id + ':status')
    try {
      await callUpdateClient({ subscription_id: s.id, status: newStatus })
      setActionMsg(m => ({ ...m, [s.id]: { ok: true, text: newStatus === 'suspenso' ? 'Cliente suspenso.' : 'Cliente reativado.' } }))
      await loadStats()
    } catch (e: any) {
      setActionMsg(m => ({ ...m, [s.id]: { ok: false, text: e.message } }))
    } finally { setBusyAction(null) }
  }

  async function impersonate(s: any) {
    setBusyAction(s.id + ':imp')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session?.access_token, target_user_id: s.user_id }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Erro')
      sessionStorage.setItem('impersonating', s.company_name)
      window.location.href = d.action_link
    } catch (e: any) {
      setActionMsg(m => ({ ...m, [s.id]: { ok: false, text: e.message } }))
      setBusyAction(null)
    }
  }
  async function resetPassword(s: any) {
    if (!s.email) { setActionMsg(m => ({ ...m, [s.id]: { ok: false, text: 'Cliente sem email associado.' } })); return }
    setBusyAction(s.id + ':reset')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(s.email, { redirectTo: window.location.origin + '/reset-password' })
      if (error) throw new Error(error.message)
      setActionMsg(m => ({ ...m, [s.id]: { ok: true, text: `Email de recuperação enviado para ${s.email}.` } }))
    } catch (e: any) {
      setActionMsg(m => ({ ...m, [s.id]: { ok: false, text: e.message } }))
    } finally { setBusyAction(null) }
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
      <Sidebar email={user?.email} isAdmin={isAdmin} alertCount={totals.alerts} />
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
            const suspended = s.status === 'suspenso'
            const isExpanded = expandedId === s.id
            const rowMsg = actionMsg[s.id]
            return (
              <div key={s.id} className="card" style={{marginBottom:'10px',padding:'0'}}>
                <div className="row-item" style={{cursor:'pointer'}} onClick={()=>toggleExpand(s)}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{s.company_name}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{s.email ? s.email+' — ' : ''}Plano: {s.plan} — Desde {new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
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
                  <span className={"badge " + (suspended ? 'badge-critical' : 'badge-normal')}>{s.status}</span>
                  <button className="btn btn-secondary btn-sm" style={{marginLeft:'12px'}} onClick={(e)=>{e.stopPropagation();toggleExpand(s)}}>
                    {isExpanded ? 'Fechar' : 'Gerenciar'}
                  </button>
                </div>
                {isExpanded && (
                  <div style={{padding:'16px 20px',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:'14px'}} onClick={e=>e.stopPropagation()}>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.06em'}}>Editar cadastro</div>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <input className="input" style={{maxWidth:'240px'}} placeholder="Nome da empresa" value={editForm.company_name} onChange={e=>setEditForm(f=>({...f,company_name:e.target.value}))} />
                        <input className="input" style={{maxWidth:'160px'}} placeholder="Plano" value={editForm.plan} onChange={e=>setEditForm(f=>({...f,plan:e.target.value}))} />
                        <button className="btn btn-primary btn-sm" disabled={savingEdit} onClick={()=>saveEdit(s.id)}>{savingEdit?'Salvando...':'Salvar'}</button>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',borderTop:'1px solid var(--border)',paddingTop:'14px'}}>
                      <button className="btn btn-primary btn-sm" disabled={busyAction===s.id+':imp' || suspended} onClick={()=>impersonate(s)} title={suspended ? 'Reative o cliente antes de entrar como ele' : ''}>
                        {busyAction===s.id+':imp' ? 'Entrando...' : 'Entrar como cliente →'}
                      </button>
                      <button className="btn btn-secondary btn-sm" disabled={busyAction===s.id+':reset'} onClick={()=>resetPassword(s)}>
                        {busyAction===s.id+':reset' ? 'Enviando...' : 'Resetar senha (enviar email)'}
                      </button>
                      <button className={"btn btn-sm " + (suspended ? 'btn-primary' : 'btn-secondary')} disabled={busyAction===s.id+':status'} onClick={()=>toggleStatus(s)}>
                        {busyAction===s.id+':status' ? 'Aguarde...' : (suspended ? 'Reativar cliente' : 'Suspender cliente')}
                      </button>
                    </div>
                    {rowMsg && (
                      <div style={{fontSize:'12px',padding:'10px 12px',borderRadius:'8px',background:rowMsg.ok?'#e6f7ef':'#fdecec',color:rowMsg.ok?'#059669':'#dc2626'}}>
                        {rowMsg.ok ? '✓ ' : '✗ '}{rowMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}