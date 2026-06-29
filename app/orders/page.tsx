'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'

export default function Orders() {
  const { user, subId, loading, isAdmin, alertCount, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    if (!subId) return
    const {data} = await supabase.from('service_orders').select('*, transformers(identificacao,numero_serie,localizacao)').eq('subscription_id',subId).order('created_at',{ascending:false})
    setItems(data||[])
  }

  useEffect(()=>{load()},[subId])

  async function runMilkRun() {
    if (!subId) return
    setRunning(true); setMsg('')
    const res = await fetch('/api/milkrun',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription_id:subId})})
    const d = await res.json()
    setMsg(d.success ? d.os_criadas+' OS criada'+(d.os_criadas!==1?'s':'')+' pelo Milk Run' : 'Erro: '+(d.error||''))
    await load(); setRunning(false)
  }

  async function updateStatus(id:string, status:string) {
    await supabase.from('service_orders').update({status}).eq('id',id)
    await load()
  }

  if (loading) return <div className="loading-screen"><div className="spinner"/><span className="loading-text">Carregando...</span></div>

  const pc: Record<string,string> = {alta:'#ef4444',media:'#f59e0b',baixa:'#6b7f72'}
  const sc: Record<string,string> = {aberta:'#22c55e',em_andamento:'#3b82f6',concluida:'#6b7f72'}
  const counts = {total:items.length, aberta:items.filter(o=>o.status==='aberta').length, andamento:items.filter(o=>o.status==='em_andamento').length, concluida:items.filter(o=>o.status==='concluida').length}

  return (
    <div className="app-layout">
      <Sidebar email={user?.email} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Ordens de Serviço</h1>
            <p className="page-subtitle">{counts.total} ordem{counts.total!==1?'s':''} no total</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
            <button className={'btn btn-sm '+(running?'btn-secondary':'btn-primary')} onClick={runMilkRun} disabled={running}>
              {running?'Executando...':'⟳ Milk Run'}
            </button>
            {msg&&<span style={{fontSize:'11px',color:msg.includes('Erro')?'#f87171':'#4ade80'}}>{msg}</span>}
          </div>
        </header>
        <div className="page-body">
          <div className="stat-grid" style={{marginBottom:'20px'}}>
            {[{l:'Total',v:counts.total,c:'var(--text)'},{l:'Abertas',v:counts.aberta,c:'#22c55e'},{l:'Em andamento',v:counts.andamento,c:'#3b82f6'},{l:'Concluídas',v:counts.concluida,c:'#6b7f72'}].map(s=>(
              <div key={s.l} className="stat-card" style={{padding:'14px 18px'}}>
                <div className="stat-value" style={{fontSize:'24px',color:s.c}}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>
          {items.length===0?(
            <div className="empty-state">
              <div className="empty-icon">⚙</div>
              <div className="empty-title">Nenhuma OS criada</div>
              <div className="empty-text">Use o Milk Run para gerar ordens automaticamente a partir dos alertas</div>
            </div>
          ):items.map(o=>(
            <div key={o.id} className="row-item">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{o.titulo||'Sem título'}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  <span>{o.transformers?.identificacao||o.transformers?.numero_serie||'—'}</span>
                  {o.transformers?.localizacao&&<span>📍 {o.transformers.localizacao}</span>}
                  <span>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:(pc[o.prioridade]||'#6b7f72')+'15',color:pc[o.prioridade]||'#6b7f72',border:'1px solid '+(pc[o.prioridade]||'#6b7f72')+'30'}}>
                  {o.prioridade}
                </span>
                <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:(sc[o.status]||'#6b7f72')+'15',color:sc[o.status]||'#6b7f72',border:'1px solid '+(sc[o.status]||'#6b7f72')+'30'}}>
                  {o.status}
                </span>
                {o.status==='aberta'&&<button className="btn btn-secondary btn-sm" onClick={()=>updateStatus(o.id,'em_andamento')}>Iniciar</button>}
                {o.status==='em_andamento'&&<button className="btn btn-sm" style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.2)'}} onClick={()=>updateStatus(o.id,'concluida')}>Concluir</button>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}