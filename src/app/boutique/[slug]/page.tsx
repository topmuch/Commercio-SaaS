'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Swiper from 'swiper/bundle'
import 'swiper/swiper-bundle.css'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CartProvider, useCart, type CartItem, type Product } from '@/lib/cart-context'
import {
  ShoppingCart,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  Search,
  ChevronRight,
  Heart,
  Phone,
  Mail,
  MapPin,
  Truck,
  Shield,
  Headphones,
  X,
  Loader2,
  Store,
  ChevronLeft,
  ChevronDown,
  Facebook,
  Instagram,
  Twitter,
  Send,
  ShoppingBag,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

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
    email?: string | null
  }
}

interface Banner {
  id: string
  imageUrl: string
  title: string | null
  subtitle: string | null
  linkUrl: string | null
  displayOrder: number
}

interface CategoryItem {
  id: string
  name: string
  _count: { products: number }
}

interface StoreData {
  store: StoreInfo
  products: Product[]
  categories: CategoryItem[]
}

// ── Helpers ───────────────────────────────────────────────────────

function formatPrice(price: number, currency: string): string {
  // FCFA and XOF are the same currency — Intl only accepts "XOF" as a valid code
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

function cleanPhone(phone: string | null): string {
  return phone ? phone.replace(/[^0-9]/g, '') : ''
}

function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('légume') || n.includes('legume') || n.includes('veget')) return '🥬'
  if (n.includes('viande') || n.includes('meat') || n.includes('boeuf') || n.includes('poulet')) return '🥩'
  if (n.includes('lait') || n.includes('dairy') || n.includes('yaourt') || n.includes('crème')) return '🥛'
  if (n.includes('pain') || n.includes('bread') || n.includes('boulanger') || n.includes('pâtiss')) return '🍞'
  if (n.includes('fruit') || n.includes('orange') || n.includes('banane') || n.includes('mangue')) return '🍊'
  if (n.includes('poisson') || n.includes('fish') || n.includes('mer') || n.includes('sea')) return '🐟'
  if (n.includes('boisson') || n.includes('drink') || n.includes('jus') || n.includes('eau')) return '🥤'
  if (n.includes('sucr') || n.includes('dessert') || n.includes('sweet') || n.includes('gateau')) return '🍰'
  if (n.includes('savon') || n.includes('hygiène') || n.includes('clean') || n.includes('beauté')) return '🧴'
  if (n.includes('riz') || n.includes('céréale') || n.includes('grain') || n.includes('pâtes')) return '🍚'
  if (n.includes('huile') || n.includes('condiment') || n.includes('épice') || n.includes('sauce')) return '🫒'
  if (n.includes('froid') || n.includes('congel') || n.includes('glac') || n.includes('surge')) return '🧊'
  if (n.includes('pharma') || n.includes('médicament') || n.includes('santé')) return '💊'
  if (n.includes('snack') || n.includes('chip') || n.includes('biscuit')) return '🍪'
  if (n.includes('café') || n.includes('thé') || n.includes('cafe') || n.includes('the')) return '☕'
  return '🛒'
}

const placeholderGradients = [
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-teal-500',
  'from-lime-400 to-green-500',
  'from-red-400 to-rose-500',
  'from-fuchsia-400 to-pink-500',
  'from-teal-400 to-emerald-500',
]

function buildCheckoutMessage(items: CartItem[], storeTitle: string): string {
  let msg = `🛒 *NOUVELLE COMMANDE - ${storeTitle}*\n\n`
  msg += `📦 *Détail de la commande :*\n\n`
  let total = 0
  items.forEach((item, idx) => {
    const subtotal = item.product.price * item.quantity
    total += subtotal
    msg += `${idx + 1}. ${item.product.name}\n`
    msg += `   Quantité : ${item.quantity}\n`
    msg += `   Prix unitaire : ${formatPrice(item.product.price, 'XOF')}\n`
    msg += `   Sous-total : ${formatPrice(subtotal, 'XOF')}\n\n`
  })
  msg += `─────────────────\n`
  msg += `💰 *TOTAL : ${formatPrice(total, 'XOF')}*\n`
  msg += `─────────────────\n\n`
  msg += `Merci de confirmer ma commande.`
  return msg
}

// ── Animation helpers ─────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      id={id}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── TOP INFO BAR ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function TopInfoBar({ store }: { store: StoreInfo }) {
  const company = store.company
  return (
    <div className="bg-neutral-900 text-white text-xs py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {company.phone && (
            <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
              <Phone className="h-3 w-3" />
              <span className="hidden sm:inline">{company.phone}</span>
            </a>
          )}
          {company.email && (
            <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
              <Mail className="h-3 w-3" />
              <span className="hidden sm:inline">{company.email}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a href="#" aria-label="Facebook" className="hover:text-emerald-400 transition-colors">
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a href="#" aria-label="Instagram" className="hover:text-emerald-400 transition-colors">
            <Instagram className="h-3.5 w-3.5" />
          </a>
          <a href="#" aria-label="Twitter" className="hover:text-emerald-400 transition-colors">
            <Twitter className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── STICKY HEADER ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function StickyHeader({ store, categories, onCartOpen, totalItems, searchQuery, onSearchChange, onCategoryClick, activeCategory, primaryColor }: {
  store: StoreInfo
  categories: CategoryItem[]
  onCartOpen: () => void
  totalItems: number
  searchQuery: string
  onSearchChange: (q: string) => void
  onCategoryClick: (id: string | null) => void
  activeCategory: string | null
  primaryColor: string
}) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)

  const navLinks = [
    { label: 'Accueil', href: '#', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { label: 'Produits Populaires', href: '#popular' },
    { label: 'Tous les Produits', href: '#all-products' },
  ]

  const handleNavClick = (href: string, customAction?: () => void) => {
    setMobileMenuOpen(false)
    if (customAction) {
      customAction()
      return
    }
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.querySelector(href)
    if (el) {
      const offset = 72 // sticky header height
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const handleCategoryNavClick = (catId: string | null) => {
    setMobileMenuOpen(false)
    setCatDropdownOpen(false)
    onCategoryClick(catId)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo + Name */}
          <button onClick={() => handleNavClick('#')} className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity">
            <div
              className="w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center text-white font-bold text-sm"
              style={{ borderColor: primaryColor, backgroundColor: primaryColor }}
            >
              {store.logoUrl ? (
                <Image src={store.logoUrl} alt={store.title} width={40} height={40} className="w-full h-full object-cover rounded-full" />
              ) : (
                <Store className="h-5 w-5 text-white" />
              )}
            </div>
            <h1 className="font-bold text-gray-900 text-base sm:text-lg truncate max-w-[120px] sm:max-w-none">
              {store.title}
            </h1>
          </button>

          {/* Desktop Nav Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href, link.action)}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                {link.label}
              </button>
            ))}

            {/* Categories Dropdown */}
            {categories.length > 0 && (
              <DropdownMenu open={catDropdownOpen} onOpenChange={setCatDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Catégories
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${catDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 max-h-80 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => { setCatDropdownOpen(false); onCategoryClick(null) }}
                    className={!activeCategory ? 'font-semibold' : ''}
                  >
                    Toutes les catégories
                  </DropdownMenuItem>
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat.id}
                      onClick={() => handleCategoryNavClick(cat.id)}
                      className={activeCategory === cat.id ? 'font-semibold' : ''}
                    >
                      <span className="mr-2">{getCategoryEmoji(cat.name)}</span>
                      {cat.name}
                      <span className="ml-auto text-xs text-gray-400">{cat._count.products}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Search Bar (desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs xl:max-w-sm">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-4 pr-12 h-10 rounded-full border-gray-200 bg-gray-50 focus:bg-white text-sm"
              />
              <button
                className="absolute right-1 top-1 h-8 w-8 flex items-center justify-center rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
                aria-label="Rechercher"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right icons: Mobile menu + Cart */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-gray-700" /> : (
                <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onCartOpen}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Ouvrir le panier"
            >
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              {totalItems > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-4 pr-12 h-10 rounded-full border-gray-200 bg-gray-50 focus:bg-white text-sm"
            />
            <button
              className="absolute right-1 top-1 h-8 w-8 flex items-center justify-center rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
              aria-label="Rechercher"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href, link.action)}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}

            {/* Categories in mobile menu */}
            {categories.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Catégories</span>
                </div>
                <button
                  onClick={() => handleCategoryNavClick(null)}
                  className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${!activeCategory ? 'text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  style={!activeCategory ? { backgroundColor: primaryColor } : undefined}
                >
                  Toutes les catégories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryNavClick(cat.id)}
                    className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeCategory === cat.id ? 'text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                    style={activeCategory === cat.id ? { backgroundColor: primaryColor } : undefined}
                  >
                    <span className="mr-2">{getCategoryEmoji(cat.name)}</span>
                    {cat.name}
                    <span className="ml-2 text-xs text-gray-400">({cat._count.products})</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── HERO BANNER / SLIDER ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function HeroBanner({ banners, store, primaryColor }: {
  banners: Banner[]
  store: StoreInfo
  primaryColor: string
}) {
  const swiperRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!swiperRef.current) return
    if (banners.length === 0) return

    const instance = new Swiper(swiperRef.current, {
      loop: banners.length > 1,
      autoplay: { delay: 5000, disableOnInteraction: false },
      navigation: {
        prevEl: prevRef.current,
        nextEl: nextRef.current,
      },
      pagination: { clickable: true },
      effect: 'fade',
      fadeEffect: { crossFade: true },
    })

    return () => {
      instance.destroy()
    }
  }, [banners.length])

  const hasBanners = banners.length > 0

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden">
          {hasBanners ? (
            <div ref={swiperRef} className="swiper hero-swiper">
              <div className="swiper-wrapper">
                {banners.map((banner) => (
                  <div key={banner.id} className="swiper-slide">
                    <div className="relative h-[220px] sm:h-[320px] lg:h-[400px]">
                      {banner.imageUrl ? (
                        <Image
                          src={banner.imageUrl}
                          alt={banner.title || 'Bannière'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor}88)` }}
                        />
                      )}
                      {/* Green gradient overlay */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to right, ${primaryColor}ee 0%, ${primaryColor}99 50%, ${primaryColor}33 100%)`,
                        }}
                      />
                      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-16 max-w-2xl">
                        {banner.title && (
                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-2">
                            {banner.title}
                          </h2>
                        )}
                        {banner.subtitle && (
                          <p className="text-sm sm:text-base text-white/90 mb-4 sm:mb-6">
                            {banner.subtitle}
                          </p>
                        )}
                        <a
                          href={banner.linkUrl || '#products'}
                          className="inline-flex items-center gap-2 w-fit px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-lg"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Commander
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Navigation arrows */}
              {banners.length > 1 && (
                <>
                  <button
                    ref={prevRef}
                    className="swiper-button-prev-custom absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
                    aria-label="Précédent"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-700" />
                  </button>
                  <button
                    ref={nextRef}
                    className="swiper-button-next-custom absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
                    aria-label="Suivant"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-700" />
                  </button>
                </>
              )}
              {/* Dots */}
              <div className="swiper-pagination !-bottom-1" />
            </div>
          ) : (
            /* Default hero with store info + real grocery image */
            <div
              className="relative h-[220px] sm:h-[320px] lg:h-[400px] rounded-2xl overflow-hidden"
            >
              <Image
                src="/hero-grocery.jpg"
                alt={store.title}
                fill
                className="object-cover"
                priority
              />
              {/* Green gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}ee 0%, ${primaryColor}99 50%, ${primaryColor}44 100%)`,
                }}
              />

              <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3">
                  Bienvenue chez {store.title}
                </h2>
                {store.description && (
                  <p className="text-sm sm:text-base text-white/90 mb-6 line-clamp-3">
                    {store.description}
                  </p>
                )}
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 w-fit px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-lg"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Voir les produits
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hero-swiper .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.5);
          opacity: 1;
          transition: all 0.3s;
        }
        .hero-swiper .swiper-pagination-bullet-active {
          background: white;
          width: 24px;
          border-radius: 4px;
        }
      `,
        }}
      />
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── PRODUCT CARD ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function ProductCard({
  product,
  idx,
  onAdd,
  primaryColor,
  currency,
  slug,
}: {
  product: Product
  idx: number
  onAdd: (product: Product) => void
  primaryColor: string
  currency: string
  slug: string
}) {
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAdd(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiked(!liked)
  }

  const isOutOfStock = product.stock === 0
  const hasStockInfo = product.stock > 0

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)' }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/boutique/${slug}/product/${product.id}`}>
      <Card className="group overflow-hidden border border-gray-100 flex flex-col h-full bg-white transition-all duration-300 rounded-xl">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${placeholderGradients[idx % placeholderGradients.length]} flex items-center justify-center`}>
              <span className="text-white/20 text-6xl font-bold select-none">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Category badge */}
          {product.category && (
            <div className="absolute top-2 left-2 z-10">
              <Badge className="text-[10px] px-2 py-0.5 rounded-full font-medium border-0 text-white" style={{ backgroundColor: primaryColor }}>
                {product.category.name}
              </Badge>
            </div>
          )}
          {/* Heart button */}
          <button
            onClick={handleLike}
            className="absolute top-2 right-2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all duration-200"
            aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors duration-200 ${
                liked ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <CardContent className="flex flex-col flex-1 p-3 sm:p-4 gap-2">
          <h3 className="font-medium text-gray-900 leading-tight line-clamp-1 text-sm">
            {product.name}
          </h3>
          <span className="text-lg font-bold" style={{ color: primaryColor }}>
            {formatPrice(product.price, currency)}
          </span>
          <div className="mt-auto pt-1">
            {hasStockInfo && (
              <p className="text-[10px] text-gray-400 mb-1">{product.stock} en stock</p>
            )}
            <Button
              className="w-full gap-1.5 text-xs font-medium py-2.5 rounded-lg transition-all duration-200"
              style={
                added
                  ? { backgroundColor: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}60` }
                  : isOutOfStock
                    ? { backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }
                    : { backgroundColor: primaryColor, color: 'white' }
              }
              onClick={handleAdd}
            >
              {added ? (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Ajouté ✓
                </>
              ) : isOutOfStock ? (
                <>
                  <MessageCircle className="h-3.5 w-3.5" />
                  Commander
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter au panier
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      </Link>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── POPULAR PRODUCTS SECTION ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function PopularProductsSection({
  products,
  categories,
  activeFilter,
  onFilterChange,
  onAdd,
  primaryColor,
  currency,
  slug,
}: {
  products: Product[]
  categories: CategoryItem[]
  activeFilter: string | null
  onFilterChange: (id: string | null) => void
  onAdd: (product: Product) => void
  primaryColor: string
  currency: string
  slug: string
}) {
  const popularProducts = products.filter((p) => p.stock > 0).slice(0, 8)

  const filteredProducts = activeFilter
    ? popularProducts.filter((p) => p.category?.name === categories.find((c) => c.id === activeFilter)?.name)
    : popularProducts

  if (filteredProducts.length === 0) return null

  return (
    <AnimatedSection className="w-full bg-white" id="popular">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Produits Populaires</h2>
          <button className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80" style={{ color: primaryColor }}>
            Voir tout
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Filter tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => onFilterChange(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !activeFilter ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={!activeFilter ? { backgroundColor: primaryColor } : undefined}
            >
              Tous
            </button>
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange(activeFilter === cat.id ? null : cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeFilter === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeFilter === cat.id ? { backgroundColor: primaryColor } : undefined}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              idx={idx}
              onAdd={onAdd}
              primaryColor={primaryColor}
              currency={currency}
              slug={slug}
            />
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── FEATURES / STATS SECTION ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function FeaturesSection({ primaryColor }: { primaryColor: string }) {
  const features = [
    {
      icon: <Shield className="h-7 w-7" />,
      title: 'Paiement Sécurisé',
      description: 'Transactions sécurisées et fiables',
    },
    {
      icon: <Truck className="h-7 w-7" />,
      title: 'Livraison Rapide',
      description: 'Livraison à domicile en 24-48h',
    },
    {
      icon: <Headphones className="h-7 w-7" />,
      title: 'Support 24/7',
      description: 'Service client toujours disponible',
    },
  ]

  return (
    <AnimatedSection className="w-full bg-gray-50" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center text-center gap-3 border border-gray-100"
            >
              <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                {feat.icon}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{feat.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── ALL PRODUCTS SECTION ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function AllProductsSection({
  products,
  onAdd,
  primaryColor,
  currency,
  slug,
}: {
  products: Product[]
  onAdd: (product: Product) => void
  primaryColor: string
  currency: string
  slug: string
}) {
  const [visibleCount, setVisibleCount] = useState(8)
  const visibleProducts = products.slice(0, visibleCount)
  const hasMore = visibleCount < products.length

  return (
    <AnimatedSection className="w-full bg-white" id="all-products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tous les Produits</h2>
          <span className="text-sm text-gray-400">{products.length} produit{products.length > 1 ? 's' : ''}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {visibleProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              idx={idx}
              onAdd={onAdd}
              primaryColor={primaryColor}
              currency={currency}
              slug={slug}
            />
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-2.5 rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
              onClick={() => setVisibleCount((prev) => prev + 8)}
            >
              Charger plus
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </AnimatedSection>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── CART SHEET ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function CartSheet({ store, whatsappNumber, primaryColor, currency }: {
  store: StoreInfo
  whatsappNumber: string
  primaryColor: string
  currency: string
}) {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, isCartOpen, setIsCartOpen, clearCart } = useCart()

  const waMessage = buildCheckoutMessage(items, store.title)
  const waUrl = buildWhatsAppUrl(whatsappNumber, waMessage)

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Mon Panier
            {totalItems > 0 && (
              <Badge className="ml-1 text-xs" style={{ backgroundColor: primaryColor, color: 'white' }}>
                {totalItems}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs text-gray-400">
            {totalItems === 0 ? 'Votre panier est vide' : `${totalItems} article${totalItems > 1 ? 's' : ''} dans votre panier`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm text-center">Votre panier est vide. Ajoutez des produits pour commencer.</p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setIsCartOpen(false)}
            >
              Continuer mes achats
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-5 py-3">
              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      {/* Product image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                        {item.product.image ? (
                          <Image src={item.product.image} alt={item.product.name} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${placeholderGradients[parseInt(item.product.id.slice(-1), 16) % placeholderGradients.length]} flex items-center justify-center`}>
                            <span className="text-white/30 text-lg font-bold">{item.product.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
                        <p className="text-sm font-bold mt-0.5" style={{ color: primaryColor }}>
                          {formatPrice(item.product.price * item.quantity, currency)}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="h-7 w-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              aria-label="Diminuer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="h-7 w-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              aria-label="Augmenter"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer */}
            <SheetFooter className="border-t px-5 py-4 flex-col gap-3 sm:flex-col">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {formatPrice(totalPrice, currency)}
                </span>
              </div>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl text-sm shadow-lg transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-4 w-4" />
                Commander via WhatsApp
              </a>
              <Button
                variant="ghost"
                className="w-full text-gray-500 text-xs hover:text-red-500"
                onClick={clearCart}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Vider le panier
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── FOOTER ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function Footer({ store, primaryColor }: { store: StoreInfo; primaryColor: string }) {
  const company = store.company
  const year = new Date().getFullYear()

  return (
    <footer className="w-full bg-neutral-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Store info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                {store.logoUrl ? (
                  <Image src={store.logoUrl} alt={store.title} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-white" />
                )}
              </div>
              <span className="text-white font-bold text-lg">{store.title}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
              {store.description || `Découvrez les meilleurs produits chez ${store.title}. Qualité et service à votre portée.`}
            </p>
          </div>

          {/* Col 2: Quick links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Liens Rapides</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  Accueil
                </a>
              </li>
              <li>
                <a href="#products" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  Produits
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  Catégories
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  À propos
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
            <ul className="space-y-3">
              {company.address && (
                <li className="flex items-start gap-2 text-sm text-gray-400">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{company.address}</span>
                </li>
              )}
              {company.phone && (
                <li>
                  <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{company.phone}</span>
                  </a>
                </li>
              )}
              {company.email && (
                <li>
                  <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{company.email}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Social */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Suivez-nous</h4>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-700 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-700 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-neutral-700 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              {store.whatsappNumber && (
                <a
                  href={buildWhatsAppUrl(cleanPhone(store.whatsappNumber), '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white transition-colors hover:opacity-80"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <Separator className="bg-neutral-800" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-xs text-gray-500 text-center">
          © {year} {store.title}. Tous droits réservés. Propulsé par <span className="font-medium text-gray-400">Commercio</span>
        </p>
      </div>
    </footer>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── WHATSAPP FLOATING BUTTON ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function WhatsAppFloat({ phone, primaryColor }: { phone: string; primaryColor: string }) {
  if (!phone) return null
  const url = buildWhatsAppUrl(phone, 'Bonjour, je souhaite passer commande.')

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform duration-300 hover:scale-110"
      style={{ backgroundColor: primaryColor }}
      aria-label="Contacter via WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── LOADING SKELETON ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar skeleton */}
      <div className="bg-neutral-900 h-8">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {/* Header skeleton */}
      <div className="bg-white shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-64 rounded-full hidden sm:block" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      {/* Hero skeleton */}
      <div className="px-4 pt-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-[220px] sm:h-[320px] lg:h-[400px] rounded-2xl w-full" />
        </div>
      </div>
      {/* Categories skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <Skeleton className="h-7 w-40 mb-6" />
        <div className="flex gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-28 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
      {/* Products skeleton */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <Skeleton className="h-7 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-xl w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── ERROR STATE ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <X className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Erreur de chargement</h2>
        <p className="text-sm text-gray-500">{message}</p>
        <Button onClick={onRetry} className="gap-2">
          <Loader2 className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── MAIN BOUTIQUE PAGE ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function BoutiquePageContent() {
  const params = useParams()
  const slug = params.slug as string

  const { addItem, totalItems, isCartOpen, setIsCartOpen } = useCart()

  const [storeData, setStoreData] = useState<StoreData | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const whatsappNumber = useMemo(() => cleanPhone(storeData?.store.whatsappNumber ?? ''), [storeData])
  const primaryColor = storeData?.store.primaryColor || '#16a34a'
  const currency = storeData?.store.currency || 'XOF'

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    ;(async () => {
      try {
        const [storeRes, bannersRes] = await Promise.all([
          fetch(`/api/store/${slug}`, { signal, cache: 'no-store' }),
          fetch(`/api/store/banners?slug=${slug}`, { signal, cache: 'no-store' }),
        ])

        if (signal.aborted) return
        if (!storeRes.ok) throw new Error('Boutique introuvable')

        const storeJson = await storeRes.json()
        const bannersJson = await bannersRes.json()

        if (signal.aborted) return
        setStoreData(storeJson.data)
        setBanners(bannersJson.data || [])
      } catch (err) {
        if (signal.aborted) return
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [])

  // Filter products by search
  const filteredProducts = useMemo(() => {
    let prods = storeData?.products || []
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q)
      )
    }
    return prods
  }, [storeData?.products, searchQuery])

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem(product, 1)
    },
    [addItem]
  )

  const handleCategoryClick = useCallback((catId: string | null) => {
    const newCat = catId && catId === activeCategory ? null : catId
    setActiveCategory(newCat)
    setActiveCategoryFilter(newCat)
    if (newCat) {
      const section = document.getElementById('popular')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [activeCategory])

  if (loading) return <LoadingSkeleton />
  if (error || !storeData) return <ErrorState message={error || 'Données non disponibles'} onRetry={() => window.location.reload()} />

  const { store, categories } = storeData

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ '--accent-color': primaryColor } as React.CSSProperties}>
      {/* 1. Top Info Bar */}
      <TopInfoBar store={store} />

      {/* 2. Sticky Header */}
      <StickyHeader
        store={store}
        categories={categories}
        onCartOpen={() => setIsCartOpen(true)}
        totalItems={totalItems}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCategoryClick={handleCategoryClick}
        activeCategory={activeCategory}
        primaryColor={primaryColor}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* 3. Hero Banner/Slider */}
        <HeroBanner banners={banners} store={store} primaryColor={primaryColor} />

        {/* 4. Popular Products Section */}
        <PopularProductsSection
          products={filteredProducts}
          categories={categories}
          activeFilter={activeCategoryFilter}
          onFilterChange={setActiveCategoryFilter}
          onAdd={handleAddToCart}
          primaryColor={primaryColor}
          currency={currency}
          slug={slug}
        />

        {/* 6. Features/Stats Section */}
        <FeaturesSection primaryColor={primaryColor} />

        {/* 7. All Products Section */}
        <AllProductsSection
          products={filteredProducts}
          onAdd={handleAddToCart}
          primaryColor={primaryColor}
          currency={currency}
          slug={slug}
        />
      </main>

      {/* 8. Footer */}
      <Footer store={store} primaryColor={primaryColor} />

      {/* 9. Cart Sheet */}
      <CartSheet store={store} whatsappNumber={whatsappNumber} primaryColor={primaryColor} currency={currency} />

      {/* 10. WhatsApp Floating Button */}
      <WhatsAppFloat phone={whatsappNumber} primaryColor={primaryColor} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ── PAGE EXPORT ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

export default function BoutiquePage() {
  return (
    <CartProvider>
      <BoutiquePageContent />
    </CartProvider>
  )
}