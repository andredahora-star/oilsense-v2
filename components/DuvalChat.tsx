'use client'
import { useState, useRef, useEffect } from 'react'

const sendIco = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M2 8l12-5-5 12-2.5-4.5L2 8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>'

type Msg = { role: 'user' | 'assistant'; content: string }

// Chat contextual com o Agente Duval.
export default function DuvalChat({ context, suggestions }: { context: string; suggestions?: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Olá! Sou o Duval. Posso explicar o diagnóstico deste ativo, a evolução dos gases e as normas aplicáveis. O que você quer saber?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, loading])

  async function send(text: string) {
    const q = text.trim()
    if (!q || loading) return
    const next = [...messages, { role: 'user' as const, content: q }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/duval-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, messages: next }),
      })
      const d = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: d.reply || ('Erro: ' + (d.error || 'sem resposta')) }])
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro de conexão: ' + (e?.message || '') }])
    } finally { setLoading(false) }
  }

  return (
    <div className="card">
      <div className="agent-head">
        <span className="agent-title">Chat com o Duval</span>
      </div>
      <div className="chat">
        <div className="chat-body" ref={bodyRef}>
          {messages.map((m, i) => <div key={i} className={'msg ' + (m.role === 'user' ? 'user' : 'bot')}>{m.content}</div>)}
          {loading && <div className="msg bot"><span className="typing"><span></span><span></span><span></span></span></div>}
        </div>
        {suggestions && messages.length <= 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {suggestions.map(s => (
              <button key={s} className="gas-pill" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={e => { e.preventDefault(); send(input) }}>
          <input className="input" placeholder="Pergunte ao Duval sobre este ativo…" value={input} onChange={e => setInput(e.target.value)} disabled={loading} />
          <button type="submit" className="chat-send" disabled={loading || !input.trim()} dangerouslySetInnerHTML={{ __html: sendIco }} />
        </form>
      </div>
    </div>
  )
}
