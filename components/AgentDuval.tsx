'use client'
import { useState } from 'react'
import {
  calcSeverity, rogersRatio, diagnosePaper, getSamplingInterval,
  DUVAL_ZONES, IEEE_ACTIONS,
} from '@/lib/duvalBrain'

const agentIco = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><rect x="3" y="4" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8 2v2M6 8h.01M10 8h.01M6.5 10.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'

// Painel de recomendações do Agente Duval — calculado no cliente a partir dos gases.
export default function AgentDuval({ analysis }: { analysis: any }) {
  const [narrative, setNarrative] = useState<string>(analysis.diagnostic || '')
  const [loading, setLoading] = useState(false)

  const g = (k: string) => Number(analysis[k]) || 0
  const h2 = g('h2'), ch4 = g('ch4'), c2h2 = g('c2h2'), c2h4 = g('c2h4')
  const c2h6 = g('c2h6'), co = g('co'), co2 = g('co2'), furfural = g('furfural')

  const sev = calcSeverity(h2, ch4, c2h2, c2h4, c2h6, co, co2, furfural)
  const duval = DUVAL_ZONES[sev.duval_code as keyof typeof DUVAL_ZONES]
  const rogers = rogersRatio(ch4, h2, c2h2, c2h4, c2h6)
  const paper = diagnosePaper(co, co2, furfural * 1000)
  const nextSampling = getSamplingInterval(sev)
  const ieeeAction = (IEEE_ACTIONS as any)['condition' + sev.ieee_condition]

  const rows: [string, string][] = [
    ['Triângulo de Duval', `${sev.duval_code} · ${duval?.desc || '—'}`],
    ['Rogers Ratio', rogers.code === 'N' ? 'Sem falha identificada' : `${rogers.code} · ${rogers.fault}`],
    ['Condição IEEE C57.104', `${sev.ieee_condition} / 4`],
    ['Papel isolante', paper.papelStatus === 'nao_avaliado' ? 'não avaliado' : paper.papelStatus],
    ['Próxima coleta', nextSampling.split(' — ')[0]],
  ]

  async function gerarParecer() {
    setLoading(true)
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysis.id }),
      })
      const d = await res.json()
      if (d.diagnostic) setNarrative(d.diagnostic)
      else if (d.error) setNarrative('Não foi possível gerar o parecer: ' + d.error)
    } catch (e: any) {
      setNarrative('Erro ao gerar parecer: ' + (e?.message || ''))
    } finally { setLoading(false) }
  }

  return (
    <div className="card">
      <div className="agent-head">
        <span className="agent-mark" dangerouslySetInnerHTML={{ __html: agentIco }} />
        <span className="agent-title">Agente Duval</span>
        <span className={'badge badge-' + sev.level} style={{ marginLeft: 'auto' }}>{sev.level}</span>
      </div>

      {rows.map(([k, v]) => (
        <div key={k} className="rec-row"><span className="rec-k">{k}</span><span className="rec-v">{v}</span></div>
      ))}

      <div className="rec-action">
        <div className="lbl">Ação recomendada</div>
        <div className="v">{ieeeAction}</div>
      </div>

      {narrative ? (
        <div className="diagnostic-box">
          <div className="diagnostic-label">Parecer técnico</div>
          <div className="diagnostic-text">{narrative}</div>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={gerarParecer} disabled={loading}>
          {loading ? 'Gerando parecer…' : 'Gerar parecer técnico (IA)'}
        </button>
      )}
    </div>
  )
}
