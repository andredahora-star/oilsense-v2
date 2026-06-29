'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets',    label: 'Ativos' },
  { href: '/analyses',  label: 'Analises' },
  { href: '/alerts',    label: 'Alertas' },
  { href: '/orders',    label: 'OS' },
  { href: '/import',    label: 'Importar' },
]

export default function Nav({ email, isAdmin }: { email?: string; isAdmin?: boolean }) {
  const router = useRouter()
  const path = usePathname()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{borderBottom:'1px solid #30363d',padding:'0 24px',display:'flex',alignItems:'center',height:'56px',background:'#0d1117',fontFamily:'system-ui,sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginRight:'28px',flexShrink:0}}>
        <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'700',color:'#0d1117'}}>OS</div>
        <span style={{fontWeight:'600',color:'#e6edf3',fontSize:'15px'}}>OilSense</span>
        <span style={{fontSize:'11px',background:'rgba(34,197,94,0.15)',color:'#22c55e',padding:'2px 8px',borderRadius:'20px'}}>v2</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'2px',flex:1}}>
        {links.map(l => (
          <button key={l.href} onClick={() => router.push(l.href)}
            style={{fontSize:'13px',padding:'6px 12px',border:'none',borderRadius:'6px',color:path===l.href?'#e6edf3':'#8b949e',cursor:'pointer',fontFamily:'inherit',fontWeight:path===l.href?'600':'400',background:path===l.href?'#161b22':'transparent'}}>
            {l.label}
          </button>
        ))}
        {isAdmin && (
          <button onClick={() => router.push('/admin')}
            style={{fontSize:'13px',padding:'6px 12px',border:'none',borderRadius:'6px',color:path==='/admin'?'#e74c3c':'#e74c3c88',cursor:'pointer',fontFamily:'inherit',fontWeight:path==='/admin'?'700':'400',background:path==='/admin'?'rgba(231,76,60,0.1)':'transparent'}}>
            Admin
          </button>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
        <span style={{fontSize:'12px',color:'#8b949e'}}>{email}</span>
        <button onClick={logout} style={{fontSize:'12px',padding:'6px 12px',background:'transparent',border:'1px solid #30363d',borderRadius:'6px',color:'#8b949e',cursor:'pointer',fontFamily:'inherit'}}>Sair</button>
      </div>
    </nav>
  )
}