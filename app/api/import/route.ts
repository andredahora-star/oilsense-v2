import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcSeverity, duvalTriangle, DUVAL_ZONES } from '@/lib/duvalBrain'

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
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
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
            { type: 'text', text: 'Extraia dados do laudo DGA e retorne APENAS JSON sem markdown. Campos: h2 ch4 c2h2 c2h4 c2h6 co co2 furfural (numeros ppm) data_coleta (YYYY-MM-DD) laboratorio numero_laudo numero_serie identificacao fabricante (strings) potencia_kva (numero) tensao_kv (string) localizacao (string). Use null para campos ausentes.' }
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

    // 3. Diagnóstico rápido pré-save (DUVAL Brain)
    const h2=data.h2||0,ch4=data.ch4||0,c2h2=data.c2h2||0
    const c2h4=data.c2h4||0,c2h6=data.c2h6||0,co=data.co||0
    const co2=data.co2||0,furfural=data.furfural||0
    const severityResult = calcSeverity(h2,ch4,c2h2,c2h4,c2h6,co,co2,furfural)
    const duvalCode = duvalTriangle(ch4,c2h2,c2h4)
    const severity = severityResult.level

    // 4. Salvar análise com severidade já calculada
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
      })
      .select().single()

    if (error) throw new Error(error.message)

    // 5. Criar alerta automático se severity != normal
    let alerta = null
    if (severity !== 'normal' && transformer_id) {
      const duvalInfo = DUVAL_ZONES[duvalCode as keyof typeof DUVAL_ZONES]
      const severityLabel: Record<string,string> = {
        critical: 'CRÍTICO', high: 'ALTO', medium: 'MÉDIO'
      }
      const alertTitle = `[${severityLabel[severity]||severity}] ${data.identificacao||data.numero_serie||'Transformador'} — ${duvalInfo?.desc||duvalCode}`
      const alertMsg = [
        'Laudo ' + (data.numero_laudo||'—') + ' importado em ' + new Date().toLocaleDateString('pt-BR') + '.',
        'DUVAL: ' + duvalCode + ' — ' + (duvalInfo?.desc||''),
        'Normas ativadas: ' + (severityResult.triggered_rules.slice(0,2).join('; ')||'—'),
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