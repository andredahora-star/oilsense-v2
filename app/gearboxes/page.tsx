'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'

export default function Gearboxes() {
  const { user, subId, company, loading, isAdmin, alertCount, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!subId) return
    supabase.from('gearboxes').select('*').eq('subscription_id', subId).order('health_score', {ascending:true}).then(({data}) => setItems(data||[]))
  }, [subId])

  if (loading) return <div className="loading-screen"><div className="spinner"/><span className="loading-text">Carregando...</span></div>

  const filtered = items.filter(t =>
    (t.identificacao||'').toLowerCase().includes(search.toLowerCase()) ||
    (t.numero_serie||'').toLowerCase().includes(search.toLowerCase()) ||
    (t.localizacao||'').toLowerCase().includes(search.toLowerCase())
  )
  const scoreColor = (s: number) => s >= 85 ? '#10b981' : s >= 70 ? '#fbbf24' : '#ef4444'
  const badgeClass = (s: string) => s === 'critico' ? 'badge-critico' : s === 'atencao' ? 'badge-atencao' : 'badge-normal'
  const badgeLabel = (s: string) => s === 'critico' ? 'Critico' : s === 'atencao' ? 'Atencao' : 'Normal'

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Redutores</h1>
            <p className="page-subtitle">{items.length} redutor{items.length !== 1 ? 'es' : ''} monitorado{items.length !== 1 ? 's' : ''} · Óleo lubrificante</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/lube-import')}>Importar Laudos</button>
        </header>
        <div className="page-body">
          <div className="stat-grid" style={{marginBottom:'20px'}}>
            {[
              {l:'Total',    v:items.length, c:'var(--text)'},
              {l:'Normal',   v:items.filter(t=>t.status==='normal').length,  c:'#10b981'},
              {l:'Atencao',  v:items.filter(t=>t.status==='atencao').length, c:'#fbbf24'},
              {l:'Critico',  v:items.filter(t=>t.status==='critico').length, c:'#ef4444'},
            ].map(s => (
              <div key={s.l} className="stat-card" style={{padding:'14px 18px'}}>
                <div className="stat-value" style={{fontSize:'24px', color:s.c}}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:'16px'}}>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por identificacao, serie ou localizacao..." />
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">{search ? 'Nenhum resultado' : 'Nenhum redutor ainda'}</div>
              <div className="empty-text">{!search && 'Importe laudos de óleo lubrificante para cadastrar redutores automaticamente'}</div>
            </div>
          ) : filtered.map(t => {
            const score = t.health_score || 0
            const color = scoreColor(score)
            return (
              <div key={t.id} className="row-item" onClick={() => router.push('/lube-analyses?gearbox=' + t.id)}>
                <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'rgba(217,119,6,.08)',border:'1px solid rgba(217,119,6,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="2.3" stroke="#d97706" strokeWidth="1.4"/><circle cx="11" cy="10.5" r="1.6" stroke="#d97706" strokeWidth="1.4"/><path d="M6 3.4V2M6 10V8.6M2 6H3.4M8.6 6H10M4.1 3.9L3.1 2.9M4.1 3.9L4.9 4.7" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.identificacao || t.numero_serie}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                    {t.fabricante && <span>{t.fabricante}</span>}
                    {t.potencia_kw && <span>{t.potencia_kw} kW</span>}
                    {t.relacao_reducao && <span>Redução {t.relacao_reducao}</span>}
                    {t.localizacao && <span>{t.localizacao}</span>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
                  <div style={{width:'80px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                      <span style={{fontSize:'11px',color:'var(--text-muted)'}}>Health</span>
                      <span style={{fontSize:'12px',fontWeight:'700',color}}>{score}</span>
                    </div>
                    <div className="health-bar-wrap">
                      <div className="health-bar-fill" style={{width:score+'%', background:color}} />
                    </div>
                  </div>
                  <span className={"badge " + badgeClass(t.status||'normal')}>{badgeLabel(t.status||'normal')}</span>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
