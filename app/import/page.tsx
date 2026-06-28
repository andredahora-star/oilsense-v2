'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ImportPage() {
  const [items, setItems] = useState<any[]>([])
  const [oilType, setOilType] = useState('Mineral')
  const [subId, setSubId] = useState<string|null>(null)
  const [done, setDone] = useState(0)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: sub } = await supabase
        .from('subscriptions').select('id').eq('user_id', session.user.id).single()
      if (sub) setSubId(sub.id)
    })
  }, [])

  async function processFiles(files: FileList) {
    const pdfs = Array.from(files).filter(f => f.name.endsWith('.pdf'))
    const newItems = pdfs.map(f => ({ name: f.name, file: f, status: 'pending', msg: '' }))
    setItems(prev => [...prev, ...newItems])

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i]
      setItems(prev => prev.map(it => it.name === item.name ? {...it, status: 'processing'} : it))
      try {
        const b64 = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res((r.result as string).split(',')[1])
          r.onerror = rej
          r.readAsDataURL(item.file)
        })
        const resp = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf_base64: b64, oil_type: oilType, subscription_id: subId })
        })
        const data = await resp.json()
        if (!data.success) throw new Error(data.error)
        setItems(prev => prev.map(it => it.name === item.name ? {...it, status: 'ok', msg: data.data?.numero_laudo || 'Salvo'} : it))
        setDone(d => d + 1)
      } catch (e: any) {
        setItems(prev => prev.map(it => it.name === item.name ? {...it, status: 'error', msg: e.message?.slice(0,80)} : it))
      }
    }
  }

  const s = { pending:'#8b949e', processing:'#9b59b6', ok:'#22c55e', error:'#e74c3c' }

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',color:'#e6edf3',fontFamily:'system-ui,sans-serif'}}>
      <nav style={{borderBottom:'1px solid #30363d',padding:'0 24px',display:'flex',alignItems:'center',gap:'10px',height:'56px'}}>
        <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'700',color:'#0d1117'}}>OS</div>
        <span style={{fontWeight:'600'}}>OilSense</span>
        <span style={{color:'#30363d'}}>/</span>
        <span style={{color:'#8b949e',fontSize:'14px'}}>Importar Laudos</span>
        <div style={{marginLeft:'auto'}}>
          <button onClick={() => router.push('/dashboard')} style={{fontSize:'12px',padding:'6px 12px',background:'transparent',border:'1px solid #30363d',borderRadius:'6px',color:'#8b949e',cursor:'pointer',fontFamily:'inherit'}}>← Dashboard</button>
        </div>
      </nav>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'32px 24px'}}>
        <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'6px'}}>Importar Laudos DGA</h1>
        <p style={{color:'#8b949e',fontSize:'14px',marginBottom:'28px'}}>PDFs extraídos pelo Claude e salvos automaticamente no OilSense v2</p>

        <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'10px',padding:'16px 20px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
          <label style={{fontSize:'14px',fontWeight:'600',whiteSpace:'nowrap'}}>Tipo de óleo:</label>
          <select value={oilType} onChange={e=>setOilType(e.target.value)}
            style={{background:'#0d1117',border:'1px solid #30363d',borderRadius:'8px',color:'#e6edf3',fontSize:'14px',padding:'8px 14px',flex:1,minWidth:'200px',fontFamily:'inherit'}}>
            <option>Mineral</option>
            <option>Vegetal (Esteres Naturais)</option>
            <option>Sintetico (Esteres Sinteticos)</option>
            <option>Siliconado</option>
            <option>Alta Temperatura</option>
          </select>
        </div>

        <label style={{display:'block',border:'2px dashed #30363d',borderRadius:'12px',padding:'48px 24px',textAlign:'center',cursor:'pointer',background:'#161b22',marginBottom:'20px'}}>
          <div style={{fontSize:'42px',marginBottom:'10px'}}>📄</div>
          <div style={{fontSize:'16px',fontWeight:'500',marginBottom:'6px'}}>Arraste ou clique para selecionar PDFs</div>
          <div style={{color:'#8b949e',fontSize:'13px'}}>Até 20 arquivos por vez</div>
          <input type="file" accept=".pdf" multiple style={{display:'none'}} onChange={e=>e.target.files&&processFiles(e.target.files)} />
        </label>

        {items.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {items.map((it,i) => (
              <div key={i} style={{background:'#161b22',border:'1px solid #30363d',borderRadius:'12px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'20px'}}>📋</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:'500',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</div>
                  <div style={{fontSize:'12px',color:'#8b949e',marginTop:'2px'}}>{it.msg || (it.status==='processing'?'Processando...':'Aguardando')}</div>
                </div>
                <span style={{fontSize:'12px',padding:'4px 12px',borderRadius:'20px',background:s[it.status as keyof typeof s]+'22',color:s[it.status as keyof typeof s],border:`1px solid ${s[it.status as keyof typeof s]}44`,whiteSpace:'nowrap'}}>
                  {it.status==='ok'?'Salvo ✓':it.status==='error'?'Erro':it.status==='processing'?'Processando...':'Aguardando'}
                </span>
              </div>
            ))}
          </div>
        )}

        {done > 0 && (
          <div style={{marginTop:'20px',background:'#0f1f0f',border:'1px solid #22c55e44',borderRadius:'12px',padding:'24px',textAlign:'center'}}>
            <div style={{fontSize:'28px',marginBottom:'8px'}}>✓</div>
            <div style={{fontSize:'18px',fontWeight:'700',color:'#22c55e',marginBottom:'6px'}}>{done} laudo{done>1?'s':''} importado{done>1?'s':''}</div>
            <div style={{fontSize:'13px',color:'#8b949e',marginBottom:'16px'}}>Análises salvas no OilSense v2</div>
            <button onClick={() => router.push('/dashboard')} style={{padding:'10px 24px',borderRadius:'8px',border:'none',background:'#22c55e',color:'#0d1117',cursor:'pointer',fontSize:'14px',fontWeight:'600',fontFamily:'inherit'}}>
              Ver no Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}