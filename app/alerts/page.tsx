'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/navigation'

export default function Alerts() {
  const { user, subId, company, loading, isAdmin, alertCount, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState<'open'|'all'>('open')
  const router = useRouter()

  async function load() {
    if (!subId) return
    let q = supabase.from('alerts').select('*, transformers(identificacao,numero_serie), gearboxes(identificacao,numero_serie)').eq('subscription_id', subId).order('created_at', {ascending:false})
    if (filter === 'open') q = q.eq('resolved', false)
    const { data } = await q
    setItems(data||[])
  }

  useEffect(() => { load() }, [subId, filter])

  async function resolve(id: string) {
    await supabase.from('alerts').update({resolved:true}).eq('id', id)
    await load()
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/><span className="loading-text">Carregando...</span></div>

  const severityColor: Record<string,string> = { critical:'#ef4444', high:'#ef4444', medium:'#f59e0b', low:'#6b7f72' }
  const severityLabel: Record<string,string> = { critical:'CRITICO', high:'ALTO', medium:'MEDIO', low:'BAIXO' }

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Alertas</h1>
            <p className="page-subtitle">{items.length} alerta{items.length !== 1 ? 's' : ''} {filter === 'open' ? 'aberto' : 'no total'}{items.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{display:'flex',gap:'6px'}}>
            {(['open','all'] as const).map(f => (
              <button key={f} className={"btn btn-sm " + (filter === f ? 'btn-primary' : 'btn-secondary')} onClick={() => setFilter(f)}>
                {f === 'open' ? 'Abertos' : 'Todos'}
              </button>
            ))}
          </div>
        </header>
        <div className="page-body">
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#9651;</div>
              <div className="empty-title">{filter === 'open' ? 'Nenhum alerta aberto' : 'Nenhum alerta registrado'}</div>
              <div className="empty-text">{filter === 'open' ? 'Sistema operando normalmente' : ''}</div>
            </div>
          ) : items.map(a => {
            const isGearbox = !!a.gearbox_id
            const assetName = isGearbox ? (a.gearboxes?.identificacao || a.gearboxes?.numero_serie) : (a.transformers?.identificacao || a.transformers?.numero_serie)
            return (
            <div key={a.id} className="card" style={{marginBottom:'10px',borderColor:(severityColor[a.severity]||'var(--border)')+'44'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px',flexWrap:'wrap'}}>
                    <span className={"badge badge-" + (a.severity||'medium')}>{severityLabel[a.severity] || a.severity}</span>
                    <span style={{fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'4px',background:isGearbox?'rgba(217,119,6,.12)':'rgba(59,130,246,.12)',color:isGearbox?'#d97706':'#3b82f6',textTransform:'uppercase',letterSpacing:'.04em'}}>{isGearbox?'Redutor':'Transformador'}</span>
                    <span style={{fontSize:'14px',fontWeight:'600'}}>{a.title}</span>
                  </div>
                  <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'8px',lineHeight:1.5}}>{a.message}</p>
                  <div style={{fontSize:'12px',color:'var(--text-dim)',display:'flex',gap:'12px'}}>
                    <span>{assetName || '-'}</span>
                    <span>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px',flexShrink:0}}>
                  {a.resolved ? (
                    <span className="badge badge-normal">Resolvido</span>
                  ) : (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => router.push(isGearbox ? '/lube-analyses' + (a.gearbox_id ? '?gearbox='+a.gearbox_id : '') : '/analyses' + (a.transformer_id ? '?transformer='+a.transformer_id : ''))}>Ver analise</button>
                      <button className="btn btn-sm" style={{background:'rgba(30,164,101,.1)',color:'#10b981',border:'1px solid rgba(30,164,101,.2)'}} onClick={() => resolve(a.id)}>Resolver</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </main>
    </div>
  )
}