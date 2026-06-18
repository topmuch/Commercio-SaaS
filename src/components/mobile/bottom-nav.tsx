'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Map, ClipboardList, User, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Accueil', icon: Home, href: '/mobile/dashboard' },
  { label: 'Carte', icon: Map, href: '/mobile/map' },
  { label: 'Ventes', icon: Receipt, href: '/mobile/orders' },
  { label: 'Profil', icon: User, href: '/mobile/profile' },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    if (href === '/mobile/dashboard') {
      return pathname === '/mobile/dashboard' || pathname === '/mobile'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex h-16 shrink-0 items-center justify-around border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const active = isActive(tab.href)
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={cn(
              'flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors',
              active
                ? 'text-emerald-500'
                : 'text-slate-500 hover:text-slate-300 active:text-slate-400'
            )}
          >
            <tab.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
            <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
              {tab.label}
            </span>
            {active && (
              <span className="absolute bottom-3 h-0.5 w-6 rounded-full bg-emerald-500" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
