"use client"

import React from 'react'
import { useAppStore } from '@/lib/store'
import { signOut } from 'next-auth/react'
import {
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  LogOut,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
} from 'lucide-react'

const pageLabels: Record<string, string> = {
  dashboard: 'Tableau de bord',
  clients: 'CRM Clients',
  'client-detail': 'Fiche Client',
  commercials: 'Commerciaux',
  products: 'Produits',
  stock: 'Stock',
  quotes: 'Devis',
  invoices: 'Facturation',
  orders: 'Commandes',
  discussions: 'Fil d\'actualité',
  'map-stores': 'Carte Commerces',
  'map-sales': 'Carte des Ventes',
  boutique: 'Boutique Publique',
  reports: 'Rapports',
  'ai-assistant': 'Assistant IA',
  settings: 'Paramètres',
  users: 'Utilisateurs',
}

const commandPages = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'clients', label: 'CRM Clients', icon: Users },
  { id: 'commercials', label: 'Commerciaux', icon: Users },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'orders', label: 'Commandes', icon: ShoppingCart },
  { id: 'quotes', label: 'Devis', icon: FileText },
  { id: 'invoices', label: 'Facturation', icon: Receipt },
  { id: 'stock', label: 'Stock', icon: Warehouse },
  { id: 'discussions', label: 'Fil d\'actualité', icon: MessageSquare },
  { id: 'map-stores', label: 'Carte Commerces', icon: MapPin },
  { id: 'map-sales', label: 'Carte des Ventes', icon: Map },
  { id: 'boutique', label: 'Boutique Publique', icon: Store },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
  { id: 'ai-assistant', label: 'Assistant IA', icon: Bot },
]

export function AppHeader() {
  const currentPage = useAppStore((s) => s.currentPage)
  const user = useAppStore((s) => s.user)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [boutiqueSlug, setBoutiqueSlug] = React.useState<string | null>(null)

  // Fetch boutique slug for header link
  React.useEffect(() => {
    fetch('/api/store-settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.publicSlug) {
          setBoutiqueSlug(json.data.publicSlug)
        }
      })
      .catch(() => {})
  }, [])

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  // Sync theme class on <html>
  React.useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  // Init theme from localStorage or system preference
  React.useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) {
      setTheme(stored)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [setTheme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex shrink-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">
            {pageLabels[currentPage] || 'Tableau de bord'}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden sm:flex items-center gap-2 h-9 w-64 justify-start text-muted-foreground"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Rechercher...</span>
            <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium bg-muted text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Lien Boutique Publique */}
          <Button
            variant="outline"
            size="icon"
            className={boutiqueSlug ? '' : 'opacity-40 pointer-events-none'}
            onClick={() => boutiqueSlug && window.open(`/boutique/${boutiqueSlug}`, '_blank')}
            title={boutiqueSlug ? 'Voir la boutique publique' : 'Boutique non configurée'}
            aria-label="Voir la boutique publique"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          {/* Theme Toggle - Blue/Violet */}
          <Button
            variant="outline"
            size="icon"
            className="bg-gradient-to-br from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 border-0 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucune nouvelle notification</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2" aria-label="Menu utilisateur">
                <Avatar className="h-8 w-8 border-2 border-violet-400/30">
                  <AvatarFallback className="bg-violet-500 text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentPage('settings')}>Paramètres</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentPage('settings')}>Profil</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut({ callbackUrl: '/login' })
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Rechercher une page, un client..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commandPages.map((page) => {
              const Icon = page.icon
              return (
                <CommandItem
                  key={page.id}
                  onSelect={() => {
                    setCurrentPage(page.id as any)
                    setCommandOpen(false)
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{page.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
