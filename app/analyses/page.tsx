'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
const GASES=['H2','CH4','C2H2','C2H4','C2H6','CO','CO2','Furfural']
const GAS_KEYS=['h2','ch4','c2h2','c2h4','c2h6','co','co2','furfural']

// Sparkline SVG simples para tendencia de um gas ao longo do tempo
function Sparkline({values, color}: {values:number[]; color:string}) {
  if (values.length < 2) return <div style={{fontSize:'11px',color:'var(--text-dim)',padding:'8px 0'}}>Dados insuficientes para tendencia</div>
  const w=280, h=60, pad=6
  const max=Math.max(...values,1), min=Math.min(...values,0)
  const range=(max-min)||1
  const pts=values.map((v,i)=>{
    const x=pad+(i/(values.length-1))*(w-pad*2)
    const y=h-pad-((v-min)/range)*(h-pad*2)
    return [x,y]
  })
  const path=pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')
  const lastPt=pts[pts.length-1]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <path d={path} fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' opacity='.85' />
      {pts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r={i===pts.length-1?3.5:2} fill={color} opacity={i===pts.length-1?1:.5} />))}
    </svg>
  )
}

function List() {
  const {user,subId,loading,isAdmin,alertCount,supabase, company} = useAuth()
  const [items,setItems]=useState<any[]>([])
  const [diagnosing,setDiag]=useState<string|null>(null)
  const [view,setView]=useState<'timeline'|'trend'>('timeline')
  const [trendGas,setTrendGas]=useState('h2')
  const params=useSearchParams()
  const tid=params.get('transformer')
  const router=useRouter()

  useEffect(()=>{
    if(!subId)return
    let q=supabase.from('lab_analyses').select('*, transformers(identificacao,numero_serie,localizacao)').eq('subscription_id',subId).order('data_coleta',{ascending:true})
    if(tid)q=q.eq('transformer_id',tid)
    q.then(({data})=>setItems(data||[]))
  },[subId,tid])

  async function runDuval(id:string){
    setDiag(id)
    try{
      const res=await fetch('/api/diagnose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis_id:id})})
      const d=await res.json()
      if(d.success)setItems(prev=>prev.map(a=>a.id===id?{...a,severity:d.severity,diagnostic:d.diagnostic}:a))
    }finally{setDiag(null)}
  }

  if(loading)return<div className='loading-screen'><div className='spinner'/><span className='loading-text'>Carregando...</span></div>

  // ordem cronologica decrescente para a timeline (mais recente primeiro)
  const timeline=[...items].reverse()

  const gasColors:Record<string,string>={h2:'#3b82f6',ch4:'#a78bfa',c2h2:'#ef4444',c2h4:'#f59e0b',c2h6:'#22c55e',co:'#fbbf24',co2:'#6b7f72',furfural:'#ec4899'}
  const trendValues = items.map((a:any)=>a[trendGas]).filter((v:any)=>v!=null)
  const trendDates = items.filter((a:any)=>a[trendGas]!=null).map((a:any)=>a.data_coleta)

  return (
    <div className='app-layout'>
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount}/>
      <main className='main-content'>
        <header className='page-header'>
          <div><h1 className='page-title'>Analises{tid?' - Ativo':''}</h1><p className='page-subtitle'>{items.length} analise{items.length!==1?'s':''}{tid?' deste ativo':''}</p></div>
          <div style={{display:'flex',gap:'8px'}}>
            {tid&&<button className='btn btn-secondary btn-sm' onClick={()=>router.push('/analyses')}>Todos os ativos</button>}
            <button className='btn btn-primary btn-sm' onClick={()=>router.push('/import')}>Importar</button>
          </div>
        </header>
        <div className='page-body'>
          {items.length===0?(
            <div className='empty-state'><div className='empty-icon'>&#9123;</div><div className='empty-title'>Nenhuma analise ainda</div><div className='empty-text'>Importe laudos DGA para ver os gases e o diagnostico DUVAL</div></div>
          ):(
          <>
          {/* Grafico de tendencia - so faz sentido quando filtrado por um ativo com 2+ analises */}
          {tid && items.length>=2 && (
            <div className='card' style={{marginBottom:'20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
                <span style={{fontSize:'13px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.06em'}}>Tendencia de Evolucao</span>
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  {GAS_KEYS.map((k,i)=>(
                    <button key={k} onClick={()=>setTrendGas(k)} className={'btn btn-sm '+(trendGas===k?'btn-primary':'btn-secondary')} style={{padding:'4px 10px',fontSize:'11px'}}>{GASES[i]}</button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'20px',flexWrap:'wrap'}}>
                <Sparkline values={trendValues} color={gasColors[trendGas]} />
                <div style={{display:'flex',gap:'24px'}}>
                  <div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Primeira</div>
                    <div style={{fontSize:'18px',fontWeight:'700'}}>{trendValues[0]??'-'} <span style={{fontSize:'11px',color:'var(--text-dim)'}}>ppm</span></div>
                    <div style={{fontSize:'10px',color:'var(--text-dim)'}}>{trendDates[0]?new Date(trendDates[0]+'T00:00:00').toLocaleDateString('pt-BR'):''}</div>
                  </div>
                  <div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Atual</div>
                    <div style={{fontSize:'18px',fontWeight:'700',color:gasColors[trendGas]}}>{trendValues[trendValues.length-1]??'-'} <span style={{fontSize:'11px',color:'var(--text-dim)'}}>ppm</span></div>
                    <div style={{fontSize:'10px',color:'var(--text-dim)'}}>{trendDates[trendDates.length-1]?new Date(trendDates[trendDates.length-1]+'T00:00:00').toLocaleDateString('pt-BR'):''}</div>
                  </div>
                  <div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>Variacao</div>
                    {(()=>{
                      const f=trendValues[0],l=trendValues[trendValues.length-1]
                      if(f==null||l==null||f===0)return <div style={{fontSize:'18px',fontWeight:'700',color:'var(--text-dim)'}}>-</div>
                      const pct=((l-f)/f*100)
                      const up=pct>0
                      return <div style={{fontSize:'18px',fontWeight:'700',color:up?'#f87171':'#4ade80'}}>{up?'+':''}{pct.toFixed(0)}%</div>
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historico cronologico (mais recente primeiro) */}
          {timeline.map((a,idx)=>{
            const vals=GAS_KEYS.map(k=>a[k])
            const prev = idx < timeline.length-1 ? timeline[idx+1] : null
            return (
              <div key={a.id} className='card' style={{marginBottom:'12px',position:'relative'}}>
                {idx===0 && tid && <span className='badge badge-normal' style={{position:'absolute',top:'-9px',left:'16px',fontSize:'10px'}}>Mais recente</span>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',gap:'12px'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>
                      {!tid && <a href={'/analyses?transformer='+a.transformer_id} style={{color:'inherit',textDecoration:'none'}} onClick={(e)=>{e.preventDefault();router.push('/analyses?transformer='+a.transformer_id)}}>{a.transformers?.identificacao||a.transformers?.numero_serie||'Transformador'}</a>}
                      {tid && (a.transformers?.identificacao||a.transformers?.numero_serie||'Transformador')}
                    </div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',display:'flex',gap:'10px',flexWrap:'wrap'}}>
                      <span>Laudo {a.numero_laudo||'-'}</span>
                      <span>{a.laboratorio||'-'}</span>
                      {a.data_coleta&&<span>{new Date(a.data_coleta+'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                      <span>{a.oil_type||'Mineral'}</span>
                      {a.transformers?.localizacao&&<span>{a.transformers.localizacao}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                    {a.severity&&<span className={'badge badge-'+a.severity}>{a.severity}</span>}
                    <button className={'btn btn-sm '+(diagnosing===a.id?'btn-secondary':'btn-primary')} onClick={()=>runDuval(a.id)} disabled={diagnosing===a.id}>
                      {diagnosing===a.id?'Analisando...':'DUVAL'}
                    </button>
                  </div>
                </div>
                <div className='gas-grid'>
                  {GASES.map((g,i)=>{
                    const v=vals[i]
                    const pv = prev ? prev[GAS_KEYS[i]] : null
                    const delta = (v!=null && pv!=null) ? v-pv : null
                    const hi=v!=null&&((g==='C2H2'&&v>1)||(g==='H2'&&v>150)||(g==='CH4'&&v>130))
                    return (
                      <div key={g} className='gas-cell' style={hi?{borderColor:'rgba(239,68,68,.3)'}:{}}>
                        <div className='gas-name'>{g}</div>
                        <div className='gas-value' style={{color:v!=null?(hi?'#f87171':'var(--text)'):'var(--text-dim)'}}>{v!=null?v:'-'}</div>
                        {v!=null&&<div className='gas-unit'>ppm</div>}
                        {delta!=null && delta!==0 && (
                          <div style={{fontSize:'9px',marginTop:'3px',color:delta>0?'#f87171':'#4ade80',fontWeight:'600'}}>
                            {delta>0?'+':''}{delta.toFixed(0)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {a.diagnostic&&(
                  <div className='diagnostic-box'>
                    <div className='diagnostic-label'>Diagnostico DUVAL Engine</div>
                    <div className='diagnostic-text'>{a.diagnostic}</div>
                  </div>
                )}
              </div>
            )
          })}
          </>
          )}
        </div>
      </main>
    </div>
  )
}
export default function Analyses(){return(<Suspense fallback={<div className='loading-screen'><div className='spinner'/><span className='loading-text'>Carregando...</span></div>}><List/></Suspense>)}