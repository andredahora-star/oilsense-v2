import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logError } from '@/lib/logError'
import { evalLubeQuality, LUBE_REFERENCE_RANGES, type LubeQualityInput } from '@/lib/lubeBrain'

export const runtime = 'nodejs'

const LUBE_KNOWLEDGE = [
  'Ao contrario do oleo isolante de transformadores (onde IEC 60599/IEEE C57.104 publicam limites',
  'absolutos universais), oleo lubrificante de redutor NAO tem uma norma unica com tabela de',
  'limites fixos — cada fabricante especifica sua propria faixa aceitavel. Os limiares usados aqui',
  'sao faixas de referencia consolidadas na pratica de tribologia industrial (nao uma norma',
  'regulatoria), e isso deve ser deixado claro no parecer, recomendando validacao contra a',
  'especificacao do fabricante do redutor quando disponivel.',
  '',
  'Metais de desgaste (Fe, Cu, Cr) NAO usam limite absoluto — usam TENDENCIA (variacao % entre',
  'amostras consecutivas). Isso e a pratica correta reconhecida no setor, ja que desgaste normal',
  'varia muito por tamanho do redutor, volume de oleo e horas de operacao.',
].join('\n')

export async function POST(req: NextRequest) {
  try {
    const { analysis_id } = await req.json()
    if (!analysis_id) return NextResponse.json({ error: 'analysis_id required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: analysis, error } = await supabase
      .from('lube_analyses').select('*, gearboxes(identificacao,numero_serie,iso_vg)').eq('id', analysis_id).single()
    if (error || !analysis) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

    // Busca a analise anterior do mesmo redutor, para a checagem de tendencia de metais
    let prevInput: LubeQualityInput | undefined
    let prevRow: any = null
    if (analysis.gearbox_id) {
      const { data: prevRows } = await supabase
        .from('lube_analyses').select('fe_ppm, cu_ppm, cr_ppm, data_coleta')
        .eq('gearbox_id', analysis.gearbox_id)
        .lt('data_coleta', analysis.data_coleta)
        .order('data_coleta', { ascending: false })
        .limit(1)
      if (prevRows && prevRows[0]) { prevRow = prevRows[0]; prevInput = prevRows[0] }
    }

    const isoVg = analysis.gearboxes?.iso_vg
    const lubeQuality = evalLubeQuality({
      iso_vg: isoVg, viscosidade_40: analysis.viscosidade_40, tan_mg_koh: analysis.tan_mg_koh,
      agua_ppm: analysis.agua_ppm, iso_4406_grande: analysis.iso_4406_grande,
      fe_ppm: analysis.fe_ppm, cu_ppm: analysis.cu_ppm, cr_ppm: analysis.cr_ppm, si_ppm: analysis.si_ppm,
    }, prevInput)

    const gName = analysis.gearboxes?.identificacao || analysis.gearboxes?.numero_serie || 'Redutor'

    const paramsContext = [
      'PARAMETROS DO OLEO LUBRIFICANTE:',
      `Viscosidade 40C=${analysis.viscosidade_40 ?? '-'}cSt (grau ISO VG especificado: ${isoVg ?? '-'}) | TAN=${analysis.tan_mg_koh ?? '-'}mgKOH/g | Agua=${analysis.agua_ppm ?? '-'}ppm`,
      `ISO 4406=${analysis.iso_4406_grande ?? '-'}/${analysis.iso_4406_media ?? '-'}/${analysis.iso_4406_pequena ?? '-'}`,
      `Metais de desgaste (ppm): Fe=${analysis.fe_ppm ?? '-'} Cu=${analysis.cu_ppm ?? '-'} Cr=${analysis.cr_ppm ?? '-'} | Contaminacao: Si=${analysis.si_ppm ?? '-'}`,
      prevInput ? `Amostra anterior (${prevRow.data_coleta}) para comparacao de tendencia: Fe=${prevInput.fe_ppm ?? '-'} Cu=${prevInput.cu_ppm ?? '-'} Cr=${prevInput.cr_ppm ?? '-'}` : 'Sem amostra anterior — nao foi possivel avaliar tendencia de desgaste nesta analise.',
    ].join('\n')

    const diagContext = [
      'RESULTADO DA AVALIACAO:',
      `Status: ${lubeQuality.status.toUpperCase()} (score=${lubeQuality.score}/100)`,
      `Achados: ${lubeQuality.issues.length ? lubeQuality.issues.join(' | ') : 'Nenhum parametro fora da faixa de referencia.'}`,
    ].join('\n')

    const prompt = [
      'Voce e o DUVAL — engine de diagnostico do OilSense, avaliando desta vez oleo LUBRIFICANTE de um redutor/caixa de engrenagem (NAO e oleo isolante de transformador — nao use Triangulo de Duval, Rogers Ratio ou DGA aqui, isso e outro tipo de analise).',
      `Ativo: ${gName}.`,
      'Forneca um parecer tecnico completo e objetivo em PORTUGUES.',
      '',
      'BASE DE CONHECIMENTO (referencia — cite as normas/metodos aplicaveis: ASTM D445 viscosidade, ASTM D664 TAN, ASTM D6304 agua, ISO 4406 particulas, ASTM D5185 espectrometria de metais):',
      LUBE_KNOWLEDGE,
      '',
      paramsContext,
      '',
      diagContext,
      '',
      'INSTRUCOES:',
      '1. Avalie a condicao geral do lubrificante com base nos parametros acima, citando as normas/metodos aplicados a cada um.',
      '2. Se houver achados de tendencia de metais de desgaste, explique que isso reflete taxa de desgaste (nao valor absoluto) e o que pode estar causando.',
      '3. Sempre que citar um limiar de referencia de mercado (nao-normativo), deixe isso explicito — nao apresente como se fosse limite regulatorio fixo.',
      '4. Emita recomendacao tecnica de acao: operacao normal, monitoramento reforcado, troca de oleo, ou investigacao de causa de desgaste/contaminacao.',
      '',
      'Seja preciso e tecnico. Formato: texto continuo em 2-3 paragrafos. Sem markdown.',
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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const claudeData = await claudeRes.json()
    if (!claudeRes.ok) throw new Error(claudeData.error?.message || 'Claude API error')
    const diagnostic = claudeData.content?.[0]?.text || 'Parecer indisponível'

    const { data: updated, error: updateErr } = await supabase
      .from('lube_analyses')
      .update({
        severity: lubeQuality.status === 'critico' ? 'critical' : lubeQuality.status === 'atencao' ? 'medium' : 'normal',
        diagnostic,
        lube_quality_status: lubeQuality.status,
        lube_quality_score: lubeQuality.score,
        lube_quality_issues: lubeQuality.issues.join(' | '),
      })
      .eq('id', analysis_id)
      .select().single()

    if (updateErr) throw new Error(updateErr.message)

    return NextResponse.json({
      success: true,
      status: lubeQuality.status,
      score: lubeQuality.score,
      issues: lubeQuality.issues,
      diagnostic,
    })
  } catch (err: any) {
    await logError('/api/lube-diagnose', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
