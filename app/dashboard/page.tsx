'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'

export default function Dashboard() {
  const { user, subId, company, loading, isAdmin, alertCount, supabase } = useAuth()
  const [stats, setStats]   = useState({ transformers:0, analyses:0, alerts:0, orders:0 })
  const [recent, setRecent] = useState<any[]>([])
  const [health, setHealth] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!subId) return
    Promise.all([
      supabase.from('transformers').select('id',{count:'exact',head:true}).eq('subscription_id',subId),
      supabase.from('lab_analyses').select('id',{count:'exact',head:true}).eq('subscription_id',subId),
      supabase.from('alerts').select('id',{count:'exact',head:true}).eq('subscription_id',subId).eq('resolved',false),
      supabase.from('service_orders').select('id',{count:'exact',head:true}).eq('subscription_id',subId).eq('status','aberta'),
      supabase.from('lab_analyses').select('*, transformers(identificacao)').eq('subscription_id',subId).order('created_at',{ascending:false}).limit(5),
      supabase.from('transformers').select('*').eq('subscription_id',subId).order('health_score',{ascending:true}).limit(6),
    ]).then(([t,a,al,o,rec,hlt])=>{
      setStats({ transformers:t.count||0, analyses:a.count||0, alerts:al.count||0, orders:o.count||0 })
      setRecent(rec.data||[])
      setHealth(hlt.data||[])
      setDataLoading(false)
    })
  }, [subId])

  if (loading || (subId && dataLoading)) return (
    <div className="loading-screen"><div className="spinner" /><span className="loading-text">Carregando OilSense...</span></div>
  )

  const statCards = [
    { label:'Transformadores', value:stats.transformers, color:'#3b82f6', bg:'rgba(59,130,246,.08)',  icon:'⬡', href:'/assets' },
    { label:'Analises',        value:stats.analyses,     color:'#a78bfa', bg:'rgba(167,139,250,.08)', icon:'⬡', href:'/analyses' },
    { label:'Alertas Ativos',  value:stats.alerts,       color:stats.alerts>0?'#f87171':'#10b981', bg:stats.alerts>0?'rgba(239,68,68,.08)':'rgba(30,164,101,.08)', icon:'△', href:'/alerts' },
    { label:'OS Abertas',      value:stats.orders,       color:stats.orders>0?'#fbbf24':'#10b981', bg:stats.orders>0?'rgba(245,158,11,.08)':'rgba(30,164,101,.08)', icon:'⚙', href:'/orders' },
  ]

  const scoreColor = (s:number) => s >= 85 ? '#10b981' : s >= 70 ? '#fbbf24' : '#ef4444'

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={stats.alerts} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Ola, {company || user?.email?.split('@')[0]}!</h1>
            <p className="page-subtitle">
              {recent[0]?.data_coleta
                ? 'Ultima analise: ' + new Date(recent[0].data_coleta+'T00:00:00').toLocaleDateString('pt-BR')
                : 'Importe os primeiros laudos para comecar o monitoramento'}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={()=>router.push('/import')}>
            Importar Laudos
          </button>
        </header>

        <div className="page-body">
          <div className="stat-grid">
            {statCards.map(s => (
              <div key={s.label} className="stat-card" onClick={()=>router.push(s.href)}>
                <div className="stat-icon" style={{background:s.bg}}>
                  <span style={{color:s.color,fontSize:'13px'}}>{s.icon}</span>
                </div>
                <div className="stat-value" style={{color:s.color}}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="card card-lg">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <span style={{fontSize:'12px',fontWeight:'700',color:'var(--text)',textTransform:'uppercase',letterSpacing:'.08em'}}>Saude dos Ativos</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>router.push('/assets')}>Ver todos</button>
              </div>
              {health.length === 0 ? (
                <div className="empty-state" style={{padding:'28px'}}>
                  <div className="empty-title">Nenhum ativo cadastrado</div>
                  <div className="empty-text">Importe laudos DGA para cadastrar transformadores</div>
                </div>
              ) : health.map(t => {
                const score = t.health_score || 0
                const color = scoreColor(score)
                return (
                  <div key={t.id} style={{marginBottom:'12px',cursor:'pointer'}} onClick={()=>router.push('/assets')}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'5px'}}>
                      <span style={{fontSize:'13px',fontWeight:'500'}}>{t.identificacao||t.numero_serie}</span>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'13px',fontWeight:'700',color}}>{score}</span>
                        <span className={'badge badge-' + (t.status||'normal')} style={{fontSize:'10px',padding:'1px 7px'}}>{t.status||'normal'}</span>
                      </div>
                    </div>
                    <div className="health-bar-wrap">
                      <div className="health-bar-fill" style={{width:score+'%', background:color}} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card card-lg">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <span style={{fontSize:'12px',fontWeight:'700',color:'var(--text)',textTransform:'uppercase',letterSpacing:'.08em'}}>Ultimas Analises</span>
                <button className="btn btn-secondary btn-sm" onClick={()=>router.push('/analyses')}>Ver todas</button>
              </div>
              {recent.length === 0 ? (
                <div className="empty-state" style={{padding:'28px'}}>
                  <div className="empty-title">Nenhuma analise importada</div>
                  <div className="empty-text">Importe seus laudos DGA para ver os resultados aqui</div>
                </div>
              ) : recent.map(a => (
                <div key={a.id} className="row-item" style={{padding:'9px 12px',marginBottom:'4px',cursor:'pointer'}} onClick={()=>router.push('/analyses')}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'600',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {a.transformers?.identificacao||'Transformador'}
                    </div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                      {a.data_coleta ? new Date(a.data_coleta+'T00:00:00').toLocaleDateString('pt-BR') : '-'} · {a.oil_type||'Mineral'}
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