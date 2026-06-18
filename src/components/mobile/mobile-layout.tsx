'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { BottomNav } from '@/components/mobile/bottom-nav'
import { FabButton } from '@/components/mobile/fab-button'

interface MobileLayoutProps {
  children: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const isOnline = useOnlineStatus()

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-900">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Vous êtes hors-ligne — les données seront synchronisées automatiquement
        </div>
      )}

      {/* Fixed header */}
      <MobileHeader isOnline={isOnline} />

      {/* Scrollable main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>

      {/* Fixed bottom nav */}
      <BottomNav />

      {/* FAB — positioned above bottom nav */}
      <FabButton />
    </div>
  )
}
