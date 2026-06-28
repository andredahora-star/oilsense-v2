'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({transformers:0, analyses:0, alerts:0, orders:0})
  const [subId, setSubId] = useState<string|null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      // Buscar subscription do usuário
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, company_name')
        .eq('user_id', session.user.id)
        .single()

      if (sub) {
        setSubId(sub.id)
        // Buscar stats em paralelo
        const [t, a, al, o] = await Promise.all([
          supabase.from('transformers').select('id', {count:'exact'}).eq('subscription_id', sub.id),
          supabase.from('lab_analyses').select('id', {count:'exact'}).eq('subscription_id', sub.id),
          supabase.from('alerts').select('id', {count:'exact'}).eq('subscription_id', sub.id).eq('resolved', false),
          supabase.from('service_orders').select('id', {count:'exact'}).eq('subscription_id', sub.id).eq('status', 'aberta'),
        ])
        setStats({
          transformers: t.count || 0,
          analyses: a.count || 0,
          alerts: al.count || 0,
          orders: o.count || 0,
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontFamily:'system-ui'}}>
      Carregando...
    </div>
  )

  const cards = [
    { label: 'Transformadores', value: stats.transformers, color: '#e6edf3', href:'/assets' },
    { label: 'Total Análises', value: stats.analyses, color: '#e6edf3', href:'/analyses' },
    { label: 'Alertas Ativos', value: stats.alerts, color: stats.alerts > 0 ? '#e74c3c' : '#22c55e', href:'/alerts' },
    { label: 'OS Abertas', value: stats.orders, color: stats.orders > 0 ? '#f39c12' : '#22c55e', href:'/orders' },
  ]

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <nav style={{borderBottom:'1px solid #30363d',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'56px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'700',color:'#0d1117'}}>OS</div>
          <span style={{fontWeight:'600'}}>OilSense</span>
          <span style={{fontSize:'11px',background:'rgba(34,197,94,0.15)',color:'#22c55e',padding:'2px 8px',borderRadius:'20px'}}>v2 beta</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <span style={{fontSize:'13px',color:'#8b949e'}}>{user?.email}</span>
          <button onClick={handleLogout} style={{fontSize:'12px',padding:'6px 12px',background:'transparent',border:'1px solid #30363d',borderRadius:'6px',color:'#8b949e',cursor:'pointer',fontFamily:'inherit'}}>Sair</button>
        </div>
      </nav>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
        <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>Dashboard Executivo</h1>
        <p style={{color:'#8b949e',fontSize:'13px',marginBottom:'28px'}}>Bem-vindo ao OilSense v2 — {user?.email}</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'28px'}}>
          {cards.map(s => (
            <div key={s.label} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'20px',cursor:'pointer'}} onClick={() => router.push(s.href)}>
              <div style={{fontSize:'32px',fontWeight:'700',color:s.color,marginBottom:'4px'}}>{s.value}</div>
              <div style={{fontSize:'12px',color:'#8b949e',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{fontSize:'15px',fontWeight:'600',marginBottom:'16px'}}>Progresso da Migração</h2>
            {[
              ['Infraestrutura Vercel + Next.js', true],
              ['Domínio v2.oilssense.com', true],
              ['Supabase Auth', true],
              ['Dashboard com dados reais', true],
              ['Importar Laudos integrado', false],
              ['Engine IA + DUVAL migrado', false],
            ].map(([item, done]) => (
              <div key={item as string} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <span style={{color:done?'#22c55e':'#30363d',fontSize:'16px'}}>{done?'✓':'○'}</span>
                <span style={{fontSize:'13px',color:done?'#e6edf3':'#8b949e'}}>{item as string}</span>
              </div>
            ))}
          </div>
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{fontSize:'15px',fontWeight:'600',marginBottom:'16px'}}>Acesso Rápido</h2>
            {[
              ['OilSense Atual (Base44)', 'https://app.oilssense.com', '#4a90d9'],
              ['Importar Laudos', 'https://oilsense-import.netlify.app', '#22c55e'],
              ['Supabase', 'https://supabase.com/dashboard/project/rcxtgajofdsjwuaupvea', '#3ecf8e'],
              ['GitHub v2', 'https://github.com/andredahora-star/oilsense-v2', '#8b949e'],
            ].map(([label, url, color]) => (
              <a key={label} href={url as string} target="_blank" style={{display:'block',padding:'10px 14px',marginBottom:'8px',background:'#0d1117',borderRadius:'8px',color:color as string,textDecoration:'none',fontSize:'13px',fontWeight:'500'}}>
                {label as string} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}