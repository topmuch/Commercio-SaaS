// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  count?: number
}

export interface DashboardStats {
  revenueToday: number
  revenueMonth: number
  orderCount: number
  quoteCount: number
  clientCount: number
  revenueGrowth: number
  orderGrowth: number
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface TopProduct {
  id: string
  name: string
  reference: string
  totalSold: number
  revenue: number
  image?: string
}

export interface TopCommercial {
  id: string
  name: string
  avatar?: string
  revenue: number
  clientCount: number
  orderCount: number
  targetAchieved: number
}

export interface Client {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  sector?: string
  type: string
  status: string
  notes?: string
  commercialId?: string
  companyId: string
  createdAt: string
  _count?: {
    orders: number
    quotes: number
    invoices: number
    visits: number
  }
  commercial?: {
    name: string
  }
}

export interface Product {
  id: string
  name: string
  reference: string
  description?: string
  price: number
  resellerPrice?: number
  image?: string
  categoryId?: string
  brand?: string
  stock: number
  minStock: number
  status: string
  companyId: string
  category?: {
    name: string
  }
}

export interface Category {
  id: string
  name: string
  parentId?: string
  image?: string
  _count?: {
    products: number
    children: number
  }
}

export interface Quote {
  id: string
  number: string
  status: string
  total: number
  discount: number
  tax: number
  validUntil?: string
  notes?: string
  clientId: string
  commercialId?: string
  companyId: string
  createdAt: string
  client?: {
    companyName: string
    contactName: string
  }
  commercial?: {
    name: string
  }
  items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  productId: string
  quoteId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    name: string
    reference: string
  }
}

export interface Order {
  id: string
  number: string
  status: string
  total: number
  discount: number
  tax: number
  notes?: string
  clientId: string
  commercialId?: string
  companyId: string
  createdAt: string
  client?: {
    companyName: string
    contactName: string
  }
  commercial?: {
    name: string
  }
  items?: OrderItem[]
  _count?: {
    items: number
  }
}

export interface OrderItem {
  id: string
  productId: string
  orderId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    name: string
    reference: string
  }
}

export interface Invoice {
  id: string
  number: string
  status: string
  total: number
  paid: number
  discount: number
  tax: number
  dueDate?: string
  notes?: string
  orderId?: string
  clientId: string
  commercialId?: string
  companyId: string
  createdAt: string
  client?: {
    companyName: string
    contactName: string
  }
  commercial?: {
    name: string
  }
  items?: InvoiceItem[]
  payments?: Payment[]
}

export interface InvoiceItem {
  id: string
  productId: string
  invoiceId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: {
    name: string
    reference: string
  }
}

export interface StockMovement {
  id: string
  type: string
  quantity: number
  reason?: string
  productId: string
  companyId: string
  createdAt: string
  product?: {
    name: string
    reference: string
  }
}

export interface Visit {
  id: string
  type: string
  notes?: string
  status: string
  latitude?: number
  longitude?: number
  clientId: string
  commercialId: string
  companyId: string
  createdAt: string
  client?: {
    companyName: string
  }
  commercial?: {
    name: string
  }
}

export interface Discussion {
  id: string
  type: string
  content: string
  direction: string
  clientId: string
  commercialId?: string
  companyId: string
  createdAt: string
  client?: {
    companyName: string
    contactName: string
  }
  commercial?: {
    name: string
  }
}

export interface Commercial {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  role: string
  active: boolean
  _count?: {
    clients: number
    orders: number
    visits: number
  }
  targets?: Target[]
  _revenue?: number
  _targetPercent?: number
}

export interface Target {
  id: string
  type: string
  value: number
  period: string
  startDate: string
  endDate: string
  achieved: number
}

export interface Payment {
  id: string
  amount: number
  method: string
  reference?: string
  status: string
  notes?: string
  invoiceId?: string
  clientId: string
  companyId: string
  createdAt: string
}

export interface Store {
  id: string
  companyName: string
  address?: string
  city?: string
  region?: string
  phone: string
  type: string
  latitude?: number
  longitude?: number
  commercial?: {
    name: string
  }
  _revenue?: number
}
