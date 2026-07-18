import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Adiciona um novo login a uma empresa JA existente, com o mesmo nivel de
// acesso do membro original (mesma subscription_id, sem hierarquia entre
// membros). Diferente de create-client: nao cria uma subscription nova.
// Somente admins podem chamar.
export async function POST(req: NextRequest) {
  try {
    const { access_token, subscription_id, email, password } = await req.json()
    if (!access_token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    if (!subscription_id || !email || !password) return NextResponse.json({ error: 'subscription_id, email e password são obrigatórios' }, { status: 400 })
    if (String(password).length < 8) return NextResponse.json({ error: 'senha deve ter ao menos 8 caracteres' }, { status: 400 })

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

    // 3. Confirmar que a subscription de destino existe
    const { data: targetSub } = await service.from('subscriptions').select('id, company_name').eq('id', subscription_id).single()
    if (!targetSub) return NextResponse.json({ error: 'cliente não encontrado' }, { status: 404 })

    // 4. Criar o usuário de login
    const { data: created, error: cErr } = await service.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (cErr || !created?.user) return NextResponse.json({ error: cErr?.message || 'falha ao criar usuário' }, { status: 400 })

    // 5. Vincular como membro da MESMA subscription (mesmo acesso, sem
    //    criar uma subscription nova nem duplicar dados/ativos).
    const { error: mErr } = await service.from('subscription_members').insert({
      subscription_id, user_id: created.user.id, email,
    })
    if (mErr) {
      await service.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: 'falha ao vincular membro: ' + mErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, member: { user_id: created.user.id, email, company_name: targetSub.company_name } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
