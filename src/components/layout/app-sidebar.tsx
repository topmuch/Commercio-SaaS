"use client"

import React, { useMemo } from 'react'
import { useAppStore, type PageId } from '@/lib/store'
import { hasAccess, getRoleLabel } from '@/lib/permissions'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Warehouse,
  FileText,
  Receipt,
  MessageSquare,
  MapPin,
  Map,
  Store,
  BarChart3,
  Bot,
  Settings,
  Target,
  Smartphone,
  UserCog,
  CreditCard,
  Headphones,
  Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavGroup {
  label: string
  items: {
    id: PageId
    label: string
    icon: React.ElementType
    badge?: string
    external?: boolean
  }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { id: 'clients', label: 'CRM Clients', icon: Users },
      { id: 'commercials', label: 'Commerciaux', icon: Target },
      { id: 'products', label: 'Produits', icon: Package },
    ],
  },
  {
    label: 'Ventes',
    items: [
      { id: 'orders', label: 'Commandes', icon: ShoppingCart },
      { id: 'quotes', label: 'Devis', icon: FileText },
      { id: 'invoices', label: 'Facturation', icon: Receipt },
      { id: 'stock', label: 'Stock', icon: Warehouse },
    ],
  },
  {
    label: 'Communication',
    items: [
      { id: 'discussions', label: "Fil d'actualité", icon: MessageSquare },
    ],
  },
  {
    label: 'Cartographie',
    items: [
      { id: 'map-stores', label: 'Carte Commerces', icon: MapPin },
      { id: 'map-sales', label: 'Carte des Ventes', icon: Map },
    ],
  },
  {
    label: 'E-Commerce',
    items: [
      { id: 'boutique', label: 'Boutique Publique', icon: Store },
      { id: 'boutique-settings', label: 'Paramètres Boutique', icon: Settings },
    ],
  },
  {
    label: 'Analyse & IA',
    items: [
      { id: 'reports', label: 'Rapports', icon: BarChart3 },
      { id: 'ai-assistant', label: 'Assistant IA', icon: Bot },
    ],
  },
  {
    label: 'Support & API',
    items: [
      { id: 'support-tickets', label: 'Support', icon: Headphones },
      { id: 'api-keys', label: 'Clés API', icon: Key },
    ],
  },
  {
    label: 'Système',
    items: [
      { id: 'users', label: 'Utilisateurs', icon: UserCog },
      { id: 'settings', label: 'Paramètres', icon: Settings },
    ],
  },
  {
    label: 'Mobile',
    items: [
      { id: 'install-app', label: 'Installer l\'App', icon: Smartphone, badge: 'PWA', external: true },
    ],
  },
]

export function AppSidebar() {
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const user = useAppStore((s) => s.user)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const userRole = user?.role

  // Filter navigation groups by role permissions
  const filteredNavGroups = useMemo(() => {
    if (!userRole) return navGroups // No role = demo mode, show all
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasAccess(userRole, item.id)),
      }))
      .filter((group) => group.items.length > 0)
  }, [userRole])

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-orange-500 bg-orange-600 transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-orange-500/40 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 font-bold text-sm shadow-lg shadow-black/20">
          T
        </div>
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white tracking-tight">
              Teranga Biz
            </span>
            <span className="text-[10px] text-white/70 uppercase tracking-widest">
              DistribuERP
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/40">
        <nav className="space-y-5 px-3">
          {filteredNavGroups.map((group) => (
            <div key={group.label}>
              {sidebarOpen && (
                <h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id

                  if (sidebarOpen) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.external) {
                            window.location.href = '/install-app'
                          } else {
                            setCurrentPage(item.id)
                          }
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-white/20 text-white shadow-sm'
                            : 'text-white hover:bg-white/10'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 bg-orange-500 text-white text-[10px] px-1.5 border-0"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    )
                  }

                  return (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (item.external) {
                              window.location.href = '/install-app'
                            } else {
                              setCurrentPage(item.id)
                            }
                          }}
                          className={cn(
                            'flex w-full items-center justify-center rounded-lg p-2.5 transition-all duration-150 relative',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'text-white hover:bg-white/10'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.badge && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium bg-slate-800 border-slate-700">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User */}
      <div className="border-t border-orange-500/40 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2',
            sidebarOpen ? '' : 'justify-center'
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 border-2 border-white/30">
            <AvatarFallback className="bg-white text-orange-600 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white truncate">
                {user?.name}
              </span>
              <span className="text-[11px] text-white/70 truncate">
                {getRoleLabel(user?.role || 'admin')}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
