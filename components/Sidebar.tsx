'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const icoDash   = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/></svg>'
const icoAssets = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" fill="currentColor" opacity=".6"/></svg>'
const icoAnal   = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L5 8L8 10L11 5L14 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const icoAlert  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
const icoOS     = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
const icoImport = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
const icoAdmin  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
const icoLogout = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5M9 10l3-3-3-3M12 7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const NAV = [
  { href:'/dashboard', label:'Dashboard',         ico:icoDash },
  { href:'/assets',    label:'Ativos',            ico:icoAssets },
  { href:'/analyses',  label:'Analises',          ico:icoAnal },
  { href:'/alerts',    label:'Alertas',           ico:icoAlert },
  { href:'/orders',    label:'Ordens de Servico', ico:icoOS },
]

const NAV2 = [
  { href:'/import', label:'Importar Laudos', ico:icoImport },
]

export default function Sidebar({
  email, company, isAdmin, alertCount
}: {
  email?: string; company?: string; isAdmin?: boolean; alertCount?: number
}) {
  const router = useRouter()
  const path   = usePathname()
  const initials = email ? email.slice(0,2).toUpperCase() : 'OS'

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className='sidebar'>
      {/* Logo — identica ao V1 */}
      <div className='sidebar-logo'>
        <div className='logo-img'>
          <Image src='/logo.webp' alt='OilSense' width={38} height={38} style={{objectFit:'cover'}} />
        </div>
        <div className='logo-text-wrap'>
          <span className='logo-text'>OilSense</span>
          {company && <span className='logo-sub'>{company}</span>}
        </div>
      </div>

      {/* Nav */}
      <nav className='sidebar-nav'>
        {NAV.map(item => {
          const active = path === item.href || path.startsWith(item.href + '/')
          return (
            <button key={item.href} className={'nav-item' + (active ? ' active' : '')} onClick={()=>router.push(item.href)}>
              <span className='nav-icon' dangerouslySetInnerHTML={{__html: item.ico}} />
              {item.label}
              {item.href === '/alerts' && (alertCount||0) > 0 && (
                <span className='nav-badge'>{alertCount}</span>
              )}
            </button>
          )
        })}

        <div className='nav-section-label'>Ferramentas</div>
        {NAV2.map(item => {
          const active = path === item.href
          return (
            <button key={item.href} className={'nav-item' + (active ? ' active' : '')} onClick={()=>router.push(item.href)}>
              <span className='nav-icon' dangerouslySetInnerHTML={{__html: item.ico}} />
              {item.label}
            </button>
          )
        })}

        {isAdmin && (
          <>
            <div className='nav-section-label'>Admin</div>
            <button
              className={'nav-item' + (path === '/admin' ? ' active' : '')}
              onClick={()=>router.push('/admin')}
              style={{color: path === '/admin' ? '#f87171' : 'rgba(248,113,113,.4)'}}
            >
              <span className='nav-icon' dangerouslySetInnerHTML={{__html: icoAdmin}} />
              Master Admin
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className='sidebar-footer'>
        <div className='user-block' onClick={logout} title='Sair'>
          <div className='user-avatar'>{initials}</div>
          <div className='user-info'>
            <div className='user-name'>{email?.split('@')[0] || 'Usuario'}</div>
            <div className='user-email'>{email}</div>
          </div>
          <span dangerouslySetInnerHTML={{__html: icoLogout}} style={{flexShrink:0, opacity:.35}} />
        </div>
      </div>
    </aside>
  )
}