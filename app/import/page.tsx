'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Buscar subscription_id diretamente â chamado no momento do upload como garantia
async function getSubId(): Promise<string|null> {
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return null
  const { data } = await sb
    .from('subscriptions')
    .select('id')
    .eq('user_id', session.user.id)
    .limit(1)
  return data && data.length > 0 ? data[0].id : null
}

export default function ImportPage(){
  const {user,subId,loading,isAdmin,alertCount}=useAuth()
  const [items,setItems]=useState<any[]>([])
  const [oilType,setOilType]=useState('Mineral')
  const [done,setDone]=useState(0)
  const [uploading,setUploading]=useState(false)

  async function processFiles(files:FileList){
    if(uploading) return
    setUploading(true)
    // GARANTIA: buscar subId direto do Supabase no momento do upload
    // (nao depender do estado do hook que pode ter race condition)
    const currentSubId = subId || await getSubId()
    if(!currentSubId){
      alert('Erro: nao foi possivel identificar sua conta. Faca login novamente.')
      setUploading(false)
      return
    }
    const pdfs=Array.from(files).filter(f=>f.name.toLowerCase().endsWith('.pdf'))
    const newItems=pdfs.map(f=>({name:f.name,file:f,status:'pending',msg:''}))
    setItems(prev=>[...prev,...newItems])
    for(const item of newItems){
      setItems(prev=>prev.map(it=>it.name===item.name?{...it,status:'processing'}:it))
      try{
        const b64=await new Promise<string>((res,rej)=>{
          const r=new FileReader()
          r.onload=()=>res((r.result as string).split(',')[1])
          r.onerror=rej
          r.readAsDataURL(item.file)
        })
        const resp=await fetch('/api/import',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            pdf_base64:b64,
            oil_type:oilType,
            subscription_id:currentSubId
          })
        })
        const d=await resp.json()
        if(!d.success)throw new Error(d.error||'Erro')
        setItems(prev=>prev.map(it=>it.name===item.name?{...it,status:'ok',msg:d.data?.numero_laudo||'Salvo'}:it))
        setDone(n=>n+1)
      }catch(e:any){
        setItems(prev=>prev.map(it=>it.name===item.name?{...it,status:'error',msg:e.message?.slice(0,120)}:it))
      }
    }
    setUploading(false)
  }

  if(loading)return<div className='loading-screen'><div className='spinner'/><span className='loading-text'>Carregando...</span></div>

  const sc:Record<string,string>={pending:'var(--text-muted)',processing:'#a78bfa',ok:'#22c55e',error:'#ef4444'}
  const sl:Record<string,string>={pending:'Aguardando',processing:'Processando com IA...',ok:'Importado',error:'Erro'}

  return(
    <div className='app-layout'>
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount}/>
      <main className='main-content'>
        <header className='page-header'>
          <div>
            <h1 className='page-title'>Importar Laudos</h1>
            <p className='page-subtitle'>PDFs extraidos pelo Claude IA e salvos automaticamente no Supabase</p>
          </div>
        </header>
        <div className='page-body' style={{maxWidth:'720px'}}>
          <div className='card' style={{marginBottom:'16px',display:'flex',alignItems:'center',gap:'16px'}}>
            <label style={{fontSize:'13px',fontWeight:'600',flexShrink:0}}>Tipo de oleo</label>
            <select className='input select' value={oilType} onChange={e=>setOilType(e.target.value)} style={{flex:1}}>
              <option>Mineral</option>
              <option>Vegetal</option>
              <option>Sintetico</option>
              <option>Siliconado</option>
            </select>
          </div>

          <label className='upload-zone' style={{display:'block',opacity:uploading?0.6:1,cursor:uploading?'not-allowed':'pointer'}}>
            {uploading ? (
              <><div className='spinner' style={{margin:'0 auto 12px'}}/><div style={{fontSize:'14px',color:'var(--text-muted)'}}>Processando com IA...</div></>
            ) : (
              <>
                <div style={{fontSize:'40px',marginBottom:'12px',opacity:.5}}>PDF</div>
                <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'6px'}}>Arraste PDFs ou clique para selecionar</div>
                <div style={{fontSize:'13px',color:'var(--text-muted)'}}>Multiplos arquivos suportados</div>
                <input type='file' accept='.pdf' multiple style={{display:'none'}} disabled={uploading} onChange={e=>e.target.files&&processFiles(e.target.files)}/>
              </>
            )}
          </label>

          {items.length>0&&(
            <div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
              {items.map((it,i)=>(
                <div key={i} className='row-item' style={{cursor:'default'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'500',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</div>
                    {it.msg&&<div style={{fontSize:'12px',color:it.status==='error'?'#f87171':'var(--text-muted)',marginTop:'2px'}}>{it.msg}</div>}
                  </div>
                  <span style={{fontSize:'12px',padding:'3px 10px',borderRadius:'20px',background:sc[it.status]+'18',color:sc[it.status],border:'1px solid '+sc[it.status]+'30',flexShrink:0}}>{sl[it.status]}</span>
                </div>
              ))}
            </div>
          )}

          {done>0&&(
            <div className='card' style={{marginTop:'16px',background:'rgba(34,197,94,.06)',borderColor:'rgba(34,197,94,.2)',textAlign:'center',padding:'28px'}}>
              <div style={{fontSize:'16px',fontWeight:'700',color:'#4ade80',marginBottom:'4px'}}>{done} laudo{done>1?'s':''} importado{done>1?'s':''}</div>
              <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'16px'}}>Diagnostico DUVAL calculado e alertas gerados automaticamente</div>
              <a className='btn btn-primary' href='/analyses'>Ver analises</a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}