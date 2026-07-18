import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Cria a subscription (tenant isolado) para um usuário que acabou de se
// cadastrar sozinho em /signup. O auth.signUp() do cliente só cria o
// usuário no Supabase Auth — sem isso, a conta fica sem subscription e
// todas as funcionalidades que dependem dela (ex: import de laudos)
// bloqueiam com "conta não verificada".
//
// Não exige sessão (o usuário pode ainda não ter confirmado o e-mail neste
// ponto), mas valida que o user_id realmente existe no Auth antes de criar
// a subscription, e é idempotente: se a subscription já existir, retorna
// sucesso sem duplicar.
export async function POST(req: NextRequest) {
  try {
    const { user_id, company_name } = await req.json()
    if (!user_id || !company_name) {
      return NextResponse.json({ error: 'user_id e company_name são obrigatórios' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Confirmar que o user_id é de um usuário real do Auth (evita chamadas
    //    forjadas com ids arbitrários criando subscriptions órfãs).
    const { data: authUser, error: uErr } = await service.auth.admin.getUserById(user_id)
    if (uErr || !authUser?.user) {
      return NextResponse.json({ error: 'usuário não encontrado' }, { status: 404 })
    }

    // 2. Idempotência: se já existe subscription pra esse usuário, não duplica.
    const { data: existing } = await service.from('subscriptions').select('id').eq('user_id', user_id).limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, already_existed: true })
    }

    // 3. Cria a subscription — plano básico por padrão para autocadastro.
    const { data: sub, error: sErr } = await service.from('subscriptions')
      .insert({ user_id, company_name, plan: 'basico', status: 'ativo', is_admin: false })
      .select().single()
    if (sErr) {
      return NextResponse.json({ error: 'falha ao criar subscription: ' + sErr.message }, { status: 400 })
    }

    // 4. Cria o registro de membro — sem isso, o RLS (baseado em
    //    subscription_members) bloquearia o proprio criador da conta.
    await service.from('subscription_members').insert({
      subscription_id: sub.id, user_id, email: authUser.user.email,
    })

    return NextResponse.json({ success: true, subscription_id: sub.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
