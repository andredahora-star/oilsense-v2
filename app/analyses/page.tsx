'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
import TrendChart from '@/components/TrendChart'
import AgentDuval from '@/components/AgentDuval'
import DuvalChat from '@/components/DuvalChat'
import { calcSeverity } from '@/lib/duvalBrain'

const GASES = ['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6', 'CO', 'CO2', 'Furfural']
const GAS_KEYS = ['h2', 'ch4', 'c2h2', 'c2h4', 'c2h6', 'co', 'co2', 'furfural']
const gasColors: Record<string, string> = { h2: '#2563eb', ch4: '#7c3aed', c2h2: '#dc2626', c2h4: '#d97706', c2h6: '#059669', co: '#ca8a04', co2: '#0d9488', furfural: '#db2777' }

function fmtDate(d?: string) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '' }

function List() {
  const { user, subId, company, loading, isAdmin, alertCount, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [trendGas, setTrendGas] = useState('h2')
  const params = useSearchParams()
  const tid = params.get('transformer')
  const router = useRouter()

  useEffect(() => {
    if (!subId) return
    let q = supabase.from('lab_analyses').select('*, transformers(identificacao,numero_serie,localizacao)').eq('subscription_id', subId).order('data_coleta', { ascending: true })
    if (tid) q = q.eq('transformer_id', tid)
    q.then(({ data }: any) => setItems(data || []))
  }, [subId, tid])

  if (loading) return <div className="loading-screen"><div className="spinner" /><span className="loading-text">Carregando...</span></div>

  const timeline = [...items].reverse()          // mais recente primeiro (lista)
  const latest = items[items.length - 1]         // mais recente (topo)
  const trendPairs = items.filter((a: any) => a[trendGas] != null).map((a: any) => ({ v: Number(a[trendGas]), d: a.data_coleta }))
  const trendValues = trendPairs.map(p => p.v)
  const trendLabels = trendPairs.map(p => fmtDate(p.d))
  const tName = latest?.transformers?.identificacao || latest?.transformers?.numero_serie || 'Transformador'

  // Contexto para o chat do Duval
  let chatContext = ''
  if (tid && latest) {
    const g = (k: string) => Number(latest[k]) || 0
    const sev = calcSeverity(g('h2'), g('ch4'), g('c2h2'), g('c2h4'), g('c2h6'), g('co'), g('co2'), g('furfural'))
    chatContext = [
      `Transformador: ${tName}${latest.transformers?.localizacao ? ' — ' + latest.transformers.localizacao : ''}.`,
      `Última análise (${fmtDate(latest.data_coleta)}): H2=${g('h2')} CH4=${g('ch4')} C2H2=${g('c2h2')} C2H4=${g('c2h4')} C2H6=${g('c2h6')} CO=${g('co')} CO2=${g('co2')} Furfural=${g('furfural')} ppm. Óleo: ${latest.oil_type || 'Mineral'}.`,
      `Severidade calculada: ${sev.level} (score ${sev.score}/100, Duval ${sev.duval_code}, IEEE condição ${sev.ieee_condition}/4).`,
      `Total de análises deste ativo: ${items.length}.`,
    ].join('\n')
  }

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Análises{tid ? ' · ' + tName : ''}</h1>
            <p className="page-subtitle">{items.length} análise{items.length !== 1 ? 's' : ''}{tid ? ' deste ativo' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {tid && <button className="btn btn-secondary btn-sm" onClick={() => router.push('/analyses')}>Todos os ativos</button>}
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/import')}>Importar</button>
          </div>
        </header>

        <div className="page-body">
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#9123;</div>
              <div className="empty-title">Nenhuma análise ainda</div>
              <div className="empty-text">Importe laudos DGA para ver os gases, a tendência e o diagnóstico DUVAL</div>
            </div>
          ) : (
            <>
              {/* Tendência + Agente Duval + Chat (apenas na visão de um ativo) */}
              {tid && (
                <>
                  {trendValues.length >= 2 && (
                    <div className="card" style={{ marginBottom: '16px' }}>
                      <div className="trend-head">
                        <span className="agent-title">Tendência das Análises — {GASES[GAS_KEYS.indexOf(trendGas)]} (ppm)</span>
                        <div className="gas-pills">
                          {GAS_KEYS.map((k, i) => (
                            <button key={k} className={'gas-pill' + (trendGas === k ? ' active' : '')} onClick={() => setTrendGas(k)}>{GASES[i]}</button>
                          ))}
                        </div>
                      </div>
                      <TrendChart values={trendValues} labels={trendLabels} color={gasColors[trendGas]} />
                      <div className="trend-stats">
                        <div className="trend-stat"><div className="k">Primeira</div><div className="v">{trendValues[0]} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>ppm</span></div><div className="d">{trendLabels[0]}</div></div>
                        <div className="trend-stat"><div className="k">Atual</div><div className="v" style={{ color: gasColors[trendGas] }}>{trendValues[trendValues.length - 1]} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>ppm</span></div><div className="d">{trendLabels[trendLabels.length - 1]}</div></div>
                      </div>
                    </div>
                  )}
                  {latest && (
                    <div className="two-col" style={{ marginBottom: '16px' }}>
                      <AgentDuval analysis={latest} />
                      <DuvalChat context={chatContext} suggestions={['Por que a severidade está assim?', 'O que fazer agora?', 'Qual a tendência do C2H2?']} />
                    </div>
                  )}
                </>
              )}

              {/* Timeline de análises */}
              {timeline.map((a, idx) => {
                const vals = GAS_KEYS.map(k => a[k])
                const prev = idx < timeline.length - 1 ? timeline[idx + 1] : null
                return (
                  <div key={a.id} className="card" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                          {tid ? (a.transformers?.identificacao || a.transformers?.numero_serie || 'Transformador') : (
                            <button style={{ background: 'none', border: 'none', color: 'var(--accent-text)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: 0 }} onClick={() => router.push('/analyses?transformer=' + a.transformer_id)}>
                              {a.transformers?.identificacao || a.transformers?.numero_serie || 'Transformador'}
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <span>Laudo {a.numero_laudo || '-'}</span>
                          <span>{a.laboratorio || '-'}</span>
                          {a.data_coleta && <span>{fmtDate(a.data_coleta)}</span>}
                          <span>{a.oil_type || 'Mineral'}</span>
                        </div>
                      </div>
                      {a.severity && <span className={'badge badge-' + a.severity} style={{ flexShrink: 0 }}>{a.severity}</span>}
                    </div>
                    <div className="gas-grid">
                      {GASES.map((gname, i) => {
                        const v = vals[i]; const pv = prev ? prev[GAS_KEYS[i]] : null
                        const delta = (v != null && pv != null) ? v - pv : null
                        const hi = v != null && ((gname === 'C2H2' && v > 1) || (gname === 'H2' && v > 150) || (gname === 'CH4' && v > 130))
                        return (
                          <div key={gname} className="gas-cell" style={hi ? { borderColor: 'rgba(220,38,38,.35)' } : {}}>
                            <div className="gas-name">{gname}</div>
                            <div className="gas-value" style={{ color: v != null ? (hi ? '#dc2626' : 'var(--text)') : 'var(--text-dim)' }}>{v != null ? v : '-'}</div>
                            {v != null && <div className="gas-unit">ppm</div>}
                            {delta != null && delta !== 0 && <div style={{ fontSize: '9px', marginTop: '3px', color: delta > 0 ? '#dc2626' : '#059669', fontWeight: '600' }}>{delta > 0 ? '+' : ''}{delta.toFixed(0)}</div>}
                          </div>
                        )
                      })}
                    </div>
                    {!tid && a.diagnostic && (
                      <div className="diagnostic-box">
                        <div className="diagnostic-label">Parecer DUVAL</div>
                        <div className="diagnostic-text">{a.diagnostic}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function Analyses() {
  return (
    <Suspense fallback={<div className="loading-screen"><div className="spinner" /><span className="loading-text">Carregando...</span></div>}>
      <List />
    </Suspense>
  )
}
