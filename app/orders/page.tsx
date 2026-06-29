'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Nav from '@/components/Nav'

const prioColor: Record<string,string> = { alta:'#e74c3c', media:'#f39c12', baixa:'#8b949e' }
const statusColor: Record<string,string> = { aberta:'#22c55e', em_andamento:'#4a90d9', concluida:'#8b949e' }

export default function Orders() {
  const { user, subId, loading, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [milkMsg, setMilkMsg] = useState('')

  async function load() {
    if (!subId) return
    const { data } = await supabase
      .from('service_orders')
      .select('*, transformers(identificacao, numero_serie, localizacao)')
      .eq('subscription_id', subId)
      .order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [subId])

  async function runMilkRun() {
    if (!subId) return
    setRunning(true)
    setMilkMsg('')
    try {
      const res = await fetch('/api/milkrun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: subId })
      })
      const data = await res.json()
      if (data.success) {
        setMilkMsg(data.os_criadas + ' OS criada' + (data.os_criadas !== 1 ? 's' : '') + ' pelo Milk Run')
        await load()
      } else {
        setMilkMsg('Erro: ' + (data.error || 'desconhecido'))
      }
    } catch (e: any) {
      setMilkMsg('Erro: ' + e.message)
    } finally {
      setRunning(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('service_orders').update({ status }).eq('id', id)
    await load()
  }

  if (loading) return <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontFamily:'system-ui'}}>Carregando...</div>

  const counts = {
    total: items.length,
    aberta: items.filter(o => o.status === 'aberta').length,
    andamento: items.filter(o => o.status === 'em_andamento').length,
    concluida: items.filter(o => o.status === 'concluida').length,
  }

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <Nav email={user?.email} />
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'24px',gap:'16px',flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>Ordens de Servico</h1>
            <p style={{color:'#8b949e',fontSize:'13px'}}>{counts.total} ordem{counts.total!==1?'s':''} no total</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
            <button onClick={runMilkRun} disabled={running}
              style={{padding:'8px 18px',background:running?'#161b22':'#4a90d9',color:'#fff',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:running?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {running ? 'Executando...' : 'Milk Run — Gerar OS'}
            </button>
            {milkMsg && <span style={{fontSize:'12px',color:milkMsg.includes('Erro')?'#e74c3c':'#22c55e'}}>{milkMsg}</span>}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'24px'}}>
          {[{l:'Total',v:counts.total,c:'#e6edf3'},{l:'Abertas',v:counts.aberta,c:'#22c55e'},{l:'Em andamento',v:counts.andamento,c:'#4a90d9'},{l:'Concluidas',v:counts.concluida,c:'#8b949e'}].map(s=>(
            <div key={s.l} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'10px',padding:'16px 20px'}}>
              <div style={{fontSize:'26px',fontWeight:'700',color:s.c}}>{s.v}</div>
              <div style={{fontSize:'12px',color:'#8b949e',textTransform:'uppercase',marginTop:'2px'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'60px',textAlign:'center',color:'#8b949e'}}>
            Nenhuma OS. Use o botao Milk Run para gerar automaticamente com base nos alertas.
          </div>
        ) : items.map(o => (
          <div key={o.id} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>{o.titulo||'Sem titulo'}</div>
                <div style={{fontSize:'12px',color:'#8b949e',marginBottom:'8px'}}>
                  {o.transformers?.identificacao||o.transformers?.numero_serie||'—'}
                  {o.transformers?.localizacao ? ' · ' + o.transformers.localizacao : ''}
                  {' · ' + new Date(o.created_at).toLocaleDateString('pt-BR')}
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:(prioColor[o.prioridade]||'#8b949e')+'22',color:prioColor[o.prioridade]||'#8b949e',border:'1px solid '+(prioColor[o.prioridade]||'#8b949e')+'44'}}>
                    Prioridade {o.prioridade}
                  </span>
                  <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:(statusColor[o.status]||'#8b949e')+'22',color:statusColor[o.status]||'#8b949e',border:'1px solid '+(statusColor[o.status]||'#8b949e')+'44'}}>
                    {o.status}
                  </span>
                </div>
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                {o.status === 'aberta' && (
                  <button onClick={()=>updateStatus(o.id,'em_andamento')}
                    style={{fontSize:'11px',padding:'4px 10px',background:'transparent',border:'1px solid #4a90d9',borderRadius:'6px',color:'#4a90d9',cursor:'pointer',fontFamily:'inherit'}}>
                    Iniciar
                  </button>
                )}
                {o.status === 'em_andamento' && (
                  <button onClick={()=>updateStatus(o.id,'concluida')}
                    style={{fontSize:'11px',padding:'4px 10px',background:'transparent',border:'1px solid #22c55e',borderRadius:'6px',color:'#22c55e',cursor:'pointer',fontFamily:'inherit'}}>
                    Concluir
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}