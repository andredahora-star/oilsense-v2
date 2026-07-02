'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/lib/useAuth'
import Sidebar from '@/components/Sidebar'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
async function getSubId(): Promise<string|null> {
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return null
  const { data } = await sb.from('subscriptions').select('id').eq('user_id', session.user.id).limit(1)
  return data && data.length > 0 ? data[0].id : null
}
export default function ImportPage() {
  const { user, subId, company, loading, isAdmin, alertCount } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [oilType, setOilType] = useState('Mineral')
  const [done, setDone] = useState(0)
  const [uploading, setUploading] = useState(false)
  async function processFiles(files: FileList) {
    if (uploading) return
    setUploading(true)
    const id = subId || await getSubId()
    if (!id) { alert('Conta nao identificada'); setUploading(false); return }
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    setItems(prev => [...prev, ...pdfs.map(f => ({name:f.name,file:f,status:'pending',msg:''}))])
    for (const item of pdfs) {
      setItems(prev => prev.map(it => it.name===item.name?{...it,status:'processing'}:it))
      try {
        const b64 = await new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=()=>res((r.result as string).split(',')[1]);r.onerror=rej;r.readAsDataURL(item)})
        const d = await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pdf_base64:b64,oil_type:oilType,subscription_id:id})}).then(r=>r.json())
        if (!d.success) throw new Error(d.error||'Erro')
        setItems(prev=>prev.map(it=>it.name===item.name?{...it,status:'ok',msg:d.data?.numero_laudo||'Salvo'}:it))
        setDone(n=>n+1)
      } catch(e: any) {
        setItems(prev=>prev.map(it=>it.name===item.name?{...it,status:'error',msg:e.message?.slice(0,80)}:it))
      }
    }
    setUploading(false)
  }
  if (loading) return <div className="loading-screen"><div className="spinner"/><span className="loading-text">Carregando...</span></div>
  const sc:Record<string,string>={pending:'var(--text-muted)',processing:'#a78bfa',ok:'#10b981',error:'#ef4444'}
  const sl:Record<string,string>={pending:'Aguardando',processing:'Processando...',ok:'Importado',error:'Erro'}
  return (
    <div className="app-layout">
      <Sidebar email={user?.email} company={company} isAdmin={isAdmin} alertCount={alertCount} />
      <main className="main-content">
        <header className="page-header">
          <div><h1 className="page-title">Importar Laudos</h1><p className="page-subtitle">PDFs extraidos pelo Claude IA automaticamente</p></div>
        </header>
        <div className="page-body" style={{maxWidth:'720px'}}>
          <div className="card" style={{marginBottom:'16px',display:'flex',alignItems:'center',gap:'16px'}}>
            <label style={{fontSize:'13px',fontWeight:'600'}}>Tipo de oleo</label>
            <select className="input select" value={oilType} onChange={e=>setOilType(e.target.value)} style={{flex:1}}>
              <option>Mineral</option><option>Vegetal</option><option>Sintetico</option><option>Siliconado</option>
            </select>
          </div>
          <label className="upload-zone" style={{display:'block',opacity:uploading?0.6:1,cursor:uploading?'not-allowed':'pointer'}}>
            {uploading?(
              <><div className="spinner" style={{margin:'0 auto 12px'}}/><div style={{fontSize:'14px',color:'var(--text-muted)'}}>Processando...</div></>
            ):(
              <>
                <div style={{fontSize:'32px',marginBottom:'8px',opacity:0.4}}>PDF</div>
                <div style={{fontSize:'15px',fontWeight:'600',marginBottom:'4px'}}>Arraste PDFs ou clique</div>
                <div style={{fontSize:'13px',color:'var(--text-muted)'}}>Multiplos arquivos suportados</div>
                <input type="file" accept=".pdf" multiple style={{display:'none'}} disabled={uploading} onChange={e=>e.target.files&&processFiles(e.target.files)} />
              </>
            )}
          </label>
          {items.length>0&&<div style={{marginTop:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>{items.map((it,i)=>(
            <div key={i} className="row-item" style={{cursor:'default'}}>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</div>{it.msg&&<div style={{fontSize:'11px',color:it.status==='error'?'#f87171':'var(--text-muted)'}}>{it.msg}</div>}</div>
              <span style={{fontSize:'12px',padding:'3px 8px',borderRadius:'4px',background:sc[it.status]+'18',color:sc[it.status]}}>{sl[it.status]}</span>
            </div>
          ))}</div>}
          {done>0&&<div className="card" style={{marginTop:'16px',textAlign:'center',padding:'24px',background:'rgba(30,164,101,.05)',borderColor:'rgba(30,164,101,.2)'}}>
            <div style={{fontSize:'16px',fontWeight:'700',color:'#10b981',marginBottom:'4px'}}>{done} laudo{done>1?'s':''} importado{done>1?'s':''}</div>
            <a className="btn btn-primary" style={{marginTop:'12px',display:'inline-flex'}} href="/analyses">Ver analises</a>
          </div>}
        </div>
      </main>
    </div>
  )
}