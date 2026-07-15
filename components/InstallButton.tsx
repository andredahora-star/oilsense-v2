'use client'
import { useEffect, useState } from 'react'

export default function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !deferred) return null

  async function install() {
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <button
      onClick={install}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        width: '100%', padding: '9px', marginTop: '10px', borderRadius: '8px',
        background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer',
        fontSize: '12.5px', fontWeight: 700,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      Instalar App
    </button>
  )
}
