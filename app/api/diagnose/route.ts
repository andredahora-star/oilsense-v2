import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function duvalTriangle(ch4: number, c2h2: number, c2h4: number): string {
  const total = ch4 + c2h2 + c2h4
  if (total === 0) return 'PD'
  const p1 = (ch4 / total) * 100
  const p2 = (c2h2 / total) * 100
  const p3 = (c2h4 / total) * 100
  if (p2 >= 4) return p3 > 23 ? 'D2' : 'D1'
  if (p3 >= 20) return p3 >= 50 ? 'T3' : p1 > 10 ? 'T2' : 'T1'
  if (p1 >= 98) return 'PD'
  return 'T1'
}

const duvalLabel: Record<string,string> = {
  PD: 'Descarga parcial (IEC 60599)',
  D1: 'Descarga eletrica de baixa energia',
  D2: 'Descarga eletrica de alta energia',
  T1: 'Sobreaquecimento termal < 300C',
  T2: 'Sobreaquecimento termal 300-700C',
  T3: 'Sobreaquecimento termal > 700C',
}

function rogersRatio(ch4: number, h2: number, c2h2: number, c2h4: number, c2h6: number) {
  const r1 = h2 > 0 ? ch4 / h2 : 0
  const r2 = c2h2 > 0 ? c2h4 / c2h2 : 0
  const r3 = c2h6 > 0 ? c2h4 / c2h6 : 0
  let fault = 'Normal'
  if (r1 < 0.1 && r2 < 0.1 && r3 < 0.01) fault = 'PD - Descarga parcial'
  else if (r1 >= 0.1 && r1 <= 1 && r2 >= 1 && r3 > 3) fault = 'D1 - Descarga baixa energia'
  else if (r1 > 0.1 && r1 <= 3 && r2 > 0.6 && r3 > 3) fault = 'D2 - Descarga alta energia'
  else if (r1 > 1 && r2 < 0.1 && r3 < 1) fault = 'T1 - Termal < 300C'
  else if (r1 > 1 && r2 < 0.1 && r3 >= 1 && r3 <= 3) fault = 'T2 - Termal 300-700C'
  else if (r1 > 1 && r2 < 0.1 && r3 > 3) fault = 'T3 - Termal > 700C'
  return { r1: +r1.toFixed(3), r2: +r2.toFixed(3), r3: +r3.toFixed(3), fault }
}

function calcSeverity(h2: number, ch4: number, c2h2: number, c2h4: number, c2h6: number, co: number): string {
  if (c2h2 > 35 || h2 > 1800 || ch4 > 1000 || c2h4 > 200) return 'critical'
  if (c2h2 > 9 || h2 > 150 || ch4 > 120 || c2h4 > 90 || co > 900) return 'high'
  if (h2 > 100 || ch4 > 75 || c2h4 > 65) return 'medium'
  return 'normal'
}

export async function POST(req: NextRequest) {
  try {
    const { analysis_id } = await req.json()
    if (!analysis_id) return NextResponse.json({ error: 'analysis_id required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: analysis, error: fetchErr } = await supabase
      .from('lab_analyses').select('*').eq('id', analysis_id).single()
    if (fetchErr || !analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })

    const h2 = analysis.h2 || 0, ch4 = analysis.ch4 || 0
    const c2h2 = analysis.c2h2 || 0, c2h4 = analysis.c2h4 || 0
    const c2h6 = analysis.c2h6 || 0, co = analysis.co || 0, co2 = analysis.co2 || 0
    const furfural = analysis.furfural || 0

    const duvalCode = duvalTriangle(ch4, c2h2, c2h4)
    const duvalDesc = duvalLabel[duvalCode] || 'Indeterminado'
    const rogers = rogersRatio(ch4, h2, c2h2, c2h4, c2h6)
    const severity = calcSeverity(h2, ch4, c2h2, c2h4, c2h6, co)

    const prompt = [
      'Voce e o DUVAL, engine de diagnostico de transformadores de potencia.',
      '',
      'Dados da analise DGA (ppm):',
      'H2=' + h2 + ' | CH4=' + ch4 + ' | C2H2=' + c2h2 + ' | C2H4=' + c2h4 + ' | C2H6=' + c2h6 + ' | CO=' + co + ' | CO2=' + co2 + ' | Furfural=' + furfural,
      '',
      'Resultados normativos:',
      '- Triangulo de Duval: ' + duvalCode + ' (' + duvalDesc + ')',
      '- Rogers Ratio: R1=' + rogers.r1 + ' R2=' + rogers.r2 + ' R3=' + rogers.r3 + ' => ' + rogers.fault,
      '- Severidade calculada: ' + severity,
      '',
      'Escreva um diagnostico tecnico em portugues (3 paragrafos) citando:',
      '1. Tipo de falha detectada e norma aplicada (IEC 60599 ou IEEE C57.104)',
      '2. Interpretacao dos gases mais elevados',
      '3. Recomendacao de acao e proximo intervalo de coleta',
      '',
      'Formato texto simples, sem markdown.'
    ].join('\n')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const claudeData = await claudeRes.json()
    const diagnostic = claudeData.content?.[0]?.text || 'Diagnostico indisponivel'

    const { data: updated, error: updateErr } = await supabase
      .from('lab_analyses')
      .update({ severity, diagnostic })
      .eq('id', analysis_id)
      .select().single()

    if (updateErr) throw new Error(updateErr.message)

    return NextResponse.json({
      success: true, severity,
      duval: { code: duvalCode, label: duvalDesc },
      rogers, diagnostic,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}