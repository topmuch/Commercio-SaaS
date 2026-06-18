'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Settings, Info, LogOut, MessageCircle, RefreshCw, Wifi, WifiOff,
  MapPin, Package, TrendingUp, ClipboardList, ChevronRight, Loader2,
  Shield, Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { SyncIndicator } from '@/components/mobile/sync-indicator'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ───
interface DashboardStats {
  monthlyStats: {
    revenue: number
    orderCount: number
    totalVisits: number
    activeClients: number
    visitRate: number
  }
}

// ─── Helpers ───
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    director: 'Directeur',
    commercial: 'Commercial',
    accountant: 'Comptable',
  }
  return map[role] || role
}

// ─── Main Component ───
export default function MobileProfilePage() {
  const router = useRouter()
  const { user } = useAppStore()
  const isOnline = useOnlineStatus()
  const { pendingCount, isSyncing, lastSyncTime, syncNow } = useOfflineSync()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncProgress, setSyncProgress] = useState(0)
  const [showSyncProgress, setShowSyncProgress] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile/dashboard')
      if (res.ok) {
        const json = await res.json()
        setStats(json)
      }
    } catch {
      // Offline
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchStats()
      setLoading(false)
    }
    load()
  }, [fetchStats])

  // Sync progress simulation
  const handleSyncNow = useCallback(async () => {
    setShowSyncProgress(true)
    setSyncProgress(0)
    // Simulate progress steps
    const steps = [20, 40, 60, 80, 100]
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 400))
      setSyncProgress(step)
    }
    await syncNow()
    setShowSyncProgress(false)
  }, [syncNow])

  const userName = user?.name || 'Agent Terrain'
  const userEmail = user?.email || ''
  const userRole = user?.role || 'commercial'
  const initials = getUserInitials(userName)

  return (
    <div className="pb-4 space-y-4">
      {/* ═══ A. User Card ═══ */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/30">
              <span className="text-xl font-bold text-emerald-400">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-100 truncate">{userName}</h2>
              <p className="text-xs text-emerald-400 font-medium">{getRoleLabel(userRole)}</p>
              {userEmail && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-emerald-500/50" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ B. Sync Status Section ═══ */}
      <div className="px-4">
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-200">Synchronisation</h3>
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-700/30 p-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              isOnline ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isOnline ? (
                <Wifi className="h-5 w-5 text-emerald-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                'text-sm font-semibold',
                isOnline ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isOnline ? 'En ligne' : 'Hors-ligne'}
              </p>
              <p className="text-xs text-slate-500">
                {isOnline
                  ? 'Connecté — synchronisation automatique'
                  : 'Les données seront synchronisées au retour en ligne'
                }
              </p>
            </div>
          </div>

          {/* Sync indicator */}
          <SyncIndicator
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            onSyncNow={handleSyncNow}
          />

          {/* Sync progress bar */}
          {showSyncProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Progression</span>
                <span className="text-xs font-medium text-emerald-400">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* ═══ C. Quick Stats ═══ */}
      <div className="px-4">
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Ce mois</h3>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl bg-slate-700/30 p-3">
                  <Skeleton className="h-6 w-6 rounded-lg mb-2" />
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-700/30 p-3 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 mx-auto mb-2">
                  <ClipboardList className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-base font-bold text-slate-100">{stats.monthlyStats.totalVisits}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Visites</p>
              </div>
              <div className="rounded-xl bg-slate-700/30 p-3 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 mx-auto mb-2">
                  <Package className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-base font-bold text-slate-100">{stats.monthlyStats.orderCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Commandes</p>
              </div>
              <div className="rounded-xl bg-slate-700/30 p-3 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 mx-auto mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-sm font-bold text-slate-100 leading-tight">{formatCurrency(stats.monthlyStats.revenue).replace(' FCFA', '')}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">CA (FCFA)</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">Données indisponibles</p>
          )}
        </div>
      </div>

      {/* ═══ D. Menu Items ═══ */}
      <div className="px-4">
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
          <MenuItem
            icon={<Settings className="h-4 w-4" />}
            label="Paramètres"
            description="Configurer l'application"
            onClick={() => router.push('/mobile')}
            showChevron
          />
          <div className="border-t border-slate-700/30" />
          <MenuItem
            icon={<MessageCircle className="h-4 w-4" />}
            label="Support WhatsApp"
            description="Obtenir de l'aide"
            onClick={() => window.open('https://wa.me/221781234567', '_blank')}
            showChevron
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
          />
          <div className="border-t border-slate-700/30" />
          <MenuItem
            icon={<Info className="h-4 w-4" />}
            label="À propos de Teranga Biz"
            description="Version et informations"
            onClick={() => window.alert('Teranga Biz v1.0.0 — Fait à Dakar 🇸🇳')}
            showChevron={false}
          />
          <div className="border-t border-slate-700/30" />
          <MenuItem
            icon={<LogOut className="h-4 w-4" />}
            label="Déconnexion"
            description=""
            onClick={async () => {
              await signOut({ callbackUrl: '/login' })
            }}
            showChevron={false}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
          />
        </div>
      </div>

      {/* ═══ E. App Version ═══ */}
      <div className="px-4 pt-2">
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
              <span className="text-[10px] font-bold text-emerald-500">T</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">Teranga Biz Terrain</span>
          </div>
          <p className="text-[10px] text-slate-600">Version 1.0.0</p>
          <p className="text-[10px] text-slate-700 mt-0.5">© 2024 Teranga Biz</p>
        </div>
      </div>
    </div>
  )
}

// ─── Menu Item Component ───
function MenuItem({
  icon,
  label,
  description,
  onClick,
  showChevron = true,
  iconColor = 'text-slate-400',
  iconBg = 'bg-slate-700/50',
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  showChevron?: boolean
  iconColor?: string
  iconBg?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-700/40 transition-colors"
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {showChevron && (
        <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
      )}
    </button>
  )
}
