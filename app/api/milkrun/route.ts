import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CRON_SECRET = process.env.CRON_SECRET || 'oilsense-cron-2024'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { subscription_id, cron_token } = body
  const isCron = cron_token === CRON_SECRET
  if (!subscription_id && !isCron) {
    return NextResponse.json({ error: 'subscription_id ou cron_token obrigatorio' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let subIds: string[] = []
    if (subscription_id) {
      subIds = [subscription_id]
    } else {
      const { data: subs } = await supabase.from('subscriptions').select('id').eq('status', 'active')
      subIds = (subs || []).map((s: any) => s.id)
    }

    const results: any[] = []

    for (const subId of subIds) {
      const { data: analyses } = await supabase
        .from('lab_analyses')
        .select('id, transformer_id, severity, created_at, transformers(id, identificacao, localizacao, numero_serie)')
        .eq('subscription_id', subId)
        .in('severity', ['critical', 'high'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (!analyses || analyses.length === 0) continue

      const byLocation: Record<string, any[]> = {}
      for (const a of analyses) {
        const loc = (a.transformers as any)?.localizacao || 'Sem localizacao'
        if (!byLocation[loc]) byLocation[loc] = []
        byLocation[loc].push(a)
      }

      const { data: existingOS } = await supabase
        .from('service_orders')
        .select('transformer_id')
        .eq('subscription_id', subId)
        .eq('status', 'aberta')

      const withOS = new Set((existingOS || []).map((o: any) => o.transformer_id))

      for (const [localizacao, items] of Object.entries(byLocation)) {
        const semOS = items.filter(a => !withOS.has(a.transformer_id))
        if (semOS.length === 0) continue

        const hasCritical = semOS.some(a => a.severity === 'critical')
        const prioridade = hasCritical ? 'alta' : 'media'
        const principal = semOS[0]
        const nAtivos = semOS.length
        const titulo = 'Milk Run — ' + localizacao + ' — ' + nAtivos + ' ativo' + (nAtivos > 1 ? 's requerem' : ' requer') + ' coleta'

        const { data: novaOS, error } = await supabase
          .from('service_orders')
          .insert({
            subscription_id: subId,
            transformer_id: principal.transformer_id,
            titulo,
            status: 'aberta',
            prioridade,
          })
          .select().single()

        if (!error && novaOS) {
          results.push({
            subscription_id: subId,
            localizacao,
            os_id: novaOS.id,
            titulo,
            prioridade,
            ativos: semOS.map(a => (a.transformers as any)?.identificacao || a.transformer_id),
          })
          semOS.forEach(a => withOS.add(a.transformer_id))
        }
      }
    }

    return NextResponse.json({
      success: true,
      os_criadas: results.length,
      detalhes: results,
      executado_em: new Date().toISOString(),
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}