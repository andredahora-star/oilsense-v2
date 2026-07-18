'use client'
import{useState}from 'react'
import{createClient}from '@supabase/supabase-js'
import{useRouter}from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function SignupPage(){
  const[form,setForm]=useState({name:'',company:'',email:'',password:'',confirm:''})
  const[agreed,setAgreed]=useState(false)
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const[ok,setOk]=useState(false)
  const router=useRouter()
  async function go(){
    setError('')
    if(!form.name||!form.company||!form.email||!form.password){setError('Preencha todos os campos.');return}
    if(form.password!==form.confirm){setError('As senhas nao conferem.');return}
    if(form.password.length<8){setError('Senha deve ter ao menos 8 caracteres.');return}
    if(!agreed){setError('Voce precisa aceitar os Termos de Uso e a Politica de Privacidade para continuar.');return}
    setLoading(true)
    try{
      const{data:signUpData,error:e}=await sb.auth.signUp({email:form.email,password:form.password,options:{data:{name:form.name,company:form.company},emailRedirectTo:window.location.origin+'/dashboard'}})
      if(e)throw new Error(e.message)
      if(signUpData?.user?.id){
        const subRes=await fetch('/api/signup/init-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:signUpData.user.id,company_name:form.company})})
        if(!subRes.ok){
          const subErr=await subRes.json().catch(()=>({}))
          throw new Error(subErr.error||'Conta criada, mas houve falha ao configurar sua empresa. Contate o suporte.')
        }
      }
      await fetch('/api/email/welcome',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,company:form.company,email:form.email})})
      setOk(true)
    }catch(e:any){setError(e.message||'Erro ao criar conta.')}
    finally{setLoading(false)}
  }
  if(ok)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'40px',maxWidth:'420px',width:'100%',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>&#10003;</div>
        <h2 style={{fontSize:'20px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}}>Conta criada!</h2>
        <p style={{fontSize:'14px',color:'var(--text-muted)',marginBottom:'24px'}}>Enviamos confirmacao para <strong>{form.email}</strong></p>
        <button className="btn btn-primary" onClick={()=>router.push('/login')} style={{width:'100%'}}>Ir para o login</button>
      </div>
    </div>
  )
  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:'24px'}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'40px',maxWidth:'420px',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'32px',justifyContent:'center'}}>
          <Image src="/logo.png" alt="OilSense" width={40} height={40} style={{borderRadius:'10px'}}/>
          <span style={{fontSize:'20px',fontWeight:'700',color:'var(--text)'}}>OilSense</span>
        </div>
        <h1 style={{fontSize:'22px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Criar conta</h1>
        <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>Monitoramento preditivo de transformadores e redutores</p>
        {error&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#f87171'}}>{error}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          {[{l:'Nome completo *',k:'name',t:'text',p:'Andre da Hora'},{l:'Empresa *',k:'company',t:'text',p:'IBITU Energia'},{l:'Email *',k:'email',t:'email',p:'voce@empresa.com.br'},{l:'Senha *',k:'password',t:'password',p:'Minimo 8 caracteres'},{l:'Confirmar senha *',k:'confirm',t:'password',p:'Repita a senha'}].map(f=>(
            <div key={f.k}>
              <label style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>{f.l}</label>
              <input className="input" type={f.t} value={(form as any)[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})} placeholder={f.p} onKeyDown={e=>e.key==='Enter'&&go()}/>
            </div>
          ))}
          <label style={{display:'flex',alignItems:'flex-start',gap:'8px',cursor:'pointer'}}>
            <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:'3px',width:'15px',height:'15px',flexShrink:0,accentColor:'var(--green)'}}/>
            <span style={{fontSize:'12.5px',color:'var(--text-muted)',lineHeight:1.5}}>
              Li e concordo com os <Link href="/termos" target="_blank" style={{color:'var(--green)',fontWeight:600}}>Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" style={{color:'var(--green)',fontWeight:600}}>Politica de Privacidade</Link> da OilSense.
            </span>
          </label>
          <button className="btn btn-primary" onClick={go} disabled={loading} style={{width:'100%',marginTop:'4px',padding:'11px'}}>{loading?'Criando...':'Criar conta'}</button>
        </div>
        <p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',marginTop:'20px'}}>Ja tem conta?{' '}<button onClick={()=>router.push('/login')} style={{background:'none',border:'none',color:'var(--green)',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>Fazer login</button></p>
      </div>
    </div>
  )
}