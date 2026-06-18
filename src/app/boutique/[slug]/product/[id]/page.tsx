'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CartProvider, useCart, type Product } from '@/lib/cart-context'
import {
  ShoppingCart,
  Plus,
  Minus,
  ArrowLeft,
  Heart,
  Truck,
  Shield,
  Headphones,
  ChevronRight,
  Star,
  Package,
  Store,
  Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

interface ProductDetail {
  id: string
  name: string
  reference: string
  description: string | null
  price: number
  resellerPrice: number | null
  image: string | null
  brand: string | null
  stock: number
  category: { name: string; id: string } | null
}

interface StoreInfo {
  title: string
  description: string | null
  whatsappNumber: string | null
  currency: string
  logoUrl: string | null
  primaryColor: string | null
  company: {
    id: string
    name: string
    logo: string | null
    address: string | null
    phone: string | null
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  const code = currency.toUpperCase().trim()
  if (code === 'XOF' || code === 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
  }
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }).format(price)
  } catch {
    return new Intl.NumberFormat('fr-FR').format(price) + ' ' + currency
  }
}

const placeholderGradients = [
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-teal-500',
  'from-lime-400 to-green-500',
  'from-red-400 to-rose-500',
]

// ── Main Page ─────────────────────────────────────────────────────

function ProductPageContent() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const productId = params.id as string

  const { addItem } = useCart()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  // Fetch product data
  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/store/${slug}/product/${productId}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Produit introuvable')
        const json = await res.json()
        if (controller.signal.aborted) return
        setProduct(json.data.product)
        setRelatedProducts(json.data.relatedProducts || [])
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Erreur')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [slug, productId])

  // Fetch store info for theming
  const [primaryColor, setPrimaryColor] = useState('#16a34a')
  const [currency, setCurrency] = useState('XOF')
  const [storeTitle, setStoreTitle] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/store/${slug}`, { signal: controller.signal })
        if (!res.ok) return
        const json = await res.json()
        if (controller.signal.aborted) return
        const s = json.data.store
        setPrimaryColor(s.primaryColor || '#16a34a')
        setCurrency(s.currency || 'XOF')
        setStoreTitle(s.title || '')
        setWhatsappNumber(s.whatsappNumber ? s.whatsappNumber.replace(/[^0-9]/g, '') : '')
      } catch {
        // ignore
      }
    })()
    return () => controller.abort()
  }, [slug])

  const handleAddToCart = useCallback(() => {
    if (!product) return
    addItem(product as unknown as Product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }, [product, quantity, addItem])

  if (loading) return <ProductSkeleton />
  if (error || !product) return <ErrorState message={error || 'Produit introuvable'} onRetry={() => router.back()} />

  const isOutOfStock = product.stock === 0
  const hasStockInfo = product.stock > 0

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="bg-neutral-900 text-white text-xs py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>{storeTitle}</span>
          <span>Qualité garantie</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Retour</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-sm font-semibold text-gray-900 truncate">Détail du produit</h1>
          </div>
          <Link
            href={`/boutique/${slug}`}
            className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: primaryColor }}
          >
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Boutique</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
            <Link href={`/boutique/${slug}`} className="hover:text-gray-600 transition-colors">Accueil</Link>
            <ChevronRight className="h-3 w-3" />
            {product.category && (
              <>
                <span className="hover:text-gray-600 transition-colors cursor-pointer">{product.category.name}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <span className="text-gray-700 font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>

          {/* Product layout */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' as const }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10"
          >
            {/* Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${placeholderGradients[0]} flex items-center justify-center`}>
                  <span className="text-white/20 text-8xl font-bold select-none">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Category badge */}
              {product.category && (
                <div className="absolute top-4 left-4">
                  <Badge className="text-xs px-3 py-1 rounded-full font-medium text-white border-0" style={{ backgroundColor: primaryColor }}>
                    {product.category.name}
                  </Badge>
                </div>
              )}
              {/* Heart button */}
              <button
                onClick={() => setLiked(!liked)}
                className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-all"
                aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart className={`h-5 w-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-4">
              {/* Brand */}
              {product.brand && (
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{product.brand}</span>
              )}
              {/* Name */}
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h2>

              {/* Rating placeholder */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-xs text-gray-400 ml-1">(avis)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                  {formatPrice(product.price, currency)}
                </span>
                {product.resellerPrice && product.resellerPrice > 0 && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.resellerPrice, currency)}
                  </span>
                )}
              </div>

              {/* Reference */}
              <p className="text-xs text-gray-400">Réf: {product.reference}</p>

              <Separator className="my-2" />

              {/* Description */}
              {product.description ? (
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Aucune description disponible pour ce produit.</p>
              )}

              {/* Stock status */}
              {hasStockInfo ? (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-sm font-medium text-emerald-600">
                    En stock ({product.stock} disponibles)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-sm font-medium text-amber-600">
                    Commander pour vérifier la disponibilité
                  </span>
                </div>
              )}

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    aria-label="Diminuer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="h-12 w-12 flex items-center justify-center text-lg font-semibold border-x border-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    aria-label="Augmenter"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  className="flex-1 h-12 gap-2 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200"
                  style={
                    added
                      ? { backgroundColor: `${primaryColor}20`, color: primaryColor, border: `2px solid ${primaryColor}` }
                      : { backgroundColor: primaryColor, color: 'white' }
                  }
                  onClick={handleAddToCart}
                >
                  {added ? (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Ajouté au panier !
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Ajouter au panier
                    </>
                  )}
                </Button>
              </div>

              {/* WhatsApp */}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour, je suis intéressé par : ${product.name} (${product.reference})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Contacter via WhatsApp
                </a>
              )}

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
                  <Truck className="h-5 w-5" style={{ color: primaryColor }} />
                  <span className="text-[10px] sm:text-xs text-gray-500 text-center leading-tight">Livraison rapide</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
                  <Shield className="h-5 w-5" style={{ color: primaryColor }} />
                  <span className="text-[10px] sm:text-xs text-gray-500 text-center leading-tight">Paiement sécurisé</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
                  <Headphones className="h-5 w-5" style={{ color: primaryColor }} />
                  <span className="text-[10px] sm:text-xs text-gray-500 text-center leading-tight">Support 24/7</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-12 sm:mt-16">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Produits similaires</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {relatedProducts.map((rp, idx) => (
                  <Link key={rp.id} href={`/boutique/${slug}/product/${rp.id}`}>
                    <motion.div
                      whileHover={{ y: -4, boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)' }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        {rp.image ? (
                          <Image src={rp.image} alt={rp.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-br ${placeholderGradients[idx % placeholderGradients.length]} flex items-center justify-center`}>
                            <span className="text-white/20 text-4xl font-bold">{rp.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{rp.name}</h4>
                        <p className="text-sm font-bold mt-1" style={{ color: primaryColor }}>
                          {formatPrice(rp.price, currency)}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-neutral-900 text-gray-400 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          © {new Date().getFullYear()} {storeTitle}. Tous droits réservés. Propulsé par <span className="font-medium text-gray-300">Commercio</span>
        </div>
      </footer>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-neutral-900 h-8" />
      <div className="bg-white h-14 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center gap-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40 mx-auto" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="flex flex-col gap-4 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-20" />
            <Separator />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-36 rounded-xl" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Error State ───────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <Package className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Produit introuvable</h2>
        <p className="text-sm text-gray-500">{message}</p>
        <Button onClick={onRetry} variant="outline" className="gap-2 rounded-full">
          <ArrowLeft className="h-4 w-4" />
          Retour à la boutique
        </Button>
      </div>
    </div>
  )
}

// ── Page Export ───────────────────────────────────────────────────

export default function ProductPage() {
  return (
    <CartProvider>
      <ProductPageContent />
    </CartProvider>
  )
}