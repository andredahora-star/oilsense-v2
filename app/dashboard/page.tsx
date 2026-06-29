'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ADMIN_EMAILS = ['andredahora@oilssense.com']

export default function Dashboard() {
  const [user, setUser]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subId, setSubId]   = useState<string|null>(null)
  const [company, setCompany] = useState('')
  const [stats, setStats]   = useState({ transformers:0, analyses:0, alerts:0, orders:0 })
  const [recent, setRecent] = useState<any[]>([])
  const [health, setHealth] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: sub } = await supabase
        .from('subscriptions').select('id, company_name').eq('user_id', session.user.id).single()

      if (!sub) { setLoading(false); return }
      setSubId(sub.id)
      setCompany(sub.company_name)

      const [t, a, al, o, rec, hlt] = await Promise.all([
        supabase.from('transformers').select('id',{count:'exact',head:true}).eq('subscription_id',sub.id),
        supabase.from('lab_analyses').select('id',{count:'exact',head:true}).eq('subscription_id',sub.id),
        supabase.from('alerts').select('id',{count:'exact',head:true}).eq('subscription_id',sub.id).eq('resolved',false),
        supabase.from('service_orders').select('id',{count:'exact',head:true}).eq('subscription_id',sub.id).eq('status','aberta'),
        supabase.from('lab_analyses').select('*, transformers(identificacao)').eq('subscription_id',sub.id).order('created_at',{ascending:false}).limit(5),
        supabase.from('transformers').select('*').eq('subscription_id',sub.id).order('health_score',{ascending:true}).limit(6),
      ])

      setStats({ transformers:t.count||0, analyses:a.count||0, alerts:al.count||0, orders:o.count||0 })
      setRecent(rec.data||[])
      setHealth(hlt.data||[])
      setLoading(false)
    })
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(user?.email||'')

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span className="loading-text">Carregando OilSense...</span>
    </div>
  )

  const severityColor: Record<string,string> = { normal:'#4ade80', medium:'#fbbf24', high:'#f87171', critical:'#f87171', atencao:'#fbbf24', critico:'#f87171' }

  const statCards = [
    { label:'Transformadores', value:stats.transformers, color:'#3b82f6', bg:'rgba(59,130,246,.08)', icon:'⬡', href:'/assets' },
    { label:'Análises',        value:stats.analyses,     color:'#a78bfa', bg:'rgba(167,139,250,.08)', icon:'⬡', href:'/analyses' },
    { label:'Alertas Ativos',  value:stats.alerts,       color:stats.alerts>0?'#f87171':'#4ade80', bg:stats.alerts>0?'rgba(239,68,68,.08)':'rgba(34,197,94,.08)', icon:'△', href:'/alerts' },
    { label:'OS Abertas',      value:stats.orders,       color:stats.orders>0?'#fbbf24':'#4ade80', bg:stats.orders>0?'rgba(245,158,11,.08)':'rgba(34,197,94,.08)', icon:'⚙', href:'/orders' },
  ]

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} isAdmin={isAdmin} alertCount={stats.alerts} />

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Olá, {company || user?.email?.split('@')[0]}!</h1>
            <p className="page-subtitle">
              {recent[0]?.data_coleta
                ? 'Última análise: ' + new Date(recent[0].data_coleta).toLocaleDateString('pt-BR')
                : 'Importe os primeiros laudos para começar o monitoramento'}
            </p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>router.push('/import')}>
              ↑ Importar Laudos
            </button>
          </div>
        </header>

        <div className="page-body">
          {/* Stats */}
          <div className="stat-grid">
            {statCards.map(s => (
              <div key={s.label} className="stat-card" onClick={()=>router.push(s.href)}>
                <div className="stat-icon" style={{background:s.bg}}>
                  <span style={{color:s.color,fontSize:'14px'}}>{s.icon}</span>
                </div>
                <div className="stat-value" style={{color:s.color}}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            {/* Saúde dos transformadores */}
            <div className="card card-lg">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <span style={{fontSize:'13px',fontWeight:'700',color:'var(--text)',textTransform:'uppercase',letterSpacing:'.06em'}}>Saúde dos Ativos</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>router.push('/assets')}>Ver todos →</button>
              </div>
              {health.length === 0 ? (
                <div className="empty-state" style={{padding:'32px'}}>
                  <div className="empty-icon">⬡</div>
                  <div className="empty-title">Nenhum ativo cadastrado</div>
                  <div className="empty-text">Importe laudos DGA para cadastrar transformadores</div>
                </div>
              ) : health.map(t => {
                const score = t.health_score || 0
                const barColor = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={t.id} style={{marginBottom:'12px'}} onClick={()=>router.push('/assets')}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      <span style={{fontSize:'13px',fontWeight:'500'}}>{t.identificacao||t.numero_serie}</span>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'13px',fontWeight:'700',color:barColor}}>{score}</span>
                        <span className={'badge badge-' + (t.status||'normal')} style={{fontSize:'10px',padding:'2px 8px'}}>{t.status||'normal'}</span>
                      </div>
                    </div>
                    <div className="health-bar-wrap">
                      <div className="health-bar-fill" style={{width:score+'%', background:barColor}} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Últimas análises */}
            <div className="card card-lg">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <span style={{fontSize:'13px',fontWeight:'700',color:'var(--text)',textTransform:'uppercase',letterSpacing:'.06em'}}>Últimas Análises</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>router.push('/analyses')}>Ver todas →</button>
              </div>
              {recent.length === 0 ? (
                <div className="empty-state" style={{padding:'32px'}}>
                  <div className="empty-icon">⬡</div>
                  <div className="empty-title">Nenhuma análise importada</div>
                  <div className="empty-text">Importe seus laudos DGA para ver os resultados aqui</div>
                </div>
              ) : recent.map(a => (
                <div key={a.id} className="row-item" style={{padding:'10px 14px',marginBottom:'6px',cursor:'pointer'}} onClick={()=>router.push('/analyses')}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'600',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {a.transformers?.identificacao||'Transformador'}
                    </div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                      {a.data_coleta ? new Date(a.data_coleta).toLocaleDateString('pt-BR') : '—'} · {a.oil_type||'Mineral'}
                    </div>
                  </div>
                  <span className={'badge badge-' + (a.severity||'normal')}>{a.severity||'normal'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}