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
  AlertTriangle,
  XCircle,
  Warehouse,
  TrendingDown,
  Loader2,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Product, StockMovement } from '@/lib/types'
import { toast } from 'sonner'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MovementTypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'entry':
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/20 hover:bg-green-500/20 gap-1">
          <ArrowDownCircle className="h-3 w-3" />
          Entrée
        </Badge>
      )
    case 'exit':
      return (
        <Badge className="bg-red-500/15 text-red-600 border-red-500/20 hover:bg-red-500/20 gap-1">
          <ArrowUpCircle className="h-3 w-3" />
          Sortie
        </Badge>
      )
    case 'adjustment':
      return (
        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/20 gap-1">
          <RefreshCw className="h-3 w-3" />
          Ajustement
        </Badge>
      )
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [movementType, setMovementType] = useState('entry')
  const [movementProduct, setMovementProduct] = useState('')
  const [movementQuantity, setMovementQuantity] = useState('')
  const [movementReason, setMovementReason] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100')
      if (res.ok) {
        const json = await res.json()
        setProducts(json.data || [])
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock?limit=50')
      if (res.ok) {
        const json = await res.json()
        setMovements(json.data || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des mouvements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  // Stock alerts
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
  const outOfStockProducts = products.filter((p) => p.stock === 0)

  // Chart data - top products by stock proximity to threshold
  const chartData = products
    .filter((p) => p.stock > 0 || p.minStock > 0)
    .sort((a, b) => {
      const aRatio = a.stock / a.minStock
      const bRatio = b.stock / b.minStock
      return aRatio - bRatio
    })
    .slice(0, 10)
    .map((p) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      fullName: p.name,
      stock: p.stock,
      minStock: p.minStock,
    }))

  const openMovementDialog = () => {
    setMovementType('entry')
    setMovementProduct('')
    setMovementQuantity('')
    setMovementReason('')
    setDialogOpen(true)
  }

  const handleCreateMovement = async () => {
    if (!movementProduct || !movementQuantity) {
      toast.error('Produit et quantité sont obligatoires')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: movementProduct,
          type: movementType,
          quantity: parseInt(movementQuantity),
          reason: movementReason || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de création')
      }
      toast.success('Mouvement de stock enregistré avec succès')
      setDialogOpen(false)
      fetchMovements()
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
      {/* Stock Alerts Panel */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Alertes de Stock</h2>
            <Badge variant="destructive" className="ml-2">
              {lowStockProducts.length + outOfStockProducts.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Out of stock */}
            {outOfStockProducts.map((product) => (
              <Card key={`out-${product.id}`} className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/15 shrink-0">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-red-700 dark:text-red-400 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{product.reference}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Stock actuel:</span>
                        <span className="text-sm font-bold text-red-600">{product.stock}</span>
                        <span className="text-xs text-muted-foreground">/ min: {product.minStock}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Low stock */}
            {lowStockProducts.map((product) => (
              <Card key={`low-${product.id}`} className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/15 shrink-0">
                      <TrendingDown className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{product.reference}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Stock actuel:</span>
                        <span className="text-sm font-bold text-yellow-600">{product.stock}</span>
                        <span className="text-xs text-muted-foreground">/ min: {product.minStock}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stock Overview Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Aperçu du Stock vs Stock Minimum
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label: string) => {
                      const item = chartData.find((d) => d.name === label)
                      return item?.fullName || label
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="stock"
                    name="Stock Actuel"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="minStock"
                    name="Stock Minimum"
                    fill="hsl(var(--muted-foreground) / 0.4)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Movement History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="h-5 w-5" />
            Historique des Mouvements de Stock
          </CardTitle>
          <Button onClick={openMovementDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau Mouvement</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucun mouvement de stock</p>
              <p className="text-sm text-muted-foreground mt-1">
                Créez un nouveau mouvement pour commencer à suivre le stock.
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="sm:hidden">Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead className="hidden md:table-cell">Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(movement.createdAt)}
                      </TableCell>
                      <TableCell className="sm:hidden text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(movement.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{movement.product?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{movement.product?.reference || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MovementTypeBadge type={movement.type} />
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold text-sm ${
                          movement.type === 'entry'
                            ? 'text-green-600'
                            : movement.type === 'exit'
                              ? 'text-red-600'
                              : 'text-blue-600'
                        }`}>
                          {movement.type === 'exit' ? '-' : '+'}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {movement.reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau Mouvement de Stock</DialogTitle>
            <DialogDescription>
              Enregistrez une entrée, sortie ou ajustement de stock.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mov-product">Produit *</Label>
              <Select value={movementProduct} onValueChange={setMovementProduct}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un produit..." />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span>{p.name}</span>
                        <span className="text-muted-foreground ml-2">({p.reference})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mov-type">Type *</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">
                      <span className="flex items-center gap-1.5">
                        <ArrowDownCircle className="h-3.5 w-3.5 text-green-500" />
                        Entrée
                      </span>
                    </SelectItem>
                    <SelectItem value="exit">
                      <span className="flex items-center gap-1.5">
                        <ArrowUpCircle className="h-3.5 w-3.5 text-red-500" />
                        Sortie
                      </span>
                    </SelectItem>
                    <SelectItem value="adjustment">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                        Ajustement
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov-quantity">Quantité *</Label>
                <Input
                  id="mov-quantity"
                  type="number"
                  value={movementQuantity}
                  onChange={(e) => setMovementQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mov-reason">Motif (optionnel)</Label>
              <Input
                id="mov-reason"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ex: Livraison fournisseur, Inventaire..."
              />
            </div>

            {/* Product stock info */}
            {movementProduct && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Stock actuel:</span>
                  <span className="font-semibold">
                    {products.find((p) => p.id === movementProduct)?.stock || 0}
                  </span>
                  <span className="text-muted-foreground">/ Min:</span>
                  <span className="font-semibold">
                    {products.find((p) => p.id === movementProduct)?.minStock || 0}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateMovement} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
