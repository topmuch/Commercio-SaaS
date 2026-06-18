'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ArrowLeft, Plus, Minus, Trash2, MessageCircle,
  Package, User, Check, WifiOff, Send, Save, ShoppingBag,
  ChevronRight, Loader2, ImageIcon, UserPlus,
} from 'lucide-react'
import { MobileInlineClientCreate } from '@/components/mobile/inline-client-create'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

// ─── Types ───
interface Client {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp: string | null
  address: string | null
  city: string | null
}

interface Product {
  id: string
  name: string
  reference: string
  price: number
  resellerPrice: number | null
  image: string | null
  stock: number
  category?: { name: string } | null
}

interface Category {
  id: string
  name: string
  _count: { products: number }
}

interface CartItem {
  product: Product
  quantity: number
}

interface StoreSettings {
  storeTitle: string
  currency: string
}

// ─── Helpers ───
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function generateWhatsAppMessage(
  client: Client,
  items: CartItem[],
  total: number,
  notes: string,
  storeTitle: string
): string {
  const lines = [
    '🛒 *Nouvelle Commande*',
    `*Client:* ${client.companyName}`,
    `*Date:* ${todayFormatted()}`,
    '',
    '📋 *Détails:*',
    ...items.map(i => `- ${i.product.name} x${i.quantity} = ${formatCurrency(i.quantity * i.product.price)}`),
    '',
    `💰 *Total: ${formatCurrency(total)}*`,
  ]
  if (notes) {
    lines.push(`_Note: ${notes}_`)
  }
  lines.push('')
  lines.push(`_Teranga Biz — ${storeTitle}_`)

  return encodeURIComponent(lines.join('\n'))
}

// ─── Main Component ───
export default function QuickOrderPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const isOnline = useOnlineStatus()
  const { addToQueue } = useOfflineSync()

  // Steps: 1=select client, 2=add products, 3=summary
  const [step, setStep] = useState(1)

  // Client search
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [showClientCreate, setShowClientCreate] = useState(false)

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [productsLoading, setProductsLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])

  // Summary
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store settings
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ storeTitle: 'Teranga Biz', currency: 'XOF' })

  // ─── Fetch clients ───
  const fetchClients = useCallback(async (search?: string) => {
    try {
      const res = await fetch(`/api/clients?limit=20&search=${search || ''}`)
      if (res.ok) {
        const json = await res.json()
        setClients(json.clients || [])
      }
    } catch {
      // Offline — use cached
    }
  }, [])

  const fetchRecentClients = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile/orders?limit=5')
      if (res.ok) {
        const json = await res.json()
        const uniqueClients: Client[] = []
        const seen = new Set<string>()
        for (const order of json.orders || []) {
          if (order.client && !seen.has(order.client.companyName)) {
            seen.add(order.client.companyName)
            uniqueClients.push(order.client as Client)
          }
        }
        setRecentClients(uniqueClients)
      }
    } catch {
      // Ignore
    }
  }, [])

  // ─── Fetch products & categories ───
  const fetchProducts = useCallback(async (search?: string, categoryId?: string | null) => {
    try {
      const params = new URLSearchParams({ limit: '50', status: 'active' })
      if (search) params.set('search', search)
      if (categoryId) params.set('category', categoryId)
      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setProducts(json.data || [])
      }
    } catch {
      // Offline
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const json = await res.json()
        setCategories(json.data || [])
      }
    } catch {
      // Offline
    }
  }, [])

  // ─── Fetch store settings ───
  const fetchStoreSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/store-settings')
      if (res.ok) {
        const json = await res.json()
        setStoreSettings(json || { storeTitle: 'Teranga Biz', currency: 'XOF' })
      }
    } catch {
      // Ignore
    }
  }, [])

  // ─── Load initial data ───
  useEffect(() => {
    const load = async () => {
      setClientsLoading(true)
      setProductsLoading(true)
      await Promise.all([
        fetchClients(''),
        fetchRecentClients(),
        fetchCategories(),
        fetchProducts(''),
        fetchStoreSettings(),
      ])
      setClientsLoading(false)
      setProductsLoading(false)
    }
    load()
  }, [fetchClients, fetchRecentClients, fetchCategories, fetchProducts, fetchStoreSettings])

  // ─── Search clients ───
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(clientSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, fetchClients])

  // ─── Search products ───
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(productSearch, selectedCategory)
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch, selectedCategory, fetchProducts])

  // ─── Cart helpers ───
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQty = Math.max(0, i.quantity + delta)
        return { ...i, quantity: newQty }
      }
      return i
    }).filter(i => i.quantity > 0))
  }, [])

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  }, [cart])

  const cartCount = useMemo(() => {
    return cart.reduce((sum, i) => sum + i.quantity, 0)
  }, [cart])

  // ─── Filtered clients for display ───
  const displayedClients = useMemo(() => {
    if (clientSearch.trim()) return clients
    return recentClients.length > 0 ? recentClients : clients.slice(0, 10)
  }, [clients, recentClients, clientSearch])

  // ─── Handle new client created inline ───
  const handleClientCreated = useCallback((client: Client) => {
    setSelectedClient(client)
    setClients(prev => [client, ...prev])
    setShowClientCreate(false)
    setStep(2)
  }, [])

  // ─── Submit order ───
  const submitOrder = useCallback(async () => {
    if (!selectedClient || cart.length === 0) return

    setSubmitting(true)
    setError(null)

    const body = {
      clientId: selectedClient.id,
      commercialId: user?.id || undefined,
      items: cart.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.product.price,
      })),
      notes: notes || undefined,
      tax: 0,
      discount: 0,
    }

    try {
      if (isOnline) {
        const res = await fetch('/api/mobile/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          router.push('/mobile/orders')
        } else {
          const json = await res.json()
          setError(json.error || 'Erreur lors de la création de la commande')
        }
      } else {
        // Save to offline queue
        await addToQueue({
          type: 'order',
          method: 'POST',
          url: '/api/mobile/orders',
          body,
          maxRetries: 3,
        })
        router.push('/mobile/orders')
      }
    } catch {
      if (!isOnline) {
        await addToQueue({
          type: 'order',
          method: 'POST',
          url: '/api/mobile/orders',
          body,
          maxRetries: 3,
        })
        router.push('/mobile/orders')
      } else {
        setError('Erreur réseau. Veuillez réessayer.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [selectedClient, cart, notes, isOnline, user, router, addToQueue])

  // ─── Send via WhatsApp ───
  const sendWhatsApp = useCallback(() => {
    if (!selectedClient) return
    const phone = (selectedClient.whatsapp || selectedClient.phone).replace(/[^0-9+]/g, '')
    const message = generateWhatsAppMessage(selectedClient, cart, cartTotal, notes, storeSettings.storeTitle)
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }, [selectedClient, cart, cartTotal, notes, storeSettings.storeTitle])

  // ─── Step titles ───
  const stepTitles = ['Sélection du client', 'Ajout de produits', 'Récapitulatif']

  return (
    <div className="flex flex-col min-h-full">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400">
          <WifiOff className="h-3.5 w-3.5" />
          Hors-ligne — La commande sera sauvegardée en local
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1)
            else router.push('/mobile/orders')
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4 text-slate-300" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-100">Nouvelle Commande</h2>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  s === step ? 'bg-emerald-500' : s < step ? 'bg-emerald-500/50' : 'bg-slate-600'
                )} />
                {s < 3 && (
                  <div className={cn(
                    'h-0.5 w-4 rounded-full',
                    s < step ? 'bg-emerald-500/50' : 'bg-slate-700'
                  )} />
                )}
              </div>
            ))}
            <span className="text-[10px] text-slate-500 ml-1">{stepTitles[step - 1]}</span>
          </div>
        </div>
        {step === 2 && cartCount > 0 && (
          <button
            onClick={() => setStep(3)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-white"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{cartCount} article{cartCount > 1 ? 's' : ''}</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <ClientStep
            clients={displayedClients}
            loading={clientsLoading}
            search={clientSearch}
            onSearchChange={setClientSearch}
            onSelect={(c) => { setSelectedClient(c); setStep(2) }}
            showClientCreate={showClientCreate}
            onToggleClientCreate={() => setShowClientCreate(!showClientCreate)}
            onClientCreated={handleClientCreated}
          />
        )}
        {step === 2 && (
          <ProductsStep
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            search={productSearch}
            onSearchChange={setProductSearch}
            loading={productsLoading}
            cart={cart}
            onAdd={addToCart}
            onUpdateQty={updateQuantity}
            onRemove={removeFromCart}
          />
        )}
        {step === 3 && (
          <SummaryStep
            client={selectedClient!}
            cart={cart}
            total={cartTotal}
            notes={notes}
            onNotesChange={setNotes}
            onRemove={removeFromCart}
            onUpdateQty={updateQuantity}
            onSubmit={submitOrder}
            onWhatsApp={sendWhatsApp}
            onOfflineSave={submitOrder}
            isOnline={isOnline}
            submitting={submitting}
            error={error}
            storeTitle={storeSettings.storeTitle}
          />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// STEP 1: Client Selection
// ═══════════════════════════════════════════════════
function ClientStep({
  clients,
  loading,
  search,
  onSearchChange,
  onSelect,
  showClientCreate,
  onToggleClientCreate,
  onClientCreated,
}: {
  clients: Client[]
  loading: boolean
  search: string
  onSearchChange: (v: string) => void
  onSelect: (c: Client) => void
  showClientCreate: boolean
  onToggleClientCreate: () => void
  onClientCreated: (c: Client) => void
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher par nom, téléphone..."
          className="w-full min-h-[44px] rounded-xl border border-slate-700/50 bg-slate-800/60 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
        />
      </div>

      {/* Inline client creation toggle */}
      {!showClientCreate && (
        <button
          onClick={onToggleClientCreate}
          className="flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 active:bg-emerald-500/15 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <UserPlus className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-emerald-400">Créer un nouveau client</p>
            <p className="text-[11px] text-emerald-400/50">Ajouter rapidement un client</p>
          </div>
        </button>
      )}

      {/* Inline client create form */}
      {showClientCreate && (
        <MobileInlineClientCreate
          onClientCreated={onClientCreated}
          onCancel={onToggleClientCreate}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/30 p-3.5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-8 text-center">
          <User className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Aucun client trouvé</p>
          <p className="text-xs text-slate-500 mt-1">Essayez un autre terme de recherche</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5 text-left active:bg-slate-700/60 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <span className="text-sm font-bold text-emerald-500">
                  {client.companyName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{client.companyName}</p>
                <p className="text-xs text-slate-500 truncate">{client.contactName} — {client.phone}</p>
                {client.city && (
                  <p className="text-xs text-slate-600 truncate mt-0.5">{client.address || client.city}</p>
                )}
              </div>
              {client.whatsapp && (
                <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
              )}
              <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// STEP 2: Add Products
// ═══════════════════════════════════════════════════
function ProductsStep({
  products,
  categories,
  selectedCategory,
  onCategoryChange,
  search,
  onSearchChange,
  loading,
  cart,
  onAdd,
  onUpdateQty,
  onRemove,
}: {
  products: Product[]
  categories: Category[]
  selectedCategory: string | null
  onCategoryChange: (id: string | null) => void
  search: string
  onSearchChange: (v: string) => void
  loading: boolean
  cart: CartItem[]
  onAdd: (p: Product) => void
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
}) {
  const cartMap = useMemo(() => {
    const map = new Map<string, CartItem>()
    for (const item of cart) {
      map.set(item.product.id, item)
    }
    return map
  }, [cart])

  const inCart = (productId: string) => cartMap.get(productId)

  return (
    <div className="flex flex-col min-h-full">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full min-h-[44px] rounded-xl border border-slate-700/50 bg-slate-800/60 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'shrink-0 min-h-[36px] rounded-lg px-3 text-xs font-medium transition-colors',
            !selectedCategory
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 active:bg-slate-700/60'
          )}
        >
          Tous
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'shrink-0 min-h-[36px] rounded-lg px-3 text-xs font-medium transition-colors',
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 active:bg-slate-700/60'
            )}
          >
            {cat.name} ({cat._count.products})
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="flex-1 px-4 pb-32">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/30 p-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-8 text-center mt-4">
            <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Aucun produit trouvé</p>
            <p className="text-xs text-slate-500 mt-1">Modifiez vos filtres</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(product => {
              const cartItem = inCart(product.id)
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3"
                >
                  {/* Product image */}
                  {product.image ? (
                    <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-700">
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                      <ImageIcon className="h-5 w-5 text-slate-500" />
                    </div>
                  )}

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.reference}</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      {formatCurrency(product.price)}
                    </p>
                    {product.stock <= 5 && product.stock > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5 text-amber-400 bg-amber-500/10">
                        Stock: {product.stock}
                      </Badge>
                    )}
                  </div>

                  {/* Quantity selector or add button */}
                  {cartItem ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateQty(product.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/80 active:bg-slate-600"
                      >
                        <Minus className="h-3.5 w-3.5 text-slate-300" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-slate-100">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(product.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 active:bg-emerald-500/30"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-500" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAdd(product)}
                      className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 text-xs font-medium text-emerald-500 active:bg-emerald-500/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky cart summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{cart.reduce((s, i) => s + i.quantity, 0)} article(s)</p>
              <p className="text-lg font-bold text-slate-100">{formatCurrency(cart.reduce((s, i) => s + i.product.price * i.quantity, 0))}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white"
              >
                <ShoppingBag className="h-4 w-4" />
                Voir le récapitulatif
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// STEP 3: Summary & Send
// ═══════════════════════════════════════════════════
function SummaryStep({
  client,
  cart,
  total,
  notes,
  onNotesChange,
  onRemove,
  onUpdateQty,
  onSubmit,
  onWhatsApp,
  onOfflineSave,
  isOnline,
  submitting,
  error,
  storeTitle,
}: {
  client: Client
  cart: CartItem[]
  total: number
  notes: string
  onNotesChange: (v: string) => void
  onRemove: (id: string) => void
  onUpdateQty: (id: string, delta: number) => void
  onSubmit: () => Promise<void>
  onWhatsApp: () => void
  onOfflineSave: () => Promise<void>
  isOnline: boolean
  submitting: boolean
  error: string | null
  storeTitle: string
}) {
  return (
    <div className="p-4 space-y-4 pb-32">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">Hors-ligne — La commande sera sauvegardée en local et synchronisée automatiquement.</p>
        </div>
      )}

      {/* Client card */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <span className="text-sm font-bold text-emerald-500">
              {client.companyName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100">{client.companyName}</p>
            <p className="text-xs text-slate-500">{client.contactName} — {client.phone}</p>
          </div>
          {client.whatsapp && (
            <a
              href={`https://wa.me/${(client.whatsapp || client.phone).replace(/[^0-9+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10"
            >
              <MessageCircle className="h-4 w-4 text-green-500" />
            </a>
          )}
        </div>
      </div>

      {/* Order items */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-500" />
          Articles ({cart.length})
        </h3>

        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.product.id} className="flex items-center gap-3 rounded-lg bg-slate-700/30 p-2.5">
              {item.product.image ? (
                <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-700">
                  <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-600/50">
                  <Package className="h-4 w-4 text-slate-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{item.product.name}</p>
                <p className="text-xs text-slate-500">{formatCurrency(item.product.price)} / unité</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onUpdateQty(item.product.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-600/80 active:bg-slate-500"
                >
                  <Minus className="h-3 w-3 text-slate-300" />
                </button>
                <span className="w-7 text-center text-sm font-bold text-slate-100">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQty(item.product.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20 active:bg-emerald-500/30"
                >
                  <Plus className="h-3 w-3 text-emerald-500" />
                </button>
              </div>
              <div className="text-right min-w-[70px]">
                <p className="text-sm font-bold text-slate-100">{formatCurrency(item.product.price * item.quantity)}</p>
              </div>
              <button
                onClick={() => onRemove(item.product.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 active:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-slate-700/50 pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Total</span>
          <span className="text-lg font-bold text-emerald-400">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Notes (optionnel)</h3>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Ajoutez une note à cette commande..."
          rows={3}
          className="w-full rounded-lg border border-slate-700/50 bg-slate-700/30 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {/* Save / Submit */}
        <button
          onClick={onSubmit}
          disabled={submitting || cart.length === 0}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white disabled:opacity-50 active:bg-emerald-600 transition-colors"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isOnline ? (
            <Save className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          {submitting
            ? 'Enregistrement...'
            : isOnline
              ? 'Enregistrer la commande'
              : 'Sauvegarder hors-ligne'
          }
        </button>

        {/* WhatsApp */}
        <button
          onClick={onWhatsApp}
          className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white active:bg-green-700 transition-colors"
        >
          <Send className="h-4 w-4" />
          Envoyer par WhatsApp
        </button>
      </div>
    </div>
  )
}
