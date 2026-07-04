import { NextRequest, NextResponse } from 'next/server'
import { DUVAL_KNOWLEDGE } from '@/lib/duvalKnowledge'

export const runtime = 'nodejs'

const SYSTEM = [
  'Você é o DUVAL — engine de diagnóstico de transformadores de potência do OilSense.',
  'Responda em português, de forma técnica, objetiva e direta, como um engenheiro de manutenção preditiva.',
  'Baseie-se nas normas ABNT NBR de cromatografia e físico-química, IEC 60599, IEEE C57.104-2019 e IEC 61198/ASTM D5837, conforme a BASE DE CONHECIMENTO abaixo. Cite a norma aplicável em cada afirmação técnica.',
  'Use o CONTEXTO do ativo fornecido para fundamentar as respostas. Se algo não estiver no contexto, diga que precisa de mais dados — não invente valores.',
  'Seja conciso: 1 a 3 parágrafos curtos, sem markdown.',
  '',
  DUVAL_KNOWLEDGE,
].join('\n')

export async function POST(req: NextRequest) {
  try {
    const { context, messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY ausente' }, { status: 500 })

    const system = SYSTEM + (context ? '\n\nCONTEXTO DO ATIVO:\n' + context : '')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system,
        messages: messages.slice(-12).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content || ''),
        })),
      }),
    })

    const data = await claudeRes.json()
    if (!claudeRes.ok) throw new Error(data.error?.message || 'Claude API error')
    const reply = data.content?.[0]?.text || 'Sem resposta.'
    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
