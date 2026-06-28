'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Nav from '@/components/Nav'
const sc:Record<string,string> = {critical:'#e74c3c',high:'#e74c3c',medium:'#f39c12',low:'#8b949e'}
export default function Alerts() {
  const { user, subId, loading, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState<'open'|'all'>('open')
  useEffect(() => {
    if (!subId) return
    let q = supabase.from('alerts').select('*, transformers(identificacao,numero_serie)').eq('subscription_id', subId).order('created_at',{ascending:false})
    if (filter==='open') q = q.eq('resolved', false)
    q.then(({data}) => setItems(data||[]))
  }, [subId, filter])
  if (loading) return <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontFamily:'system-ui'}}>Carregando...</div>
  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <Nav email={user?.email} />
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>Alertas</h1>
            <p style={{color:'#8b949e',fontSize:'13px'}}>{items.length} alerta{items.length!==1?'s':''} {filter==='open'?'aberto':'no total'}{items.length!==1?'s':''}</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            {(['open','all'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{fontSize:'12px',padding:'6px 14px',borderRadius:'6px',border:'1px solid #30363d',background:filter===f?'#161b22':'transparent',color:filter===f?'#e6edf3':'#8b949e',cursor:'pointer',fontFamily:'inherit'}}>{f==='open'?'Abertos':'Todos'}</button>
            ))}
          </div>
        </div>
        {items.length===0 ? (
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'60px',textAlign:'center',color:'#8b949e'}}>{filter==='open'?'Nenhum alerta aberto.':'Nenhum alerta registrado.'}</div>
        ) : items.map(a => (
          <div key={a.id} style={{background:'#161b22',border:'1px solid '+(sc[a.severity]||'#30363d')+'44',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:(sc[a.severity]||'#8b949e')+'22',color:sc[a.severity]||'#8b949e',border:'1px solid '+(sc[a.severity]||'#8b949e')+'44',fontWeight:'700'}}>{a.severity}</span>
                  <span style={{fontSize:'14px',fontWeight:'600'}}>{a.title}</span>
                </div>
                <div style={{fontSize:'13px',color:'#8b949e',marginBottom:'4px'}}>{a.message}</div>
                <div style={{fontSize:'12px',color:'#8b949e'}}>{a.transformers?.identificacao||'—'} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              {a.resolved&&<span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:'#22c55e22',color:'#22c55e',border:'1px solid #22c55e44',flexShrink:0,marginLeft:'12px'}}>Resolvido</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}