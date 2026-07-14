'use client'
import{useState,useEffect}from 'react'
import{createClient}from '@supabase/supabase-js'
import{useRouter}from 'next/navigation'
import Image from 'next/image'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
export default function ResetPasswordPage(){
  const[password,setPassword]=useState('')
  const[confirm,setConfirm]=useState('')
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const[ok,setOk]=useState(false)
  const[ready,setReady]=useState(false)
  const router=useRouter()
  useEffect(()=>{
    // O link do email de recuperacao autentica o usuario numa sessao temporaria
    // de recovery. Confirmamos que existe sessao antes de liberar o formulario;
    // sem isso, updateUser() falharia com 'not authenticated'.
    sb.auth.getSession().then(({data:{session}})=>{
      if(!session){setError('Link invalido ou expirado. Solicite um novo link de recuperacao.')}
      setReady(true)
    })
  },[])
  async function go(){
    setError('')
    if(password.length<8){setError('Senha deve ter ao menos 8 caracteres.');return}
    if(password!==confirm){setError('As senhas nao conferem.');return}
    setLoading(true)
    try{
      const{error:e}=await sb.auth.updateUser({password})
      if(e)throw new Error(e.message)
      setOk(true)
      setTimeout(()=>router.push('/login'),2500)
    }catch(e:any){setError(e.message||'Erro ao redefinir senha.')}
    finally{setLoading(false)}
  }
  return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:'24px'}}>
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'12px',padding:'40px',maxWidth:'400px',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'32px',justifyContent:'center'}}>
          <Image src="/logo.png" alt="OilSense" width={40} height={40} style={{borderRadius:'10px'}}/>
          <span style={{fontSize:'20px',fontWeight:'700',color:'var(--text)'}}>OilSense</span>
        </div>
        {ok?(
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>&#10003;</div>
            <h2 style={{fontSize:'20px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}}>Senha redefinida!</h2>
            <p style={{fontSize:'14px',color:'var(--text-muted)'}}>Redirecionando para o login...</p>
          </div>
        ):(<>
          <h1 style={{fontSize:'22px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Nova senha</h1>
          <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px'}}>Escolha uma nova senha para sua conta</p>
          {error&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#f87171'}}>{error}</div>}
          {ready&&(
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div><label style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Nova senha</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimo 8 caracteres"/></div>
              <div><label style={{fontSize:'12px',fontWeight:'600',color:'var(--text-muted)',display:'block',marginBottom:'6px'}}>Confirmar nova senha</label><input className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repita a senha" onKeyDown={e=>e.key==='Enter'&&go()}/></div>
              <button className="btn btn-primary" onClick={go} disabled={loading} style={{width:'100%',marginTop:'4px',padding:'11px'}}>{loading?'Salvando...':'Redefinir senha'}</button>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
