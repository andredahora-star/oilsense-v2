import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // --- Verificação de acesso: somente admins ---
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: uErr } = await anon.auth.getUser(token)
  if (uErr || !user) return NextResponse.json({ error: 'sessão inválida' }, { status: 401 })
  const { data: sub } = await supabase.from('subscriptions').select('is_admin').eq('user_id', user.id).limit(1)
  if (!sub || !sub[0]?.is_admin) return NextResponse.json({ error: 'acesso restrito a administradores' }, { status: 403 })

  const { data: subscriptions } = await supabase
    .from('subscriptions').select('*').order('created_at', { ascending: false })

  if (!subscriptions) return NextResponse.json({ subscriptions: [], stats: {} })

  // Anexa o email de cada cliente (fica em auth.users, não em subscriptions)
  // e a lista de membros (com o mesmo nivel de acesso) da empresa.
  const subsWithEmail = await Promise.all(subscriptions.map(async (s: any) => {
    const [{ data }, { data: members }] = await Promise.all([
      supabase.auth.admin.getUserById(s.user_id),
      supabase.from('subscription_members').select('id, user_id, email, created_at').eq('subscription_id', s.id).order('created_at', { ascending: true }),
    ])
    return { ...s, email: data?.user?.email || null, members: members || [] }
  }))

  const stats: Record<string, any> = {}
  await Promise.all(subscriptions.map(async (s: any) => {
    const [t, a, al, o] = await Promise.all([
      supabase.from('transformers').select('id', { count: 'exact', head: true }).eq('subscription_id', s.id),
      supabase.from('lab_analyses').select('id', { count: 'exact', head: true }).eq('subscription_id', s.id),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('subscription_id', s.id).eq('resolved', false),
      supabase.from('service_orders').select('id', { count: 'exact', head: true }).eq('subscription_id', s.id).eq('status', 'aberta'),
    ])
    stats[s.id] = { transformers: t.count || 0, analyses: a.count || 0, alerts: al.count || 0, orders: o.count || 0 }
  }))

  const { data: recentErrors } = await supabase
    .from('error_logs').select('*').order('created_at', { ascending: false }).limit(15)

  return NextResponse.json({ subscriptions: subsWithEmail, stats, recent_errors: recentErrors || [] }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
