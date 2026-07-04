import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Cria um novo cliente (usuário de login + subscription isolada).
// Somente admins podem chamar — a verificação é feita no servidor.
export async function POST(req: NextRequest) {
  try {
    const { access_token, company_name, email, password } = await req.json()
    if (!access_token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    if (!company_name || !email || !password) return NextResponse.json({ error: 'company_name, email e password são obrigatórios' }, { status: 400 })
    if (String(password).length < 8) return NextResponse.json({ error: 'senha deve ter ao menos 8 caracteres' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Validar o token e identificar o chamador
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: caller }, error: uErr } = await anon.auth.getUser(access_token)
    if (uErr || !caller) return NextResponse.json({ error: 'sessão inválida' }, { status: 401 })

    // 2. Confirmar que o chamador é admin (is_admin na subscription)
    const { data: callerSub } = await service.from('subscriptions').select('is_admin').eq('user_id', caller.id).limit(1)
    const isAdmin = !!(callerSub && callerSub[0]?.is_admin)
    if (!isAdmin) return NextResponse.json({ error: 'acesso restrito a administradores' }, { status: 403 })

    // 3. Criar o usuário de login
    const { data: created, error: cErr } = await service.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (cErr || !created?.user) return NextResponse.json({ error: cErr?.message || 'falha ao criar usuário' }, { status: 400 })

    // 4. Criar a subscription (tenant isolado) para esse usuário
    const { data: sub, error: sErr } = await service.from('subscriptions')
      .insert({ user_id: created.user.id, company_name, plan: 'client', status: 'active', is_admin: false })
      .select().single()
    if (sErr) {
      // rollback do usuário órfão se a subscription falhar
      await service.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: 'falha ao criar conta: ' + sErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, client: { id: sub.id, company_name, email, user_id: created.user.id } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
