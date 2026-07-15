import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { evalLubeQuality, type LubeQualityInput } from '@/lib/lubeBrain'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { pdf_base64, subscription_id } = await req.json()
    if (!pdf_base64) return NextResponse.json({ error: 'pdf_base64 required' }, { status: 400 })
    if (!subscription_id) return NextResponse.json({ error: 'subscription_id required' }, { status: 400 })

    // 1. Chamar Claude para extrair dados do laudo de oleo lubrificante
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
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } },
            { type: 'text', text: 'Extraia dados do laudo de analise de oleo lubrificante (redutor/caixa de engrenagem) e retorne APENAS JSON sem markdown. Campos numericos, use null se ausente: viscosidade_40 (cSt a 40C, ASTM D445), viscosidade_100 (cSt a 100C), tan_mg_koh (numero de acidez total mgKOH/g, ASTM D664), agua_ppm (teor de agua ppm, ASTM D6304), iso_4406_pequena iso_4406_media iso_4406_grande (os 3 numeros do codigo ISO 4406, ex em "18/16/13" seria 18, 16, 13), fe_ppm cu_ppm cr_ppm pb_ppm sn_ppm al_ppm ni_ppm ag_ppm si_ppm na_ppm k_ppm (metais em ppm, espectrometria ASTM D5185), iso_vg (grau de viscosidade especificado do oleo, ex 220 320 460). Campos gerais (strings, YYYY-MM-DD para data): data_coleta laboratorio numero_laudo numero_serie identificacao fabricante relacao_reducao. potencia_kw (numero). localizacao (string). Use null para campos ausentes.' }
          ]
        }]
      })
    })

    const claudeData = await claudeRes.json()
    if (!claudeRes.ok) throw new Error(claudeData.error?.message || 'Claude API error')

    const raw = claudeData.content?.[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Buscar ou criar gearbox (redutor)
    let gearbox_id: string | null = null
    let prevAnalysis: any = null
    if (data.numero_serie) {
      const { data: existing } = await supabase
        .from('gearboxes').select('id, iso_vg')
        .eq('numero_serie', data.numero_serie)
        .eq('subscription_id', subscription_id)
        .single()

      if (existing) {
        gearbox_id = existing.id
        // busca a analise mais recente desse redutor, para comparacao de tendencia de metais
        const { data: last } = await supabase
          .from('lube_analyses').select('*')
          .eq('gearbox_id', gearbox_id)
          .order('data_coleta', { ascending: false })
          .limit(1).single()
        prevAnalysis = last || null
      } else {
        const { data: newG } = await supabase
          .from('gearboxes')
          .insert({
            subscription_id,
            numero_serie: data.numero_serie,
            identificacao: data.identificacao,
            fabricante: data.fabricante,
            relacao_reducao: data.relacao_reducao,
            potencia_kw: data.potencia_kw,
            iso_vg: data.iso_vg,
            localizacao: data.localizacao,
          })
          .select('id').single()
        gearbox_id = newG?.id || null
      }
    }

    // 3. Avaliacao de qualidade do lubrificante (com tendencia se houver analise anterior)
    const lubeQuality = evalLubeQuality(
      {
        iso_vg: data.iso_vg, viscosidade_40: data.viscosidade_40, tan_mg_koh: data.tan_mg_koh,
        agua_ppm: data.agua_ppm, iso_4406_grande: data.iso_4406_grande, iso_4406_target: data.iso_vg ? undefined : undefined,
        fe_ppm: data.fe_ppm, cu_ppm: data.cu_ppm, cr_ppm: data.cr_ppm, si_ppm: data.si_ppm,
      } as LubeQualityInput,
      prevAnalysis ? {
        fe_ppm: prevAnalysis.fe_ppm, cu_ppm: prevAnalysis.cu_ppm, cr_ppm: prevAnalysis.cr_ppm,
      } as LubeQualityInput : undefined
    )
    const severity = lubeQuality.status === 'critico' ? 'critical' : lubeQuality.status === 'atencao' ? 'medium' : 'normal'

    // 4. Salvar analise
    const { data: analysis, error } = await supabase
      .from('lube_analyses')
      .insert({
        subscription_id, gearbox_id,
        viscosidade_40: data.viscosidade_40, viscosidade_100: data.viscosidade_100,
        tan_mg_koh: data.tan_mg_koh, agua_ppm: data.agua_ppm,
        iso_4406_pequena: data.iso_4406_pequena, iso_4406_media: data.iso_4406_media, iso_4406_grande: data.iso_4406_grande,
        fe_ppm: data.fe_ppm, cu_ppm: data.cu_ppm, cr_ppm: data.cr_ppm, pb_ppm: data.pb_ppm,
        sn_ppm: data.sn_ppm, al_ppm: data.al_ppm, ni_ppm: data.ni_ppm, ag_ppm: data.ag_ppm,
        si_ppm: data.si_ppm, na_ppm: data.na_ppm, k_ppm: data.k_ppm,
        data_coleta: data.data_coleta, laboratorio: data.laboratorio, numero_laudo: data.numero_laudo,
        severity,
        lube_quality_status: lubeQuality.status,
        lube_quality_issues: lubeQuality.issues.join(' | '),
      })
      .select().single()

    if (error) throw new Error(error.message)

    // 5. Alerta automatico + atualizar health_score do redutor
    let alerta = null
    if (severity !== 'normal' && gearbox_id) {
      const severityLabel: Record<string,string> = { critical: 'CRÍTICO', medium: 'ATENÇÃO' }
      const alertTitle = `[${severityLabel[severity]||severity}] ${data.identificacao||data.numero_serie||'Redutor'} — Óleo lubrificante`
      const alertMsg = [
        'Laudo ' + (data.numero_laudo||'-') + ' importado em ' + new Date().toLocaleDateString('pt-BR') + '.',
        lubeQuality.issues.slice(0,2).join('; ') || '-',
      ].join(' ')

      const { data: novoAlerta } = await supabase
        .from('alerts')
        .insert({
          subscription_id, gearbox_id,
          title: alertTitle, message: alertMsg,
          severity: severity === 'critical' ? 'critical' : 'medium',
          resolved: false,
        })
        .select().single()
      alerta = novoAlerta

      const healthScore = lubeQuality.status === 'critico' ? 25 : lubeQuality.status === 'atencao' ? 55 : 100
      await supabase.from('gearboxes').update({
        health_score: healthScore,
        status: lubeQuality.status === 'critico' ? 'critico' : lubeQuality.status === 'atencao' ? 'atencao' : 'normal',
      }).eq('id', gearbox_id)
    }

    return NextResponse.json({
      success: true, data: analysis, severity,
      lube_quality_status: lubeQuality.status,
      alerta_criado: !!alerta,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
