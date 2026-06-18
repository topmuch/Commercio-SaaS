'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  ShoppingCart,
  Star,
  Search,
  MessageCircle,
  Tag,
  Sparkles,
  Phone,
  Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

interface BoutiqueProduct {
  id: string
  name: string
  reference: string
  price: number
  resellerPrice: number | null
  stock: number
  minStock: number
  category: { name: string } | null
  brand: string | null
  status: string
  gradient: string
}

interface CategoryItem {
  id: string
  name: string
  _count: { products: number }
}

const gradients = [
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-cyan-500',
  'from-violet-400 to-purple-500',
  'from-lime-400 to-green-500',
  'from-red-400 to-rose-500',
  'from-blue-400 to-indigo-500',
  'from-fuchsia-400 to-pink-500',
  'from-yellow-400 to-amber-500',
  'from-teal-400 to-emerald-500',
  'from-orange-400 to-red-500',
  'from-cyan-400 to-blue-500',
  'from-green-400 to-emerald-500',
  'from-pink-400 to-rose-500',
  'from-indigo-400 to-violet-500',
]

const categoryIcons: Record<string, string> = {
  'Boissons': '🥤',
  'Alimentation': '🍞',
  'Entretien': '🧹',
  'Hygiène': '💅',
  'Produits Laitiers': '🥛',
  'Conserves': '🥫',
  'Jus & Sodas': '🧃',
  'Eau minérale': '💧',
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

function getStockBadge(stock: number, minStock: number) {
  if (stock === 0) {
    return <Badge variant="destructive" className="text-[10px] px-1.5">Rupture</Badge>
  }
  if (stock <= minStock) {
    return <Badge className="text-[10px] px-1.5 bg-erp-warning text-white">Stock limité</Badge>
  }
  return <Badge className="text-[10px] px-1.5 bg-erp-success text-white">En stock</Badge>
}

function buildWhatsAppUrl(product: BoutiqueProduct, whatsappNumber: string) {
  const phone = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : ''
  const message = encodeURIComponent(
    `Bonjour, je souhaite commander :\n\n` +
    `📦 Produit : ${product.name}\n` +
    `📋 Référence : ${product.reference}\n` +
    `💰 Prix : ${formatCFA(product.price)}\n` +
    `${product.resellerPrice ? `🏷️ Prix revendeur : ${formatCFA(product.resellerPrice)}\n` : ''}` +
    `\nMerci de confirmer la disponibilité.`
  )
  return `https://wa.me/${phone}?text=${message}`
}

// ── Product Card ──────────────────────────────────────────────────────

function ProductCard({ product, whatsappNumber }: { product: BoutiqueProduct; whatsappNumber: string }) {
  return (
    <Card className="group overflow-hidden border border-border/60 hover:shadow-lg transition-all duration-200 hover:border-erp-orange/30 flex flex-col">
      {/* Image placeholder */}
      <div className={`relative h-40 bg-gradient-to-br ${product.gradient} flex items-center justify-center overflow-hidden`}>
        <div className="text-white/30 text-6xl font-bold">
          {product.name.charAt(0)}
        </div>

        {/* Brand badge */}
        {product.brand && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-black/20 text-white text-[10px] px-1.5 py-0 backdrop-blur-sm border-0">
              {product.brand}
            </Badge>
          </div>
        )}

        <div className="absolute top-2 right-2">
          {getStockBadge(product.stock, product.minStock)}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-200" />
      </div>

      <CardContent className="flex flex-col flex-1 p-4 gap-3">
        {/* Name + Ref */}
        <div>
          <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Réf: {product.reference}
            {product.category && (
              <span className="ml-2">· {product.category.name}</span>
            )}
          </p>
        </div>

        {/* Prices */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">
              {formatCFA(product.price)}
            </span>
          </div>
          {product.resellerPrice && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Prix revendeur
              </span>
              <span className="text-xs font-semibold text-erp-orange">
                {formatCFA(product.resellerPrice)}
              </span>
            </div>
          )}
        </div>

        {/* WhatsApp button */}
        <div className="mt-auto">
          <Button
            className="w-full gap-2 bg-erp-success hover:bg-erp-success/90 text-white text-sm"
            size="sm"
            asChild
            disabled={product.stock === 0}
          >
            <a href={buildWhatsAppUrl(product, whatsappNumber)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              Commander sur WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-9 bg-muted rounded-lg animate-pulse w-full mt-4" />
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────

export default function BoutiquePage() {
  const [products, setProducts] = useState<BoutiqueProduct[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch('/api/products?status=active&limit=100'),
        fetch('/api/categories'),
        fetch('/api/store-settings'),
      ])

      if (!productsRes.ok || !categoriesRes.ok) throw new Error('Erreur de chargement')

      const productsJson = await productsRes.json()
      const categoriesJson = await categoriesRes.json()

      // Get WhatsApp number from store settings (non-blocking)
      if (settingsRes.ok) {
        const settingsJson = await settingsRes.json()
        if (settingsJson.data?.whatsappNumber) {
          setWhatsappNumber(settingsJson.data.whatsappNumber)
        }
      }

      const mappedProducts: BoutiqueProduct[] = (productsJson.data || []).map(
        (p: Record<string, unknown>, idx: number) => ({
          id: p.id as string,
          name: p.name as string,
          reference: p.reference as string,
          price: p.price as number,
          resellerPrice: p.resellerPrice as number | null,
          stock: p.stock as number,
          minStock: p.minStock as number,
          category: p.category as { name: string } | null,
          brand: p.brand as string | null,
          status: p.status as string,
          gradient: gradients[idx % gradients.length],
        })
      )

      setProducts(mappedProducts)
      setCategories(categoriesJson.data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Build dynamic category nav from real data
  const categoryNav = useMemo(() => {
    const nav = [{ id: 'all', label: 'Tous', icon: '🛍️', count: products.length }]
    categories.forEach((cat) => {
      nav.push({
        id: cat.id,
        label: cat.name,
        icon: categoryIcons[cat.name] || '📦',
        count: cat._count.products,
      })
    })
    return nav
  }, [categories, products.length])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.category?.name === categories.find(c => c.id === activeCategory)?.name || p.category?.name === activeCategory
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, activeCategory, searchQuery, categories])

  // Featured products: top 4 by highest stock
  const featuredProducts = useMemo(
    () => [...products].sort((a, b) => b.stock - a.stock).slice(0, 4),
    [products]
  )

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-erp-blue p-6 sm:p-10 lg:p-14 animate-pulse">
          <div className="h-8 w-48 bg-white/20 rounded mb-4" />
          <div className="h-12 w-80 bg-white/20 rounded mb-3" />
          <div className="h-5 w-96 bg-white/15 rounded mb-6" />
          <div className="h-11 w-full max-w-md bg-white/20 rounded-lg" />
        </section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // ─── Error State ───
  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-erp-danger">{error}</p>
          <Button variant="outline" onClick={fetchData}>Réessayer</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Hero Banner ────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-erp-blue p-6 sm:p-10 lg:p-14">
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -right-5 top-16 h-24 w-24 rounded-full bg-erp-orange/20" />
        <div className="absolute left-1/2 -bottom-6 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-6 w-6 text-erp-orange" />
            <Badge className="bg-erp-orange/90 text-white border-0">
              Boutique en ligne
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
            Bienvenue sur notre boutique
          </h1>
          <p className="text-sm sm:text-base text-white/70 mb-6 max-w-lg">
            Parcourez notre catalogue de {products.length} produits et commandez facilement via WhatsApp.
            Prix compétitifs pour professionnels et revendeurs au Sénégal.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit, une référence..."
              className="pl-10 h-11 bg-white/95 text-foreground placeholder:text-muted-foreground border-0 shadow-lg focus-visible:ring-erp-orange/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Category Navigation ────────────────────────────── */}
      <section>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {categoryNav.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* ── Featured Products (high stock) ──────────────────── */}
      {activeCategory === 'all' && !searchQuery && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-erp-orange" />
            <h2 className="text-lg font-bold text-foreground">Produits Populaires</h2>
            <Badge variant="secondary" className="bg-erp-orange/10 text-erp-orange text-xs">
              {featuredProducts.length} articles
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} whatsappNumber={whatsappNumber} />
            ))}
          </div>
        </section>
      )}

      {/* ── All Products Grid ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {activeCategory === 'all'
                ? 'Tous les produits'
                : categoryNav.find(c => c.id === activeCategory)?.label}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {filteredProducts.length} articles
            </Badge>
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Effacer la recherche
            </Button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Search className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucun produit trouvé pour &ldquo;{searchQuery}&rdquo;
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Voir tous les produits
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} whatsappNumber={whatsappNumber} />
            ))}
          </div>
        )}
      </section>

      {/* ── Footer CTA ─────────────────────────────────────── */}
      <section className="rounded-2xl bg-muted/50 border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-erp-success/10">
          <Phone className="h-6 w-6 text-erp-success" />
        </div>
        <div className="text-center sm:text-left flex-1">
          <h3 className="font-semibold text-foreground">Besoin d&apos;aide pour commander ?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Contactez notre équipe directement via WhatsApp pour une assistance personnalisée.
            Livraison disponible à Dakar et dans tout le Sénégal.
          </p>
        </div>
        <Button
          className="gap-2 bg-erp-success hover:bg-erp-success/90 text-white shrink-0"
          onClick={() => {
            const phone = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '221781234567'
            const message = encodeURIComponent('Bonjour, j\'ai besoin d\'aide pour passer une commande.')
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Contacter sur WhatsApp
        </Button>
      </section>
    </div>
  )
}
