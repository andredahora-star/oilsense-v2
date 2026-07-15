'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
import AgentLube from '@/components/AgentLube'

const LUBE_FIELDS: { key: string; label: string; unit: string; norm: string }[] = [
  { key: 'viscosidade_40', label: 'Viscosidade 40°C', unit: 'cSt', norm: 'ASTM D445' },
  { key: 'viscosidade_100', label: 'Viscosidade 100°C', unit: 'cSt', norm: 'ASTM D445' },
  { key: 'tan_mg_koh', label: 'TAN', unit: 'mgKOH/g', norm: 'ASTM D664' },
  { key: 'agua_ppm', label: 'Teor de Água', unit: 'ppm', norm: 'ASTM D6304' },
]
const ISO_FIELDS: { key: string; label: string }[] = [
  { key: 'iso_4406_pequena', label: '≥4µm' }, { key: 'iso_4406_media', label: '≥6µm' }, { key: 'iso_4406_grande', label: '≥14µm' },
]
const METAL_FIELDS: { key: string; label: string }[] = [
  { key: 'fe_ppm', label: 'Fe' }, { key: 'cu_ppm', label: 'Cu' }, { key: 'cr_ppm', label: 'Cr' }, { key: 'pb_ppm', label: 'Pb' },
  { key: 'sn_ppm', label: 'Sn' }, { key: 'al_ppm', label: 'Al' }, { key: 'ni_ppm', label: 'Ni' }, { key: 'ag_ppm', label: 'Ag' },
  { key: 'si_ppm', label: 'Si' }, { key: 'na_ppm', label: 'Na' }, { key: 'k_ppm', label: 'K' },
]

function fmtDate(d?: string) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '' }

function List() {
  const { user, subId, company, loading, isAdmin, alertCount, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const params = useSearchParams()
  const gid = params.get('gearbox')
  const router = useRouter()

  useEffect(() => {
    if (!subId) return
    let q = supabase.from('lube_analyses').select('*, gearboxes(identificacao,numero_serie,localizacao,iso_vg)').eq('subscription_id', subId).order('data_coleta', { ascending: false })
    if (gid) q = q.eq('gearbox_id', gid)
    q.then(({ data }: any) => setItems(data || []))
  }, [subId, gid])

  if (loading) return <div className="loading-screen"><div className="spinner" /><span className="loading-text">Carregando...</span></div>

  const gName = items[0]?.gearboxes?.identificacao || items[0]?.gearboxes?.numero_serie || 'Redutor'

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">{gid ? gName : 'Análises de Óleo Lubrificante'}</h1>
            <p className="page-subtitle">{items.length} análise{items.length !== 1 ? 's' : ''}{gid ? '' : ' · todos os redutores'}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/gearboxes')}>← Redutores</button>
        </header>
        <div className="page-body">
          {gid && items[0] && (
            <div style={{ marginBottom: '16px' }}>
              <AgentLube analysis={items[0]} prevAnalysis={items[1]} isoVg={items[0]?.gearboxes?.iso_vg} />
            </div>
          )}
          {items.length === 0 ? (
            <div className="empty-state"><div className="empty-title">Nenhuma análise ainda</div><div className="empty-text">Importe um laudo de óleo lubrificante para começar</div></div>
          ) : items.map((a: any) => {
            const qStatus = a.lube_quality_status
            const badgeClass = qStatus === 'critico' ? 'badge-critical' : qStatus === 'atencao' ? 'badge-medium' : 'badge-normal'
            return (
              <div key={a.id} className="card" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{fmtDate(a.data_coleta)}</div>
                  {!gid && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.gearboxes?.identificacao || a.gearboxes?.numero_serie}</div>}
                  {a.numero_laudo && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{a.numero_laudo}</div>}
                  {qStatus && <span className={'badge ' + badgeClass} style={{ marginLeft: 'auto' }}>{qStatus}</span>}
                </div>

                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>Propriedades do Óleo</div>
                <div className="gas-grid">
                  {LUBE_FIELDS.map(f => {
                    const v = a[f.key]
                    const isIssue = a.lube_quality_issues && v != null && a.lube_quality_issues.toLowerCase().includes(f.label.toLowerCase().split(' ')[0])
                    return (
                      <div key={f.key} className="gas-cell" style={isIssue ? { borderColor: 'rgba(220,38,38,.35)' } : {}}>
                        <div className="gas-name">{f.label}</div>
                        <div className="gas-value" style={{ color: v != null ? (isIssue ? '#dc2626' : 'var(--text)') : 'var(--text-dim)' }}>{v != null ? v : '-'}</div>
                        {v != null && <div className="gas-unit">{f.unit}</div>}
                      </div>
                    )
                  })}
                </div>

                {ISO_FIELDS.some(f => a[f.key] != null) && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '14px 0 8px' }}>ISO 4406 — Contagem de Partículas</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>
                      {ISO_FIELDS.map(f => a[f.key] ?? '-').join(' / ')}
                    </div>
                  </>
                )}

                {METAL_FIELDS.some(f => a[f.key] != null) && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '14px 0 8px' }}>Espectrometria (ASTM D5185) — Metais de Desgaste e Contaminação</div>
                    <div className="gas-grid">
                      {METAL_FIELDS.filter(f => a[f.key] != null).map(f => (
                        <div key={f.key} className="gas-cell">
                          <div className="gas-name">{f.label}</div>
                          <div className="gas-value">{a[f.key]}</div>
                          <div className="gas-unit">ppm</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {a.lube_quality_issues && (
                  <div style={{ fontSize: '11.5px', color: '#d97706', marginTop: '12px', lineHeight: 1.5, background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.25)', borderRadius: '8px', padding: '10px 12px' }}>
                    {a.lube_quality_issues.split(' | ').map((it: string, i: number) => <div key={i}>• {it}</div>)}
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

export default function LubeAnalysesPage() {
  return <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}><List /></Suspense>
}
