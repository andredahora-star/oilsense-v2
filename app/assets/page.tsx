'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import Nav from '@/components/Nav'

const sc: Record<string,string> = { normal:'#22c55e', atencao:'#f39c12', critico:'#e74c3c' }

export default function Assets() {
  const { user, subId, loading, supabase } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!subId) return
    supabase.from('transformers').select('*').eq('subscription_id', subId).order('health_score',{ascending:true}).then(({data}) => setItems(data||[]))
  }, [subId])

  const filtered = items.filter(t =>
    (t.identificacao||'').toLowerCase().includes(search.toLowerCase()) ||
    (t.numero_serie||'').toLowerCase().includes(search.toLowerCase()) ||
    (t.localizacao||'').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center',color:'#8b949e',fontFamily:'system-ui'}}>Carregando...</div>

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <Nav email={user?.email} />
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>Ativos — Transformadores</h1>
            <p style={{color:'#8b949e',fontSize:'13px'}}>{items.length} transformador{items.length!==1?'es':''} monitorado{items.length!==1?'s':''}</p>
          </div>
          <button onClick={() => router.push('/import')} style={{padding:'8px 18px',background:'#22c55e',border:'none',borderRadius:'8px',color:'#0d1117',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>+ Importar Laudos</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[{l:'Total',v:items.length,c:'#e6edf3'},{l:'Critico',v:items.filter(t=>t.status==='critico').length,c:'#e74c3c'},{l:'Atencao',v:items.filter(t=>t.status==='atencao').length,c:'#f39c12'},{l:'Normal',v:items.filter(t=>t.status==='normal').length,c:'#22c55e'}].map(s=>(
            <div key={s.l} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'10px',padding:'16px 20px'}}>
              <div style={{fontSize:'26px',fontWeight:'700',color:s.c}}>{s.v}</div>
              <div style={{fontSize:'12px',color:'#8b949e',textTransform:'uppercase',marginTop:'2px'}}>{s.l}</div>
            </div>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por identificacao, serie ou localizacao..."
          style={{width:'100%',padding:'10px 16px',background:'#161b22',border:'1px solid #30363d',borderRadius:'8px',color:'#e6edf3',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'16px'}} />

        {filtered.length === 0 ? (
          <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'60px',textAlign:'center',color:'#8b949e'}}>
            {search ? 'Nenhum resultado.' : 'Nenhum transformador ainda. Importe os primeiros laudos para cadastrar automaticamente.'}
          </div>
        ) : filtered.map(t => (
          <div key={t.id} onClick={() => router.push('/analyses?transformer='+t.id)}
            style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px',display:'grid',gridTemplateColumns:'1fr auto',gap:'16px',alignItems:'center',cursor:'pointer'}}>
            <div style={{display:'grid',gridTemplateColumns:'200px 1fr 1fr 1fr',gap:'16px',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:'600'}}>{t.identificacao||t.numero_serie}</div>
                <div style={{fontSize:'12px',color:'#8b949e',marginTop:'2px'}}>{t.numero_serie}</div>
              </div>
              <div><div style={{fontSize:'12px',color:'#8b949e'}}>Fabricante</div><div style={{fontSize:'13px',marginTop:'2px'}}>{t.fabricante||'—'}</div></div>
              <div><div style={{fontSize:'12px',color:'#8b949e'}}>Potencia</div><div style={{fontSize:'13px',marginTop:'2px'}}>{t.potencia_kva?t.potencia_kva+' kVA':'—'}{t.tensao_kv?' · '+t.tensao_kv:''}</div></div>
              <div><div style={{fontSize:'12px',color:'#8b949e'}}>Localizacao</div><div style={{fontSize:'13px',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.localizacao||'—'}</div></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'22px',fontWeight:'700',color:(t.health_score||0)>=85?'#22c55e':(t.health_score||0)>=70?'#f39c12':'#e74c3c'}}>{t.health_score??'—'}</div>
                <div style={{fontSize:'11px',color:'#8b949e'}}>Score</div>
              </div>
              <span style={{fontSize:'12px',padding:'4px 12px',borderRadius:'20px',background:(sc[t.status]||'#8b949e')+'22',color:sc[t.status]||'#8b949e',border:'1px solid '+(sc[t.status]||'#8b949e')+'44',whiteSpace:'nowrap'}}>
                {t.status==='critico'?'Critico':t.status==='atencao'?'Atencao':'Normal'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}