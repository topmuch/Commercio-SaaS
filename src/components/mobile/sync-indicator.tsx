'use client'

import { RefreshCw, CloudOff, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  pendingCount: number
  isSyncing: boolean
  lastSyncTime: Date | null
  onSyncNow: () => void
  className?: string
}

function formatLastSync(date: Date | null): string {
  if (!date) return 'Jamais synchronisé'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'Synchronisé à l\'instant'
  if (diffMin < 60) return `Synchronisé il y a ${diffMin}min`
  if (diffH < 24) return `Dernière sync: ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  return `Synchronisé le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

export function SyncIndicator({
  pendingCount,
  isSyncing,
  lastSyncTime,
  onSyncNow,
  className,
}: SyncIndicatorProps) {
  const hasPending = pendingCount > 0

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Sync status badge */}
      <button
        onClick={onSyncNow}
        disabled={isSyncing || !hasPending}
        className={cn(
          'flex w-full min-h-[44px] items-center justify-between rounded-xl border p-3 transition-colors',
          hasPending
            ? 'bg-amber-500/5 border-amber-500/20 active:bg-amber-500/10'
            : 'bg-slate-800/40 border-slate-700/30'
        )}
      >
        <div className="flex items-center gap-2.5">
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 text-amber-400 animate-spin" />
          ) : hasPending ? (
            <CloudOff className="h-4 w-4 text-amber-400" />
          ) : (
            <RefreshCw className="h-4 w-4 text-emerald-500" />
          )}
          <span className={cn(
            'text-sm font-medium',
            hasPending ? 'text-amber-400' : 'text-emerald-400'
          )}>
            {isSyncing
              ? 'Synchronisation en cours...'
              : hasPending
                ? `${pendingCount} en attente`
                : 'Tout est synchronisé'
            }
          </span>
        </div>
        {hasPending && !isSyncing && (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* Last sync time */}
      <div className="flex items-center gap-1.5 px-1">
        <Clock className="h-3 w-3 text-slate-600" />
        <span className="text-[11px] text-slate-500">
          {formatLastSync(lastSyncTime)}
        </span>
      </div>
    </div>
  )
}
