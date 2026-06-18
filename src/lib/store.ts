import { create } from 'zustand'

export type PageId =
  | 'dashboard'
  | 'clients'
  | 'client-detail'
  | 'commercials'
  | 'products'
  | 'stock'
  | 'quotes'
  | 'invoices'
  | 'orders'
  | 'discussions'
  | 'map-stores'
  | 'map-sales'
  | 'boutique'
  | 'boutique-settings'
  | 'reports'
  | 'ai-assistant'
  | 'support-tickets'
  | 'api-keys'
  | 'settings'
  | 'users'
  | 'install-app'
  | 'super-admin-companies'
  | 'super-admin-settings'

export type Role = 'super_admin' | 'admin' | 'director' | 'commercial' | 'accountant'

export interface AppState {
  currentPage: PageId
  selectedClientId: string | null
  selectedOrderId: string | null
  selectedQuoteId: string | null
  selectedInvoiceId: string | null
  user: {
    id: string
    name: string
    email: string
    role: Role
    avatar?: string
    companyId: string
  } | null
  sidebarOpen: boolean
  theme: 'light' | 'dark'
}

interface AppActions {
  setCurrentPage: (page: PageId) => void
  setSelectedClient: (id: string | null) => void
  setSelectedOrder: (id: string | null) => void
  setSelectedQuote: (id: string | null) => void
  setSelectedInvoice: (id: string | null) => void
  setUser: (user: AppState['user']) => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  currentPage: 'dashboard',
  selectedClientId: null,
  selectedOrderId: null,
  selectedQuoteId: null,
  selectedInvoiceId: null,
  user: {
    id: 'usr_1',
    name: 'Mamadou Diallo',
    email: 'mamadou@distribusn.com',
    role: 'admin',
    companyId: 'comp_1',
  },
  sidebarOpen: true,
  theme: 'light',
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedClient: (id) => set({ selectedClientId: id }),
  setSelectedOrder: (id) => set({ selectedOrderId: id }),
  setSelectedQuote: (id) => set({ selectedQuoteId: id }),
  setSelectedInvoice: (id) => set({ selectedInvoiceId: id }),
  setUser: (user) => set({ user }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
}))
