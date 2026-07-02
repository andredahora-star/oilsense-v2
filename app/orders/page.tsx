'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
export default function Orders() {
  const { user, subId, company, loading, isAdmin, alertCount, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [transformers, setTransformers] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [form, setForm] = useState({transformer_id:'', titulo:'', prioridade:'media'})
  const [saving, setSaving] = useState(false)
  async function load() {
    if (!subId) return
    const [{ data: os }, { data: tr }] = await Promise.all([
      supabase.from('service_orders').select('*, transformers(identificacao,numero_serie,localizacao)').eq('subscription_id', subId).order('created_at', {ascending:false}),
      supabase.from('transformers').select('id,identificacao,numero_serie').eq('subscription_id', subId),
    ])
    setItems(os||[]); setTransformers(tr||[])
  }
  useEffect(() => { load() }, [subId])
  async function runMilkRun() {
    if (!subId) return
    setRunning(true); setMsg('')
    const d = await fetch('/api/milkrun',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription_id:subId})}).then(r=>r.json())
    setMsg(d.success ? d.os_criadas+' OS' : 'Erro: '+(d.error||''))
    await load(); setRunning(false)
  }
  async function updateStatus(id: string, status: string) { await supabase.from('service_orders').update({status}).eq('id',id); await load() }
  async function createOS() {
    if (!form.titulo.trim()) return
    setSaving(true)
    await supabase.from('service_orders').insert({subscription_id:subId,transformer_id:form.transformer_id||null,titulo:form.titulo.trim(),prioridade:form.prioridade,status:'aberta'})
    setSaving(false); setShowModal(false); setForm({transformer_id:'',titulo:'',prioridade:'media'}); await load()
  }
  if (loading) return <div className="loading-screen"><div className="spinner"/><span className="loading-text">Carregando...</span></div>
  const pc:Record<string,string>={alta:'#ef4444',media:'#fbbf24',baixa:'#6b7f72'}
  const sc:Record<string,string>={aberta:'#10b981',em_andamento:'#3b82f6',concluida:'#6b7f72'}
  const counts={total:items.length,aberta:items.filter(o=>o.status==='aberta').length,andamento:items.filter(o=>o.status==='em_andamento').length,concluida:items.filter(o=>o.status==='concluida').length}
  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div><h1 className="page-title">Ordens de Servico</h1><p className="page-subtitle">{counts.total} ordem{counts.total!==1?'s':''}</p></div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowModal(true)}>+ Nova OS</button>
            <button className="btn btn-secondary btn-sm" onClick={runMilkRun} disabled={running}>{running?'Executando...':'Milk Run'}</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowInfo(true)}>?</button>
          </div>
        </header>
        <div className="page-body">
          <div className="stat-grid" style={{marginBottom:'20px'}}>
            {[{l:'Total',v:counts.total,c:'var(--text)'},{l:'Abertas',v:counts.aberta,c:'#10b981'},{l:'Em andamento',v:counts.andamento,c:'#3b82f6'},{l:'Concluidas',v:counts.concluida,c:'#6b7f72'}].map(s=>(
              <div key={s.l} className="stat-card" style={{padding:'14px 18px'}}>
                <div className="stat-value" style={{fontSize:'24px',color:s.c}}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>
          {items.length===0?(
            <div className="empty-state"><div className="empty-title">Nenhuma OS criada</div><div className="empty-text">Use Nova OS ou Milk Run</div></div>
          ):items.map(o=>(
            <div key={o.id} className="row-item">
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{o.titulo||'Sem titulo'}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px'}}>
                  <span>{o.transformers?.identificacao||'Sem ativo'}</span>
                  <span>{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <span style={{fontSize:'11px',padding:'3px 8px',borderRadius:'4px',background:(pc[o.prioridade]||'#6b7f72')+'18',color:pc[o.prioridade]||'#6b7f72'}}>{o.prioridade}</span>
                <span style={{fontSize:'11px',padding:'3px 8px',borderRadius:'4px',background:(sc[o.status]||'#6b7f72')+'18',color:sc[o.status]||'#6b7f72'}}>{o.status}</span>
                {o.status==='aberta'&&<button className="btn btn-secondary btn-sm" onClick={()=>updateStatus(o.id,'em_andamento')}>Iniciar</button>}
                {o.status==='em_andamento'&&<button className="btn btn-sm" style={{background:'rgba(30,164,101,.1)',color:'#10b981',border:'1px solid rgba(30,164,101,.2)'}} onClick={()=>updateStatus(o.id,'concluida')}>Concluir</button>}
              </div>
            </div>
          ))}
        </div>
      </main>
      {showModal&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={()=>setShowModal(false)}><div className="card" style={{width:'400px',maxWidth:'90vw',padding:'24px'}} onClick={e=>e.stopPropagation()}><h2 style={{fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>Nova OS</h2><div style={{display:'flex',flexDirection:'column',gap:'12px'}}><div><label style={{fontSize:'12px',fontWeight:'600',display:'block',marginBottom:'4px'}}>Titulo *</label><input className="input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Coleta programada..." /></div><div><label style={{fontSize:'12px',fontWeight:'600',display:'block',marginBottom:'4px'}}>Ativo</label><select className="input select" value={form.transformer_id} onChange={e=>setForm({...form,transformer_id:e.target.value})}><option value="">Nenhum</option>{transformers.map(t=><option key={t.id} value={t.id}>{t.identificacao||t.numero_serie}</option>)}</select></div><div><label style={{fontSize:'12px',fontWeight:'600',display:'block',marginBottom:'4px'}}>Prioridade</label><select className="input select" value={form.prioridade} onChange={e=>setForm({...form,prioridade:e.target.value})}><option value="alta">Alta</option><option value="media">Media</option><option value="baixa">Baixa</option></select></div></div><div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'16px'}}><button className="btn btn-secondary btn-sm" onClick={()=>setShowModal(false)}>Cancelar</button><button className="btn btn-primary btn-sm" onClick={createOS} disabled={saving}>{saving?'Salvando...':'Criar'}</button></div></div></div>)}
      {showInfo&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={()=>setShowInfo(false)}><div className="card" style={{width:'420px',maxWidth:'90vw',padding:'24px'}} onClick={e=>e.stopPropagation()}><h2 style={{fontSize:'16px',fontWeight:'700',marginBottom:'12px'}}>Milk Run</h2><p style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.7}}>Varre analises alta/critica sem OS, agrupa por localizacao e cria uma OS por local. Roda diariamente as 6h.</p><div style={{display:'flex',justifyContent:'flex-end',marginTop:'16px'}}><button className="btn btn-primary btn-sm" onClick={()=>setShowInfo(false)}>Entendi</button></div></div></div>)}
    </div>
  )
}