'use client'
import{useState}from 'react'
import{createClient}from '@supabase/supabase-js'
import{useRouter}from 'next/navigation'
import Image from 'next/image'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function LoginPage(){
  const[email,setEmail]=useState('')
  const[password,setPassword]=useState('')
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const[mode,setMode]=useState<'login'|'forgot'>('login')
  const[resetSent,setResetSent]=useState(false)
  const router=useRouter()
  async function go(){
    setError('');setLoading(true)
    try{
      const{error:e}=await sb.auth.signInWithPassword({email,password})
      if(e)throw new Error(e.message)
      router.push('/dashboard')
    }catch(e:any){setError(e.message||'Email ou senha incorretos.')}
    finally{setLoading(false)}
  }
  async function sendReset(){
    setError('');setLoading(true)
    try{
      if(!email){setError('Informe seu email.');setLoading(false);return}
      const{error:e}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'})
      if(e)throw new Error(e.message)
      setResetSent(true)
    }catch(e:any){setError(e.message||'Erro ao enviar email de recuperacao.')}
    finally{setLoading(false)}
  }
  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:'24px'}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'40px',maxWidth:'400px',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'32px',justifyContent:'center'}}>
          <Image src="/logo.png" alt="OilSense" width={40} height={40} style={{borderRadius:'10px'}}/>
          <span style={{fontSize:'20px',fontWeight:'700',color:'var(--text)'}}>OilSense</span>
        </div>
        {mode==='login'?(<>
          <h1 style={{fontSize:'22px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Entrar</h1>
          <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>Monitoramento preditivo de transformadores</p>
          {error&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#f87171'}}>{error}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            <div><label style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com.br"/></div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <label style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)'}}>Senha</label>
                <button onClick={()=>{setMode('forgot');setError('');setResetSent(false)}} style={{background:'none',border:'none',color:'var(--green)',cursor:'pointer',fontSize:'12px',fontWeight:'600',padding:0}}>Esqueceu a senha?</button>
              </div>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha" onKeyDown={e=>e.key==='Enter'&&go()}/>
            </div>
            <button className="btn btn-primary" onClick={go} disabled={loading} style={{width:'100%',marginTop:'4px',padding:'11px'}}>{loading?'Entrando...':'Entrar'}</button>
          </div>
          <p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',marginTop:'20px'}}>Nao tem conta?{' '}<button onClick={()=>router.push('/signup')} style={{background:'none',border:'none',color:'var(--green)',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>Criar conta gratis</button></p>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'16px',fontSize:'11px'}}>
            <a href="/termos" target="_blank" rel="noopener" style={{color:'var(--text-dim)',textDecoration:'none'}}>Termos</a>
            <span style={{color:'var(--text-dim)'}}>·</span>
            <a href="/privacidade" target="_blank" rel="noopener" style={{color:'var(--text-dim)',textDecoration:'none'}}>Privacidade</a>
          </div>
        </>):(<>
          <h1 style={{fontSize:'22px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Recuperar senha</h1>
          <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>Enviamos um link para redefinir sua senha</p>
          {error&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#f87171'}}>{error}</div>}
          {resetSent?(
            <div style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.2)',borderRadius:'8px',padding:'14px',fontSize:'13px',color:'#22c55e',lineHeight:1.5}}>
              Se existir uma conta com o email <strong>{email}</strong>, enviamos um link de recuperacao. Verifique tambem a caixa de spam.
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div><label style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com.br" onKeyDown={e=>e.key==='Enter'&&sendReset()}/></div>
              <button className="btn btn-primary" onClick={sendReset} disabled={loading} style={{width:'100%',marginTop:'4px',padding:'11px'}}>{loading?'Enviando...':'Enviar link de recuperacao'}</button>
            </div>
          )}
          <p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',marginTop:'20px'}}><button onClick={()=>{setMode('login');setError('');setResetSent(false)}} style={{background:'none',border:'none',color:'var(--green)',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>Voltar para o login</button></p>
        </>)}
      </div>
    </div>
  )
}