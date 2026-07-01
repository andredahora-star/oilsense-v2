import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calcSeverity, duvalTriangle, rogersRatio, diagnosePaper,
  getSamplingInterval, evalOilQuality, DUVAL_ZONES, IEEE_ACTIONS,
  type OilQualityInput
} from '@/lib/duvalBrain'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { analysis_id, oil_params } = body
    if (!analysis_id) return NextResponse.json({ error: 'analysis_id required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar analise no banco
    const { data: analysis, error } = await supabase
      .from('lab_analyses').select('*').eq('id', analysis_id).single()
    if (error || !analysis) return NextResponse.json({ error: 'Analise nao encontrada' }, { status: 404 })

    const h2       = analysis.h2       || 0
    const ch4      = analysis.ch4      || 0
    const c2h2     = analysis.c2h2     || 0
    const c2h4     = analysis.c2h4     || 0
    const c2h6     = analysis.c2h6     || 0
    const co       = analysis.co       || 0
    const co2      = analysis.co2      || 0
    const furfural = analysis.furfural || 0

    // 1. Calcular severidade integrada (IEC 60599 + IEEE C57.104 + NBRs)
    const severityResult = calcSeverity(h2, ch4, c2h2, c2h4, c2h6, co, co2, furfural)

    // 2. Triangulo de Duval
    const duvalCode  = severityResult.duval_code
    const duvalInfo  = DUVAL_ZONES[duvalCode as keyof typeof DUVAL_ZONES]

    // 3. Rogers Ratio
    const rogers = rogersRatio(ch4, h2, c2h2, c2h4, c2h6)

    // 4. Analise do papel isolante (IEC 61198 / ASTM D5837)
    const paper = diagnosePaper(co, co2, furfural * 1000)

    // 5. Avaliacao fÃ­sico-quÃ­mica se parametros fornecidos (NBRs)
    let oilQuality = null
    if (oil_params) {
      oilQuality = evalOilQuality({ oil_type: analysis.oil_type || 'Mineral', ...oil_params } as OilQualityInput)
    }

    // 6. Intervalo de proxima coleta
    const nextSampling = getSamplingInterval(severityResult)

    // 7. Acao recomendada IEEE C57.104
    const ieeeAction = IEEE_ACTIONS['condition' + severityResult.ieee_condition as keyof typeof IEEE_ACTIONS]

    // 8. Construir prompt para o Claude DUVAL com todo o contexto normativo
    const normsContext = [
      'NORMAS APLICADAS A ESTE DIAGNOSTICO:',
      'â¢ IEC 60599:2022 â Interpretacao de gases dissolvidos (norma principal DGA)',
      'â¢ IEEE C57.104-2019 â Guia para interpretacao (tabelas de condicoes 1-4)',
      'â¢ IEC 61198:1993 + ASTM D5837 â FurÃ¢nicos e degradacao do papel isolante',
      'â¢ NBR 7070:2006 â Metodo de amostragem e analise cromatogrÃ¡fica (Brasil)',
      'â¢ NBR 10710:2022 â Teor de agua (Karl Fischer)',
      'â¢ NBR 14248:2009 â Indice de neutralizacao/acidez',
      'â¢ NBR 6234:2015 â Tensao interfacial',
      'â¢ NBR 12133:1991 â Fator de dissipacao dieletrica',
      'â¢ NBR IEC 60156:2019 â Rigidez dieletrica',
      'â¢ NBR 14483:2015 â Cor (escala ASTM)',
      'â¢ NBR 7148:2013 â Densidade relativa',
    ].join('\n')

    const gasesContext = [
      'GASES DISSOLVIDOS (NBR 7070 / IEC 60599):',
      'H2='  +h2  +' ppm | CH4=' +ch4 +' ppm | C2H2='+c2h2+' ppm',
      'C2H4='+c2h4+' ppm | C2H6='+c2h6+' ppm | CO='+co+' ppm | CO2='+co2+' ppm',
      'Furfural=' +furfural+ ' ppm | Tipo de oleo: ' + (analysis.oil_type || 'Mineral'),
    ].join('\n')

    const diagContext = [
      'RESULTADOS DOS METODOS NORMATIVOS:',
      'â Triangulo de Duval (IEC 60599): ' + duvalCode + ' â ' + (duvalInfo?.desc || ''),
      'â Rogers Ratio (IEEE C57.104): ' + rogers.code + ' â ' + rogers.fault,
      '  R1(CH4/H2)=' + rogers.R1 + ' | R2(C2H2/C2H4)=' + rogers.R2 + ' | R3(C2H4/C2H6)=' + rogers.R3,
      'â Condicao IEEE C57.104: ' + severityResult.ieee_condition + '/4 â ' + ieeeAction,
      'â Papel isolante: ' + paper.papelMsg,
      'â Severidade final: ' + severityResult.level.toUpperCase() + ' (score=' + severityResult.score + '/100)',
      'â Regras ativadas: ' + severityResult.triggered_rules.join(' | '),
    ].join('\n')

    const prompt = [
      'Voce e o DUVAL â engine de diagnostico de transformadores de potencia do OilSense.',
      'Forneca um diagnostico tecnico completo e objetivo em PORTUGUES.',
      '',
      normsContext,
      '',
      gasesContext,
      '',
      diagContext,
      '',
      'INSTRUCOES:',
      '1. Identifique e explique o tipo de falha com base no Triangulo de Duval e Rogers Ratio, citando as normas aplicadas.',
      '2. Interprete os gases mais significativos e sua correlacao com o tipo de falha.',
      '3. Avalie o estado da isolacao celulÃ³sica com base em CO/CO2 e furfural (IEC 61198/ASTM D5837).',
      '4. Emita a recomendacao tecnica de acao: operacao normal, monitoramento reforcado, investigacao ou retirada de servico.',
      '5. Indique o proximo intervalo de coleta: ' + nextSampling,
      '',
      'Seja preciso e tecnico. Formato: texto continuo em 3-4 paragrafos. Sem markdown.',
    ].join('\n')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': (process.env.ANTHROPIC_API_KEY||process.env.ANTHROPI_API_KEY)!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const claudeData = await claudeRes.json()
    const diagnostic = claudeData.content?.[0]?.text || 'Diagnostico indisponivel'

    // Salvar resultado no banco
    const { data: updated, error: updateErr } = await supabase
      .from('lab_analyses')
      .update({ severity: severityResult.level, diagnostic })
      .eq('id', analysis_id)
      .select().single()

    if (updateErr) throw new Error(updateErr.message)

    return NextResponse.json({
      success: true,
      severity: severityResult.level,
      score: severityResult.score,
      ieee_condition: severityResult.ieee_condition,
      ieee_action: ieeeAction,
      duval: { code: duvalCode, label: duvalInfo?.desc, norm: duvalInfo?.norm },
      rogers,
      paper,
      oil_quality: oilQuality,
      next_sampling: nextSampling,
      triggered_rules: severityResult.triggered_rules,
      diagnostic,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}