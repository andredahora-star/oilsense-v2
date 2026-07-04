import{NextResponse}from 'next/server'
export async function POST(req:Request){
  try{
    const{name,company,email}=await req.json()
    const apiKey=process.env.RESEND_API_KEY
    const from=process.env.RESEND_FROM||'OilSense <onboarding@oilssense.com>'
    if(!apiKey)return NextResponse.json({error:'Email service not configured'},{status:500})
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#0c0f12;color:#f0f4f2;margin:0;padding:0;"><div style="max-width:560px;margin:40px auto;background:#12171c;border:1px solid #1c2530;border-radius:12px;overflow:hidden;"><div style="background:#1a4d35;padding:32px;text-align:center;"><h1 style="color:#10b981;font-size:24px;margin:0;">OilSense</h1><p style="color:#768593;margin:8px 0 0;font-size:14px;">Monitoramento preditivo de transformadores</p></div><div style="padding:32px;"><h2 style="color:#f0f4f2;font-size:18px;margin:0 0 16px;">Bem-vindo, ${name}!</h2><p style="color:#768593;font-size:14px;line-height:1.7;margin:0 0 16px;">Sua conta OilSense para <strong style="color:#f0f4f2;">${company}</strong> foi criada com sucesso.</p><p style="color:#768593;font-size:14px;line-height:1.7;margin:0 0 24px;">Confirme seu email para ativar o acesso completo.</p><div style="text-align:center;margin:32px 0 0;"><a href="https://v2.oilssense.com" style="background:#1ea465;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">Acessar OilSense</a></div></div><div style="padding:20px 32px;border-top:1px solid #1c2530;text-align:center;"><p style="color:#3a4a55;font-size:12px;margin:0;">OilSense — Manutencao preditiva inteligente</p></div></div></body></html>`
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:`Bem-vindo ao OilSense, ${name}!`,html})})
    const d=await r.json()
    if(!r.ok)throw new Error(d.message||'Erro ao enviar email')
    return NextResponse.json({success:true,id:d.id})
  }catch(e:any){
    console.error('Email error:',e)
    return NextResponse.json({error:e.message},{status:500})
  }
}