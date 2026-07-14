import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Atualiza uma subscription existente — usado pelo painel /admin para
// editar nome/plano de um cliente e para suspender/reativar acesso.
// Somente admins podem chamar — a verificação é feita no servidor.
export async function POST(req: NextRequest) {
  try {
    const { access_token, subscription_id, company_name, plan, status } = await req.json()
    if (!access_token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    if (!subscription_id) return NextResponse.json({ error: 'subscription_id é obrigatório' }, { status: 400 })
    if (company_name === undefined && plan === undefined && status === undefined) {
      return NextResponse.json({ error: 'nada para atualizar' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Validar o token e identificar o chamador
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: caller }, error: uErr } = await anon.auth.getUser(access_token)
    if (uErr || !caller) return NextResponse.json({ error: 'sessão inválida' }, { status: 401 })

    // 2. Confirmar que o chamador é admin
    const { data: callerSub } = await service.from('subscriptions').select('is_admin').eq('user_id', caller.id).limit(1)
    const isAdmin = !!(callerSub && callerSub[0]?.is_admin)
    if (!isAdmin) return NextResponse.json({ error: 'acesso restrito a administradores' }, { status: 403 })

    // 3. Impede que um admin se autossuspenda por engano
    const { data: targetSub } = await service.from('subscriptions').select('user_id').eq('id', subscription_id).limit(1).single()
    if (targetSub?.user_id === caller.id && status === 'suspenso') {
      return NextResponse.json({ error: 'você não pode suspender a própria conta' }, { status: 400 })
    }

    // 4. Monta o patch só com os campos enviados
    const patch: Record<string, any> = {}
    if (company_name !== undefined) patch.company_name = company_name
    if (plan !== undefined) patch.plan = plan
    if (status !== undefined) patch.status = status

    const { data: updated, error: upErr } = await service.from('subscriptions')
      .update(patch).eq('id', subscription_id).select().single()
    if (upErr) return NextResponse.json({ error: 'falha ao atualizar: ' + upErr.message }, { status: 400 })

    return NextResponse.json({ success: true, subscription: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
