'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'

export default function Orders() {
  const {user,subId,loading,isAdmin,alertCount,supabase}=useAuth()
  const [items,setItems]=useState<any[]>([])
  const [transformers,setTransformers]=useState<any[]>([])
  const [running,setRunning]=useState(false)
  const [msg,setMsg]=useState('')
  const [showModal,setShowModal]=useState(false)
  const [showInfo,setShowInfo]=useState(false)
  const [form,setForm]=useState({transformer_id:'',titulo:'',prioridade:'media'})
  const [saving,setSaving]=useState(false)

  async function load() {
    if (!subId) return
    const [{data:os},{data:tr}] = await Promise.all([
      supabase.from('service_orders').select('*, transformers(identificacao,numero_serie,localizacao)').eq('subscription_id',subId).order('created_at',{ascending:false}),
      supabase.from('transformers').select('id,identificacao,numero_serie').eq('subscription_id',subId).order('identificacao'),
    ])
    setItems(os||[])
    setTransformers(tr||[])
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

  async function createOS() {
    if (!form.titulo.trim()) { setMsg('Erro: informe um titulo para a OS'); return }
    setSaving(true)
    const { error } = await supabase.from('service_orders').insert({
      subscription_id: subId,
      transformer_id: form.transformer_id || null,
      titulo: form.titulo.trim(),
      prioridade: form.prioridade,
      status: 'aberta',
    })
    setSaving(false)
    if (error) { setMsg('Erro: '+error.message); return }
    setShowModal(false)
    setForm({transformer_id:'',titulo:'',prioridade:'media'})
    setMsg('OS criada manualmente')
    await load()
  }

  if (loading) return <div className='loading-screen'><div className='spinner'/><span className='loading-text'>Carregando...</span></div>

  const pc: Record<string,string> = {alta:'#ef4444',media:'#f59e0b',baixa:'#6b7f72'}
  const sc: Record<string,string> = {aberta:'#22c55e',em_andamento:'#3b82f6',concluida:'#6b7f72'}
  const counts = {total:items.length, aberta:items.filter(o=>o.status==='aberta').length, andamento:items.filter(o=>o.status==='em_andamento').length, concluida:items.filter(o=>o.status==='concluida').length}

  return (
    <div className='app-layout'>
      <Sidebar email={user?.email} isAdmin={isAdmin} alertCount={alertCount} />
      <main className='main-content'>
        <header className='page-header'>
          <div>
            <h1 className='page-title'>Ordens de Servico</h1>
            <p className='page-subtitle'>{counts.total} ordem{counts.total!==1?'s':''} no total</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
            <div style={{display:'flex',gap:'8px'}}>
              <button className='btn btn-primary btn-sm' onClick={()=>setShowModal(true)}>+ Nova OS</button>
              <button className={'btn btn-sm '+(running?'btn-secondary':'btn-secondary')} onClick={runMilkRun} disabled={running} title='Agrupa ativos criticos/altos sem OS por localizacao'>
                {running?'Executando...':'Milk Run'}
              </button>
              <button className='btn btn-secondary btn-sm' onClick={()=>setShowInfo(true)} style={{padding:'5px 10px'}}>?</button>
            </div>
            {msg&&<span style={{fontSize:'11px',color:msg.includes('Erro')?'#f87171':'#4ade80'}}>{msg}</span>}
          </div>
        </header>

        <div className='page-body'>
          <div className='stat-grid' style={{marginBottom:'20px'}}>
            {[{l:'Total',v:counts.total,c:'var(--text)'},{l:'Abertas',v:counts.aberta,c:'#22c55e'},{l:'Em andamento',v:counts.andamento,c:'#3b82f6'},{l:'Concluidas',v:counts.concluida,c:'#6b7f72'}].map(s=>(
              <div key={s.l} className='stat-card' style={{padding:'14px 18px'}}>
                <div className='stat-value' style={{fontSize:'24px',color:s.c}}>{s.v}</div>
                <div className='stat-label'>{s.l}</div>
              </div>
            ))}
          </div>

          {items.length===0?(
            <div className='empty-state'>
              <div className='empty-icon'>&#9881;</div>
              <div className='empty-title'>Nenhuma OS criada</div>
              <div className='empty-text'>Crie manualmente com '+ Nova OS' ou use o Milk Run para gerar automaticamente a partir dos alertas</div>
            </div>
          ):items.map(o=>(
            <div key={o.id} className='row-item'>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{o.titulo||'Sem titulo'}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  <span>{o.transformers?.identificacao||o.transformers?.numero_serie||'Sem ativo vinculado'}</span>
                  {o.transformers?.localizacao&&<span>{o.transformers.localizacao}</span>}
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
                {o.status==='aberta'&&<button className='btn btn-secondary btn-sm' onClick={()=>updateStatus(o.id,'em_andamento')}>Iniciar</button>}
                {o.status==='em_andamento'&&<button className='btn btn-sm' style={{background:'rgba(34,197,94,.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,.2)'}} onClick={()=>updateStatus(o.id,'concluida')}>Concluir</button>}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Nova OS */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={()=>setShowModal(false)}>
          <div className='card card-lg' style={{width:'420px',maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>Nova Ordem de Servico</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:'600',marginBottom:'6px',display:'block'}}>Titulo *</label>
                <input className='input' value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder='Ex: Coleta programada - acompanhamento mensal' />
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:'600',marginBottom:'6px',display:'block'}}>Ativo (opcional)</label>
                <select className='input select' value={form.transformer_id} onChange={e=>setForm({...form,transformer_id:e.target.value})}>
                  <option value=''>Nenhum ativo especifico</option>
                  {transformers.map(t=>(<option key={t.id} value={t.id}>{t.identificacao||t.numero_serie}</option>))}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:'600',marginBottom:'6px',display:'block'}}>Prioridade</label>
                <select className='input select' value={form.prioridade} onChange={e=>setForm({...form,prioridade:e.target.value})}>
                  <option value='alta'>Alta</option>
                  <option value='media'>Media</option>
                  <option value='baixa'>Baixa</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'20px'}}>
              <button className='btn btn-secondary btn-sm' onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className='btn btn-primary btn-sm' onClick={createOS} disabled={saving}>{saving?'Salvando...':'Criar OS'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal explicacao Milk Run */}
      {showInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={()=>setShowInfo(false)}>
          <div className='card card-lg' style={{width:'440px',maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:'16px',fontWeight:'700',marginBottom:'12px'}}>Como funciona o Milk Run</h2>
            <p style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'10px'}}>
              O Milk Run e uma rotina automatica que varre todas as analises com severidade <b>alta</b> ou <b>critica</b> que ainda nao tem uma OS aberta vinculada.
            </p>
            <p style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'10px'}}>
              Ele agrupa esses ativos por <b>localizacao</b> (subestacao, complexo, parque) e cria uma unica OS por local, permitindo que a equipe de campo faca uma rota de coleta otimizada visitando varios transformadores no mesmo deslocamento — em vez de uma viagem por ativo.
            </p>
            <p style={{fontSize:'13px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'10px'}}>
              A prioridade da OS gerada e <b>alta</b> se algum ativo do grupo estiver com severidade critica, ou <b>media</b> caso contrario. Roda automaticamente todo dia as 6h, ou pode ser disparado manualmente aqui.
            </p>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'16px'}}>
              <button className='btn btn-primary btn-sm' onClick={()=>setShowInfo(false)}>Entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}