import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { pdf_base64, oil_type, subscription_id } = await req.json()
    if (!pdf_base64) return NextResponse.json({ error: 'pdf_base64 required' }, { status: 400 })

    // 1. Extrair dados do PDF via Claude
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 }
          },
          {
            type: 'text',
            text: 'Extraia dados do laudo DGA e retorne APENAS JSON sem markdown. Campos: h2 ch4 c2h2 c2h4 c2h6 co co2 furfural (numeros ppm) data_coleta (YYYY-MM-DD) laboratorio numero_laudo numero_serie identificacao fabricante (strings) potencia_kva (numero) tensao_kv (string). Use null para campos ausentes.'
          }
        ]
      }]
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    // 2. Salvar no Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar ou criar transformer
    let transformer_id = null
    if (data.numero_serie) {
      const { data: existing } = await supabase
        .from('transformers')
        .select('id')
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
          })
          .select('id')
          .single()
        transformer_id = newT?.id
      }
    }

    // Salvar lab analysis
    const { data: analysis, error } = await supabase
      .from('lab_analyses')
      .insert({
        subscription_id,
        transformer_id,
        h2: data.h2, ch4: data.ch4, c2h2: data.c2h2,
        c2h4: data.c2h4, c2h6: data.c2h6, co: data.co,
        co2: data.co2, furfural: data.furfural,
        oil_type: oil_type || 'Mineral',
        data_coleta: data.data_coleta,
        laboratorio: data.laboratorio,
        numero_laudo: data.numero_laudo,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: analysis })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}