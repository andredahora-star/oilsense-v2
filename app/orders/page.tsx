'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Nav from '@/components/Nav'

const prioColor: Record<string,string> = { alta:'#e74c3c', media:'#f39c12', baixa:'#8b949e' }
const statusColor: Record<string,string> = { aberta:'#22c55e', 'em_andamento':'#4a90d9', concluida:'#8b949e' }

export default function Orders() {
  const { user, subId, loading, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    if (!subId) return
    supabase.from('service_orders').select('*, transformers(identificacao,numero_serie)').eq('subscription_id', subId).order('created_at',{ascending:false}).then(({data}) => setItems(data||[]))
  }, [subId])

  if (loading) return <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontFamily:'system-ui'}}>Carregando...</div>

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <Nav email={user?.email} />
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
        <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>Ordens de Servico</h1>
        <p style={{color:'#8b949e',fontSize:'13px',marginBottom:'24px'}}>{items.length} ordem{items.length!==1?'s':''} cadastrada{items.length!==1?'s':''}</p>

        {items.length === 0 ? (
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'60px',textAlign:'center',color:'#8b949e'}}>
            Nenhuma ordem de servico ainda.
          </div>
        ) : items.map(o => (
          <div key={o.id} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{o.titulo||'Sem titulo'}</div>
              <div style={{fontSize:'12px',color:'#8b949e'}}>{o.transformers?.identificacao||o.transformers?.numero_serie||'—'} · {new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:(prioColor[o.prioridade]||'#8b949e')+'22',color:prioColor[o.prioridade]||'#8b949e',border:'1px solid '+(prioColor[o.prioridade]||'#8b949e')+'44'}}>
                Prioridade: {o.prioridade}
              </span>
              <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:(statusColor[o.status]||'#8b949e')+'22',color:statusColor[o.status]||'#8b949e',border:'1px solid '+(statusColor[o.status]||'#8b949e')+'44'}}>
                {o.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}