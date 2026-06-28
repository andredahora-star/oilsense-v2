export default function Dashboard() {
  const stats = [
    { label: 'Transformadores', value: '—', color: '#e6edf3' },
    { label: 'Total Análises', value: '—', color: '#e6edf3' },
    { label: 'Alertas Ativos', value: '—', color: '#e74c3c' },
    { label: 'OS Abertas', value: '—', color: '#f39c12' },
  ]
  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',padding:'32px 24px',fontFamily:'system-ui,sans-serif'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'32px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#0d1117'}}>OS</div>
          <span style={{fontSize:'18px',fontWeight:'600'}}>OilSense</span>
          <span style={{fontSize:'11px',background:'rgba(34,197,94,0.15)',color:'#22c55e',padding:'3px 10px',borderRadius:'20px',fontWeight:'500'}}>v2 beta</span>
        </div>
        <h1 style={{fontSize:'26px',fontWeight:'700',marginBottom:'6px'}}>Dashboard Executivo</h1>
        <p style={{color:'#8b949e',marginBottom:'32px',fontSize:'14px'}}>Bem-vindo ao OilSense v2 — migrando do Base44</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'32px'}}>
          {stats.map(s => (
            <div key={s.label} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'20px'}}>
              <div style={{fontSize:'28px',fontWeight:'700',color:s.color,marginBottom:'4px'}}>{s.value}</div>
              <div style={{fontSize:'12px',color:'#8b949e',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px'}}>Progresso da Migração</h2>
            {[
              { item: 'Infraestrutura Next.js + Vercel', done: true },
              { item: 'Supabase conectado', done: false },
              { item: 'Autenticação', done: false },
              { item: 'Dashboard com dados reais', done: false },
              { item: 'Importar Laudos', done: false },
              { item: 'Engine IA + DUVAL', done: false },
            ].map(m => (
              <div key={m.item} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <span style={{color: m.done ? '#22c55e' : '#30363d', fontSize:'16px'}}>{m.done ? '✓' : '○'}</span>
                <span style={{fontSize:'13px',color: m.done ? '#e6edf3' : '#8b949e'}}>{m.item}</span>
              </div>
            ))}
          </div>
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{fontSize:'16px',fontWeight:'600',marginBottom:'16px'}}>Links Rápidos</h2>
            {[
              { label: 'OilSense Atual (Base44)', url: 'https://app.oilssense.com', color: '#4a90d9' },
              { label: 'Importar Laudos (Netlify)', url: 'https://oilsense-import.netlify.app', color: '#22c55e' },
              { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard/project/rcxtgajofdsjwuaupvea', color: '#3ecf8e' },
              { label: 'Repositório GitHub', url: 'https://github.com/andredahora-star/oilsense-v2', color: '#8b949e' },
            ].map(l => (
              <a key={l.label} href={l.url} target="_blank" style={{display:'block',padding:'10px 14px',marginBottom:'8px',background:'#0d1117',borderRadius:'8px',color:l.color,textDecoration:'none',fontSize:'13px',fontWeight:'500'}}>
                {l.label} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}