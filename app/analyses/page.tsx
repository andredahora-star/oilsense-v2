'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Nav from '@/components/Nav'
const sc:Record<string,string>={normal:'#22c55e',atencao:'#f39c12',critico:'#e74c3c',critical:'#e74c3c',high:'#e74c3c',medium:'#f39c12',low:'#8b949e'}
function List() {
  const { user, subId, loading, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const params = useSearchParams()
  const tid = params.get('transformer')
  useEffect(() => {
    if (!subId) return
    let q = supabase.from('lab_analyses').select('*, transformers(identificacao,numero_serie)').eq('subscription_id', subId).order('created_at',{ascending:false})
    if (tid) q = q.eq('transformer_id', tid)
    q.then(({data}) => setItems(data||[]))
  }, [subId, tid])
  if (loading) return <p style={{color:'#8b949e',padding:'60px',textAlign:'center'}}>Carregando...</p>
  return (
    <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
      <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>Analises Laboratoriais</h1>
      <p style={{color:'#8b949e',fontSize:'13px',marginBottom:'24px'}}>{items.length} analise{items.length!==1?'s':''}</p>
      {items.length===0?(
        <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'60px',textAlign:'center',color:'#8b949e'}}>Nenhuma analise ainda. Importe laudos DGA para comecar.</div>
      ):items.map(a=>(
        <div key={a.id} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'14px',fontWeight:'600'}}>{a.transformers?.identificacao||a.transformers?.numero_serie||'Sem transformador'}</div>
              <div style={{fontSize:'12px',color:'#8b949e',marginTop:'2px'}}>Laudo {a.numero_laudo||'—'} · {a.laboratorio||'—'} · {a.data_coleta||'—'}</div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:(sc[a.severity||'normal'])+'22',color:sc[a.severity||'normal'],border:'1px solid '+(sc[a.severity||'normal'])+'44'}}>{a.severity||'normal'}</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:'8px'}}>
            {(['H2','CH4','C2H2','C2H4','C2H6','CO','CO2','Furfural'] as string[]).map((g,i)=>{
              const vals:any[]=[a.h2,a.ch4,a.c2h2,a.c2h4,a.c2h6,a.co,a.co2,a.furfural];const v=vals[i];
              return(
                <div key={g} style={{background:'#0d1117',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#8b949e',marginBottom:'4px'}}>{g}</div>
                  <div style={{fontSize:'14px',fontWeight:'600',color:v!=null?'#e6edf3':'#30363d'}}>{v??'—'}</div>
                  {v!=null&&<div style={{fontSize:'10px',color:'#8b949e'}}>ppm</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
export default function Analyses() {
  const { user } = useAuth()
  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <Nav email={user?.email} />
      <Suspense fallback={<p style={{color:'#8b949e',padding:'60px',textAlign:'center'}}>Carregando...</p>}><List /></Suspense>
    </div>
  )
}