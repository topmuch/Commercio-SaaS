'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { ConnectivityBadge } from '@/components/mobile/connectivity-badge'

interface MobileHeaderProps {
  isOnline: boolean
}

export function MobileHeader({ isOnline }: MobileHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900 px-4 pb-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <span className="text-base font-bold text-emerald-500">T</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100">Teranga</h1>
          <p className="text-[10px] text-slate-500">Terrain</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ConnectivityBadge isOnline={isOnline} />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
    </header>
  )
}
