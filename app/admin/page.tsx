'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string,any>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', session.user.id).single()
      if (!sub || sub.plan !== 'admin') { router.push('/dashboard'); return }
      const { data: allSubs } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
      if (!allSubs) { setLoading(false); return }
      setSubs(allSubs)
      const statsMap: Record<string,any> = {}
      await Promise.all(allSubs.map(async (s: any) => {
        const [t, a, al, o] = await Promise.all([
          supabase.from('transformers').select('id',{count:'exact'}).eq('subscription_id',s.id),
          supabase.from('lab_analyses').select('id',{count:'exact'}).eq('subscription_id',s.id),
          supabase.from('alerts').select('id',{count:'exact'}).eq('subscription_id',s.id).eq('resolved',false),
          supabase.from('service_orders').select('id',{count:'exact'}).eq('subscription_id',s.id).eq('status','aberta'),
        ])
        statsMap[s.id] = { transformers:t.count||0, analyses:a.count||0, alerts:al.count||0, orders:o.count||0 }
      }))
      setStats(statsMap)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontFamily:'system-ui'}}>Carregando...</div>

  const totals = subs.reduce((acc: any, s: any) => {
    const st = stats[s.id] || {}
    acc.transformers += st.transformers||0
    acc.analyses    += st.analyses||0
    acc.alerts      += st.alerts||0
    acc.orders      += st.orders||0
    return acc
  }, { transformers:0, analyses:0, alerts:0, orders:0 })

  const clientes = subs.filter((s: any) => s.plan !== 'admin')

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <Nav email={user?.email} />
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px'}}>
          <h1 style={{fontSize:'22px',fontWeight:'700'}}>Master Admin</h1>
          <span style={{fontSize:'12px',background:'rgba(231,76,60,0.15)',color:'#e74c3c',padding:'3px 10px',borderRadius:'20px',border:'1px solid rgba(231,76,60,0.3)'}}>Admin</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'28px'}}>
          {[{l:'Clientes',v:clientes.length,c:'#e6edf3'},{l:'Transformadores',v:totals.transformers,c:'#4a90d9'},{l:'Alertas Abertos',v:totals.alerts,c:'#e74c3c'},{l:'OS Abertas',v:totals.orders,c:'#f39c12'}].map(s=>(
            <div key={s.l} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'10px',padding:'16px 20px'}}>
              <div style={{fontSize:'26px',fontWeight:'700',color:s.c}}>{s.v}</div>
              <div style={{fontSize:'12px',color:'#8b949e',textTransform:'uppercase',marginTop:'2px'}}>{s.l}</div>
            </div>
          ))}
        </div>
        <h2 style={{fontSize:'13px',fontWeight:'600',marginBottom:'14px',color:'#8b949e',textTransform:'uppercase',letterSpacing:'0.05em'}}>Clientes</h2>
        {clientes.length === 0 ? (
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'40px',textAlign:'center',color:'#8b949e'}}>Nenhum cliente cadastrado.</div>
        ) : clientes.map((s: any) => {
          const st = stats[s.id] || {}
          return (
            <div key={s.id} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
                <div>
                  <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'4px'}}>{s.company_name}</div>
                  <div style={{fontSize:'12px',color:'#8b949e'}}>Plano: {s.plan} · Desde {new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{display:'flex',gap:'20px'}}>
                  {[{l:'Ativos',v:st.transformers,c:'#4a90d9'},{l:'Analises',v:st.analyses,c:'#e6edf3'},{l:'Alertas',v:st.alerts,c:'#e74c3c'},{l:'OS',v:st.orders,c:'#f39c12'}].map(x=>(
                    <div key={x.l} style={{textAlign:'center'}}>
                      <div style={{fontSize:'20px',fontWeight:'700',color:(x.v||0)>0?x.c:'#30363d'}}>{x.v||0}</div>
                      <div style={{fontSize:'11px',color:'#8b949e'}}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:s.status==='active'?'#22c55e22':'#8b949e22',color:s.status==='active'?'#22c55e':'#8b949e',border:'1px solid '+(s.status==='active'?'#22c55e44':'#8b949e44')}}>{s.status}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}