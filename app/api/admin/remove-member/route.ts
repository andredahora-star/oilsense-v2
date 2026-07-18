import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Remove o acesso de um membro a uma empresa (revoga a membership, NAO
// apaga a conta de auth — o usuario so perde acesso a essa empresa).
// Somente admins podem chamar.
export async function POST(req: NextRequest) {
  try {
    const { access_token, member_id } = await req.json()
    if (!access_token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    if (!member_id) return NextResponse.json({ error: 'member_id é obrigatório' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: caller }, error: uErr } = await anon.auth.getUser(access_token)
    if (uErr || !caller) return NextResponse.json({ error: 'sessão inválida' }, { status: 401 })

    const { data: callerSub } = await service.from('subscriptions').select('is_admin').eq('user_id', caller.id).limit(1)
    const isAdmin = !!(callerSub && callerSub[0]?.is_admin)
    if (!isAdmin) return NextResponse.json({ error: 'acesso restrito a administradores' }, { status: 403 })

    // Buscar o membro a remover, pra saber a subscription e checar se e o ultimo
    const { data: member } = await service.from('subscription_members').select('id, subscription_id, user_id').eq('id', member_id).single()
    if (!member) return NextResponse.json({ error: 'membro não encontrado' }, { status: 404 })

    // Impede remover o ultimo membro de uma empresa (deixaria a conta orfa,
    // sem ninguem conseguindo acessar os dados dela)
    const { count } = await service.from('subscription_members').select('id', { count: 'exact', head: true }).eq('subscription_id', member.subscription_id)
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: 'não é possível remover o último membro de uma empresa. Adicione outro membro antes, ou suspenda o cliente.' }, { status: 400 })
    }

    const { error: delErr } = await service.from('subscription_members').delete().eq('id', member_id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
