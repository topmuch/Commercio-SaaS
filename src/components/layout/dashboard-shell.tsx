'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore, type PageId } from '@/lib/store'
import { cn } from '@/lib/utils'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { RoleGuard } from '@/components/shared/role-guard'
import { Toaster } from 'sonner'

// Dynamic imports for all ERP pages
const DashboardPage = dynamic(() => import('@/components/dashboard/dashboard-page').then(m => m.default))
const ClientsPage = dynamic(() => import('@/components/clients/clients-page').then(m => m.default))
const CommercialsPage = dynamic(() => import('@/components/commercials/commercials-page').then(m => m.default))
const ProductsPage = dynamic(() => import('@/components/products/products-page').then(m => m.default))
const StockPage = dynamic(() => import('@/components/stock/stock-page').then(m => m.default))
const OrdersPage = dynamic(() => import('@/components/orders/orders-page').then(m => m.default))
const QuotesPage = dynamic(() => import('@/components/quotes/quotes-page').then(m => m.default))
const InvoicesPage = dynamic(() => import('@/components/invoices/invoices-page').then(m => m.default))
const DiscussionsPage = dynamic(() => import('@/components/discussions/discussions-page').then(m => m.default))
const MapStoresPage = dynamic(() => import('@/components/map/map-stores-page').then(m => m.default))
const MapSalesPage = dynamic(() => import('@/components/map/map-sales-page').then(m => m.default))
const BoutiquePage = dynamic(() => import('@/components/boutique/boutique-page').then(m => m.default))
const BoutiqueSettingsPage = dynamic(() => import('@/components/boutique/boutique-settings').then(m => m.default))
const ReportsPage = dynamic(() => import('@/components/reports/reports-page').then(m => m.default))
const AiAssistantPage = dynamic(() => import('@/components/ai/ai-assistant-page').then(m => m.default))
const SupportTicketsPage = dynamic(() => import('@/components/support/support-tickets-page').then(m => m.default))
const ApiKeysPage = dynamic(() => import('@/components/api/api-keys-page').then(m => m.default))
const SettingsPage = dynamic(() => import('@/components/settings/settings-page').then(m => m.default))
const UsersPage = dynamic(() => import('@/components/settings/users-management').then(m => m.UsersManagementPage))
const SuperAdminCompaniesPage = dynamic(() => import('@/components/super-admin/super-admin-companies-page').then(m => m.default))
const SuperAdminSettingsPage = dynamic(() => import('@/components/super-admin/super-admin-settings-page').then(m => m.default))

// Page mapping
const pageComponents: Partial<Record<PageId, React.ComponentType>> = {
  dashboard: DashboardPage,
  clients: ClientsPage,
  'client-detail': ClientsPage,
  commercials: CommercialsPage,
  products: ProductsPage,
  stock: StockPage,
  orders: OrdersPage,
  quotes: QuotesPage,
  invoices: InvoicesPage,
  discussions: DiscussionsPage,
  'map-stores': MapStoresPage,
  'map-sales': MapSalesPage,
  boutique: BoutiquePage,
  'boutique-settings': BoutiqueSettingsPage,
  reports: ReportsPage,
  'ai-assistant': AiAssistantPage,
  'support-tickets': SupportTicketsPage,
  'api-keys': ApiKeysPage,
  settings: SettingsPage,
  users: UsersPage,
  'super-admin-companies': SuperAdminCompaniesPage,
  'super-admin-settings': SuperAdminSettingsPage,
}

function PageRenderer() {
  const currentPage = useAppStore((s) => s.currentPage)
  const PageComponent = pageComponents[currentPage]

  if (!PageComponent) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Page non trouvée</p>
      </div>
    )
  }

  return (
    <RoleGuard pageId={currentPage}>
      <PageComponent />
    </RoleGuard>
  )
}

export function DashboardShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main content area */}
        <div
          className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}
        >
          <AppHeader />
          <main className="p-4 lg:p-6">
            <PageRenderer />
          </main>
        </div>

        <Toaster position="top-right" richColors closeButton theme={useAppStore.getState().theme} />
      </div>
    </QueryClientProvider>
  )
}
