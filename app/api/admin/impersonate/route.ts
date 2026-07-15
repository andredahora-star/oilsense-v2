import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Gera um link magico valido para logar como um cliente especifico, sem
// precisar da senha dele. Usa o mesmo mecanismo do fluxo de "esqueci
// senha" (generateLink), so que aqui o admin e quem recebe o link.
// Somente admins podem chamar — verificado no servidor, mesmo padrao
// das outras rotas admin (update-client, create-client).
export async function POST(req: NextRequest) {
  try {
    const { access_token, target_user_id } = await req.json()
    if (!access_token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
    if (!target_user_id) return NextResponse.json({ error: 'target_user_id é obrigatório' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // 1. Validar o token e identificar o chamador
    const { data: { user: caller }, error: uErr } = await anon.auth.getUser(access_token)
    if (uErr || !caller) return NextResponse.json({ error: 'sessão inválida' }, { status: 401 })

    // 2. Confirmar que o chamador é admin
    const { data: callerSub } = await service.from('subscriptions').select('is_admin').eq('user_id', caller.id).limit(1)
    const isAdmin = !!(callerSub && callerSub[0]?.is_admin)
    if (!isAdmin) return NextResponse.json({ error: 'acesso restrito a administradores' }, { status: 403 })

    // 3. Buscar o email do usuario-alvo
    const { data: targetAuth, error: tErr } = await service.auth.admin.getUserById(target_user_id)
    if (tErr || !targetAuth?.user?.email) return NextResponse.json({ error: 'usuário alvo não encontrado' }, { status: 404 })

    // 4. Gerar link magico para esse usuario
    const origin = req.headers.get('origin') || url
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: targetAuth.user.email,
      options: { redirectTo: origin + '/dashboard' },
    })
    if (linkErr || !linkData) return NextResponse.json({ error: 'falha ao gerar link: ' + linkErr?.message }, { status: 400 })

    return NextResponse.json({ success: true, action_link: linkData.properties.action_link, target_email: targetAuth.user.email })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
