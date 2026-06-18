'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  XCircle,
  LayoutGrid,
  List,
  Boxes,
  Pencil,
  Loader2,
  FolderOpen,
  ImageIcon,
} from 'lucide-react'
import type { Product, Category } from '@/lib/types'
import { CategoryManager } from './category-manager'
import { ImageUpload } from '@/components/ui/image-upload'
import { toast } from 'sonner'

function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

function getStockColor(stock: number, minStock: number): string {
  if (stock === 0) return 'text-red-500'
  if (stock <= minStock) return 'text-yellow-500'
  return 'text-green-500'
}

function getStockBg(stock: number, minStock: number): string {
  if (stock === 0) return 'bg-red-500/10 border-red-500/20'
  if (stock <= minStock) return 'bg-yellow-500/10 border-yellow-500/20'
  return 'bg-green-500/10 border-green-500/20'
}

function getProductInitialColor(name: string): string {
  const colors = [
    'bg-rose-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-orange-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)

  // Form state
  const [formName, setFormName] = useState('')
  const [formReference, setFormReference] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formResellerPrice, setFormResellerPrice] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formBrand, setFormBrand] = useState('')
  const [formStock, setFormStock] = useState('0')
  const [formMinStock, setFormMinStock] = useState('5')
  const [formStatus, setFormStatus] = useState('active')
  const [formImage, setFormImage] = useState('')

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const json = await res.json()
        setCategories(json.data || [])
      }
    } catch {
      // categories fetch failed silently
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const json = await res.json()
        let data = json.data || []
        setTotalProducts(json.count || 0)
        setTotalPages(json.totalPages || 1)

        // Apply client-side stock filter
        if (stockFilter !== 'all') {
          data = data.filter((p: Product) => {
            if (stockFilter === 'low') return p.stock > 0 && p.stock <= p.minStock
            if (stockFilter === 'out') return p.stock === 0
            if (stockFilter === 'normal') return p.stock > p.minStock
            return true
          })
        }

        setProducts(data)
      }
    } catch {
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, statusFilter, stockFilter, page])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Stats
  const activeProducts = products.filter((p) => p.status === 'active').length
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length
  const outOfStockProducts = products.filter((p) => p.stock === 0).length

  const resetForm = () => {
    setFormName('')
    setFormReference('')
    setFormPrice('')
    setFormResellerPrice('')
    setFormDescription('')
    setFormCategoryId('')
    setFormBrand('')
    setFormStock('0')
    setFormMinStock('5')
    setFormStatus('active')
    setFormImage('')
    setEditingProduct(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormName(product.name)
    setFormReference(product.reference)
    setFormPrice(product.price.toString())
    setFormResellerPrice(product.resellerPrice?.toString() || '')
    setFormDescription(product.description || '')
    setFormCategoryId(product.categoryId || '')
    setFormBrand(product.brand || '')
    setFormStock(product.stock.toString())
    setFormMinStock(product.minStock.toString())
    setFormStatus(product.status)
    setFormImage(product.image || '')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim() || !formReference.trim() || !formPrice) {
      toast.error('Nom, référence et prix sont obligatoires')
      return
    }

    setSubmitting(true)
    try {
      if (editingProduct) {
        // Update
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
            name: formName,
            reference: formReference,
            price: formPrice,
            resellerPrice: formResellerPrice || null,
            description: formDescription || null,
            categoryId: formCategoryId || null,
            brand: formBrand || null,
            stock: parseInt(formStock, 10) || 0,
            minStock: formMinStock,
            status: formStatus,
            image: formImage || null,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erreur de mise à jour')
        }
        toast.success('Produit mis à jour avec succès')
      } else {
        // Create
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            reference: formReference,
            price: formPrice,
            resellerPrice: formResellerPrice || null,
            description: formDescription || null,
            categoryId: formCategoryId || null,
            brand: formBrand || null,
            stock: parseInt(formStock, 10) || 0,
            minStock: formMinStock,
            status: formStatus,
            image: formImage || null,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erreur de création')
        }
        toast.success('Produit créé avec succès')
      }

      setDialogOpen(false)
      resetForm()
      fetchProducts()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Produits</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Boxes className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produits Actifs</p>
                <p className="text-2xl font-bold">{activeProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Bas</p>
                <p className="text-2xl font-bold">{lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rupture</p>
                <p className="text-2xl font-bold">{outOfStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou référence..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Bas</SelectItem>
                  <SelectItem value="out">Rupture</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none h-9 w-9"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-none h-9 w-9"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setCategoryManagerOpen(true)}
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Catégories</span>
                <span className="sm:hidden">Catég.</span>
              </Button>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouveau Produit</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid or List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucun produit trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">Essayez de modifier vos filtres ou créez un nouveau produit.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEditDialog(product)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0 ${getProductInitialColor(product.name)}`}>
                    {product.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{product.reference}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditDialog(product)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Prix</span>
                    <span className="text-sm font-semibold">{formatCFA(product.price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stock</span>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${getStockBg(product.stock, product.minStock)}`}>
                      <span className={`font-semibold ${getStockColor(product.stock, product.minStock)}`}>
                        {product.stock}
                      </span>
                      <span className="text-muted-foreground">/ {product.minStock}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Catégorie</span>
                    <span className="text-xs">{product.category?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Statut</span>
                    <Badge
                      variant={product.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {product.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Img</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden sm:table-cell">Référence</TableHead>
                    <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead className="hidden lg:table-cell">Prix Rev.</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="hidden md:table-cell">Statut</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => openEditDialog(product)}
                    >
                      <TableCell>
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs ${getProductInitialColor(product.name)}`}>
                          {product.name.charAt(0).toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{product.reference}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {product.reference}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {product.category?.name || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatCFA(product.price)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {product.resellerPrice ? formatCFA(product.resellerPrice) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            product.stock === 0 ? 'bg-red-500' :
                            product.stock <= product.minStock ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className={`text-sm font-medium ${getStockColor(product.stock, product.minStock)}`}>
                            {product.stock}
                          </span>
                          <span className="text-xs text-muted-foreground">/ {product.minStock}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant={product.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {product.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(product)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* New/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm() } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Modifiez les informations du produit ci-dessous.'
                : 'Remplissez les informations pour créer un nouveau produit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Coca-Cola 33cl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Référence *</Label>
                <Input
                  id="reference"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="Ex: BOI-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix (CFA) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resellerPrice">Prix Revendeur (CFA)</Label>
                <Input
                  id="resellerPrice"
                  type="number"
                  value={formResellerPrice}
                  onChange={(e) => setFormResellerPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description du produit..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marque</Label>
                <Input
                  id="brand"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="Ex: Coca-Cola"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Quantité en stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">Nombre d'unités disponibles</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stock Minimum (alerte)</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(e.target.value)}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">Seuil d'alerte de stock bas</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image du produit</Label>
              <ImageUpload
                value={formImage}
                onChange={(url) => setFormImage(url)}
                label="Télécharger une image"
                folder="products"
                previewClassName="h-32"
              />
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="Ou coller une URL d'image..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onCategoriesChange={fetchCategories}
      />
    </div>
  )
}
