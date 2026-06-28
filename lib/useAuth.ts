'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [subId, setSubId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: sub } = await supabase
        .from('subscriptions').select('id').eq('user_id', session.user.id).single()
      if (sub) setSubId(sub.id)
      setLoading(false)
    })
  }, [])

  return { user, subId, loading, supabase }
}