'use client'
import { useState } from 'react'
import { evalLubeQuality, type LubeQualityInput } from '@/lib/lubeBrain'

const agentIco = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><rect x="3" y="4" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8 2v2M6 8h.01M10 8h.01M6.5 10.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'

// Painel de recomendações do Agente Duval para óleo lubrificante — mesmo
// papel do AgentDuval.tsx (transformadores), calculado no cliente a partir
// dos parâmetros já salvos + amostra anterior (para tendência de metais).
export default function AgentLube({ analysis, prevAnalysis, isoVg }: { analysis: any; prevAnalysis?: any; isoVg?: number }) {
  const [narrative, setNarrative] = useState<string>(analysis.diagnostic || '')
  const [loading, setLoading] = useState(false)

  const input: LubeQualityInput = {
    iso_vg: isoVg, viscosidade_40: analysis.viscosidade_40, tan_mg_koh: analysis.tan_mg_koh,
    agua_ppm: analysis.agua_ppm, iso_4406_grande: analysis.iso_4406_grande,
    fe_ppm: analysis.fe_ppm, cu_ppm: analysis.cu_ppm, cr_ppm: analysis.cr_ppm, si_ppm: analysis.si_ppm,
  }
  const prevInput: LubeQualityInput | undefined = prevAnalysis ? {
    fe_ppm: prevAnalysis.fe_ppm, cu_ppm: prevAnalysis.cu_ppm, cr_ppm: prevAnalysis.cr_ppm,
  } : undefined
  const q = evalLubeQuality(input, prevInput)

  const rows: [string, string][] = [
    ['Viscosidade', analysis.viscosidade_40 != null ? `${analysis.viscosidade_40} cSt (ISO VG ${isoVg ?? '-'})` : '—'],
    ['TAN', analysis.tan_mg_koh != null ? `${analysis.tan_mg_koh} mgKOH/g` : '—'],
    ['Teor de água', analysis.agua_ppm != null ? `${analysis.agua_ppm} ppm` : '—'],
    ['ISO 4406', analysis.iso_4406_grande != null ? `${analysis.iso_4406_grande}/${analysis.iso_4406_media ?? '-'}/${analysis.iso_4406_pequena ?? '-'}` : '—'],
    ['Tendência de desgaste', prevAnalysis ? 'Comparado com amostra anterior' : 'Sem amostra anterior nesta análise'],
  ]

  async function gerarParecer() {
    setLoading(true)
    try {
      const res = await fetch('/api/lube-diagnose', {
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
        <span className="agent-title">Agente Duval — Lubrificante</span>
        <span className={'badge badge-' + (q.status === 'critico' ? 'critical' : q.status === 'atencao' ? 'medium' : 'normal')} style={{ marginLeft: 'auto' }}>{q.status}</span>
      </div>

      {rows.map(([k, v]) => (
        <div key={k} className="rec-row"><span className="rec-k">{k}</span><span className="rec-v">{v}</span></div>
      ))}

      <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', margin: '8px 0', lineHeight: 1.5 }}>
        Limiares acima de referência de mercado (tribologia industrial), não norma regulatória fixa — validar contra especificação do fabricante do redutor.
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
