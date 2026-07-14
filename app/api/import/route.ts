import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcSeverity, duvalTriangle, DUVAL_ZONES, evalOilQuality, type OilQualityInput } from '@/lib/duvalBrain'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { pdf_base64, oil_type, subscription_id } = await req.json()
    if (!pdf_base64) return NextResponse.json({ error: 'pdf_base64 required' }, { status: 400 })
    if (!subscription_id) return NextResponse.json({ error: 'subscription_id required' }, { status: 400 })

    // 1. Chamar Claude para extrair dados do PDF
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
            { type: 'text', text: 'Extraia dados do laudo DGA e fisico-quimica e retorne APENAS JSON sem markdown. Campos de cromatografia (gases dissolvidos, numeros ppm): h2 ch4 c2h2 c2h4 c2h6 co co2 furfural. Campos fisico-quimicos, se presentes no laudo (numeros, use null se ausente): rigidez_kv (rigidez dieletrica em kV, NBR IEC 60156), agua_ppm (teor de agua em ppm, NBR 10710), acidez_mg_koh (indice de neutralizacao em mgKOH/g, NBR 14248), tensao_interfacial_mn_m (tensao interfacial em mN/m, NBR 6234), fator_potencia_pct (fator de dissipacao dieletrica em %, NBR 12133), cor_astm (cor na escala ASTM, NBR 14483), densidade (densidade relativa a 20C, NBR 7148). Campos gerais: data_coleta (YYYY-MM-DD) laboratorio numero_laudo numero_serie identificacao fabricante (strings) potencia_kva (numero) tensao_kv (string) localizacao (string). Use null para campos ausentes.' }
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

    // 2. Buscar ou criar transformer
    let transformer_id: string | null = null
    if (data.numero_serie) {
      const { data: existing } = await supabase
        .from('transformers').select('id')
        .eq('numero_serie', data.numero_serie)
        .eq('subscription_id', subscription_id)
        .single()

      if (existing) {
        transformer_id = existing.id
      } else {
        const { data: newT } = await supabase
          .from('transformers')
          .insert({
            subscription_id,
            numero_serie: data.numero_serie,
            identificacao: data.identificacao,
            fabricante: data.fabricante,
            potencia_kva: data.potencia_kva,
            tensao_kv: data.tensao_kv,
            localizacao: data.localizacao,
          })
          .select('id').single()
        transformer_id = newT?.id || null
      }
    }

    // 3. Diagnostico rapido pre-save (DUVAL Brain)
    const h2=data.h2||0,ch4=data.ch4||0,c2h2=data.c2h2||0
    const c2h4=data.c2h4||0,c2h6=data.c2h6||0,co=data.co||0
    const co2=data.co2||0,furfural=data.furfural||0
    const severityResult = calcSeverity(h2,ch4,c2h2,c2h4,c2h6,co,co2,furfural)
    const duvalCode = duvalTriangle(ch4,c2h2,c2h4)
    const severity = severityResult.level

    // 3b. Avaliacao fisico-quimica (NBRs), se algum parametro veio no laudo
    const hasOilParams = [data.rigidez_kv, data.agua_ppm, data.acidez_mg_koh, data.tensao_interfacial_mn_m, data.fator_potencia_pct, data.cor_astm, data.densidade].some((v: any) => v != null)
    let oilQuality: { status: string; issues: string[] } | null = null
    if (hasOilParams) {
      oilQuality = evalOilQuality({
        oil_type: (oil_type || 'Mineral') as OilQualityInput['oil_type'],
        rigidez_kv: data.rigidez_kv ?? undefined,
        agua_ppm: data.agua_ppm ?? undefined,
        acidez_mg_koh: data.acidez_mg_koh ?? undefined,
        tensao_interfacial_mn_m: data.tensao_interfacial_mn_m ?? undefined,
        fator_potencia_pct: data.fator_potencia_pct ?? undefined,
        cor_astm: data.cor_astm ?? undefined,
        densidade: data.densidade ?? undefined,
      })
    }

    // 4. Salvar analise com severidade ja calculada
    const { data: analysis, error } = await supabase
      .from('lab_analyses')
      .insert({
        subscription_id,
        transformer_id,
        h2:data.h2, ch4:data.ch4, c2h2:data.c2h2, c2h4:data.c2h4,
        c2h6:data.c2h6, co:data.co, co2:data.co2, furfural:data.furfural,
        oil_type: oil_type || 'Mineral',
        data_coleta: data.data_coleta,
        laboratorio: data.laboratorio,
        numero_laudo: data.numero_laudo,
        severity,
        rigidez_kv: data.rigidez_kv,
        agua_ppm: data.agua_ppm,
        acidez_mg_koh: data.acidez_mg_koh,
        tensao_interfacial_mn_m: data.tensao_interfacial_mn_m,
        fator_potencia_pct: data.fator_potencia_pct,
        cor_astm: data.cor_astm,
        densidade: data.densidade,
        oil_quality_status: oilQuality?.status ?? null,
        oil_quality_issues: oilQuality?.issues?.join(' | ') ?? null,
      })
      .select().single()

    if (error) throw new Error(error.message)

    // 5. Criar alerta automÃ¡tico se severity != normal
    let alerta = null
    if (severity !== 'normal' && transformer_id) {
      const duvalInfo = DUVAL_ZONES[duvalCode as keyof typeof DUVAL_ZONES]
      const severityLabel: Record<string,string> = {
        critical: 'CRÃTICO', high: 'ALTO', medium: 'MÃDIO'
      }
      const alertTitle = `[${severityLabel[severity]||severity}] ${data.identificacao||data.numero_serie||'Transformador'} â ${duvalInfo?.desc||duvalCode}`
      const alertMsg = [
        'Laudo ' + (data.numero_laudo||'â') + ' importado em ' + new Date().toLocaleDateString('pt-BR') + '.',
        'DUVAL: ' + duvalCode + ' â ' + (duvalInfo?.desc||''),
        'Normas ativadas: ' + (severityResult.triggered_rules.slice(0,2).join('; ')||'â'),
      ].join(' ')

      const { data: novoAlerta } = await supabase
        .from('alerts')
        .insert({
          subscription_id,
          transformer_id,
          title: alertTitle,
          message: alertMsg,
          severity: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
          resolved: false,
        })
        .select().single()

      alerta = novoAlerta

      // 6. Atualizar health_score do transformer
      const healthScore = Math.max(10, 100 - severityResult.score)
      const statusMap: Record<string,string> = {
        critical:'critico', high:'atencao', medium:'atencao', normal:'normal'
      }
      await supabase.from('transformers').update({
        health_score: healthScore,
        status: statusMap[severity] || 'normal',
      }).eq('id', transformer_id)
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      severity,
      duval_code: duvalCode,
      alerta_criado: !!alerta,
      regras_ativadas: severityResult.triggered_rules.length,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}