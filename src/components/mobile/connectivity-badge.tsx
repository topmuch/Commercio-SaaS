'use client'

import { cn } from '@/lib/utils'

interface ConnectivityBadgeProps {
  isOnline: boolean
  isSyncing?: boolean
  className?: string
}

export function ConnectivityBadge({ isOnline, isSyncing = false, className }: ConnectivityBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {isOnline && !isSyncing && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </>
        )}
        {isSyncing && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </>
        )}
        {!isOnline && (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </>
        )}
      </span>
      <span
        className={cn(
          isOnline && !isSyncing && 'text-emerald-400',
          isSyncing && 'text-yellow-400',
          !isOnline && 'text-red-400'
        )}
      >
        {isSyncing ? 'Synchronisation...' : isOnline ? 'En ligne' : 'Hors-ligne'}
      </span>
    </div>
  )
}
