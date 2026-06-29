'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ADMIN_EMAILS = ['andredahora@oilssense.com']

export function useAuth() {
  const [user, setUser]   = useState<any>(null)
  const [subId, setSubId] = useState<string|null>(null)
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(true)
  const [alertCount, setAlertCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: sub } = await supabase
        .from('subscriptions').select('id, company_name').eq('user_id', session.user.id).single()
      if (sub) {
        setSubId(sub.id)
        setCompany(sub.company_name||'')
        const { count } = await supabase.from('alerts').select('id',{count:'exact',head:true}).eq('subscription_id',sub.id).eq('resolved',false)
        setAlertCount(count||0)
      }
      setLoading(false)
    })
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(user?.email||'')

  return { user, subId, company, loading, isAdmin, alertCount, supabase }
}