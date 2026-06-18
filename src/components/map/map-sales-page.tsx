'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Map,
  TrendingUp,
  TrendingDown,
  BarChart3,
  MapPin,
  Trophy,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface RegionSale {
  name: string
  revenue: number
  clientCount: number
  orderCount: number
  avgRevenue: number
}

interface CommercialSale {
  name: string
  revenue: number
  orderCount: number
}

interface MonthlyTrend {
  month: string
  revenue: number
  label: string
}

function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

function getHeatColor(revenue: number, maxRevenue: number): string {
  if (maxRevenue === 0) return 'bg-gray-100 dark:bg-gray-800 text-muted-foreground'
  const ratio = revenue / maxRevenue
  if (ratio > 0.6) return 'bg-emerald-700 text-white'
  if (ratio > 0.4) return 'bg-emerald-600 text-white'
  if (ratio > 0.25) return 'bg-emerald-500 text-white'
  if (ratio > 0.1) return 'bg-emerald-300 dark:bg-emerald-700 text-white dark:text-emerald-100'
  return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />
  if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-700" />
  return <span className="h-4 w-4 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank}</span>
}

// ====== HEATMAP GRID ======
function HeatmapGrid({ regions }: { regions: RegionSale[] }) {
  const maxRevenue = Math.max(...regions.map((r) => r.revenue), 1)

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Map className="h-4 w-4 text-muted-foreground" />
          Heatmap des Ventes par Région
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {regions.map((region) => (
            <div
              key={region.name}
              className={`rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${getHeatColor(region.revenue, maxRevenue)}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                <h4 className="text-sm font-bold truncate">{region.name}</h4>
              </div>
              <p className="text-lg font-bold">{formatCFA(region.revenue)}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] opacity-80">
                <span>{region.clientCount} clients</span>
                <span>{region.orderCount} cmd</span>
              </div>
              {/* Mini bar */}
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full"
                  style={{ width: `${Math.min((region.revenue / maxRevenue) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Intensité:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 rounded bg-gray-100 dark:bg-gray-800" />
            <span className="text-[10px] text-muted-foreground">Nul</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 rounded bg-emerald-100 dark:bg-emerald-900" />
            <span className="text-[10px] text-muted-foreground">Faible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 rounded bg-emerald-400" />
            <span className="text-[10px] text-muted-foreground">Moyen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 rounded bg-emerald-700" />
            <span className="text-[10px] text-muted-foreground">Élevé</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ====== REGION RANKINGS TABLE ======
function RegionRankings({ regions }: { regions: RegionSale[] }) {
  const maxRevenue = Math.max(...regions.map((r) => r.revenue), 1)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Classement des Régions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-xs">#</TableHead>
              <TableHead className="text-xs">Région</TableHead>
              <TableHead className="text-xs text-right">CA</TableHead>
              <TableHead className="text-xs text-right hidden sm:table-cell">Clients</TableHead>
              <TableHead className="text-xs text-right hidden sm:table-cell">Commandes</TableHead>
              <TableHead className="w-32 text-xs hidden md:table-cell">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((region, index) => (
              <TableRow key={region.name}>
                <TableCell className="py-2.5">{getRankIcon(index + 1)}</TableCell>
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{region.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right">
                  <span className="text-sm font-bold text-emerald-600">{formatCFA(region.revenue)}</span>
                </TableCell>
                <TableCell className="py-2.5 text-right hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">{region.clientCount}</span>
                </TableCell>
                <TableCell className="py-2.5 text-right hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">{region.orderCount}</span>
                </TableCell>
                <TableCell className="py-2.5 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(region.revenue / maxRevenue) * 100}
                      className="h-2 flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">
                      {Math.round((region.revenue / maxRevenue) * 100)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ====== PERFORMANCE INDICATORS ======
function PerformanceIndicators({
  totalRevenue,
  avgRevenuePerZone,
  bestZone,
  worstZone,
}: {
  totalRevenue: number
  avgRevenuePerZone: number
  bestZone: RegionSale | null
  worstZone: RegionSale | null
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Best Zone */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Meilleure zone</p>
              <p className="text-sm font-bold text-foreground truncate">
                {bestZone?.name || '—'}
              </p>
              <p className="text-xs font-semibold text-emerald-600">
                {bestZone ? formatCFA(bestZone.revenue) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worst Zone */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30">
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Zone à améliorer</p>
              <p className="text-sm font-bold text-foreground truncate">
                {worstZone?.name || '—'}
              </p>
              <p className="text-xs font-semibold text-red-500">
                {worstZone ? formatCFA(worstZone.revenue) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/30">
              <BarChart3 className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">CA moyen / zone</p>
              <p className="text-sm font-bold text-foreground">
                {formatCFA(avgRevenuePerZone)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ====== COMMERCIAL RANKING ======
function CommercialRanking({ commercialSales }: { commercialSales: CommercialSale[] }) {
  if (commercialSales.length === 0) return null

  const maxRevenue = Math.max(...commercialSales.map((c) => c.revenue), 1)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Classement Commerciaux
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 space-y-3">
        {commercialSales.map((c, index) => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getRankIcon(index + 1)}
                <span className="text-sm font-medium text-foreground">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600">{formatCFA(c.revenue)}</span>
                <span className="text-[10px] text-muted-foreground">({c.orderCount} cmd)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={(c.revenue / maxRevenue) * 100}
                className="h-2 flex-1"
              />
              <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">
                {Math.round((c.revenue / maxRevenue) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ====== MONTHLY TREND ======
function MonthlyTrend({ trend }: { trend: MonthlyTrend[] }) {
  if (trend.length === 0) return null

  const maxRevenue = Math.max(...trend.map((t) => t.revenue), 1)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-500" />
          Tendance Mensuelle
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4">
        <div className="flex items-end gap-2 h-32">
          {trend.map((item) => {
            const height = Math.max((item.revenue / maxRevenue) * 100, 4)
            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-medium">
                  {formatCFA(item.revenue)}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-md transition-all duration-500 hover:from-violet-700 hover:to-violet-500"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ====== MAIN PAGE ======
export default function MapSalesPage() {
  const { data, isLoading } = useQuery<{
    data: {
      regionSales: RegionSale[]
      totalRevenue: number
      avgRevenuePerZone: number
      bestZone: RegionSale | null
      worstZone: RegionSale | null
      commercialSales: CommercialSale[]
      monthlyTrend: MonthlyTrend[]
      totalOrders: number
    }
    count: number
  }>({
    queryKey: ['map-sales'],
    queryFn: () => fetch('/api/map/sales').then((r) => r.json()),
  })

  const regionSales = data?.data?.regionSales || []
  const totalRevenue = data?.data?.totalRevenue || 0
  const avgRevenuePerZone = data?.data?.avgRevenuePerZone || 0
  const bestZone = data?.data?.bestZone || null
  const worstZone = data?.data?.worstZone || null
  const commercialSales = data?.data?.commercialSales || []
  const monthlyTrend = data?.data?.monthlyTrend || []

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-6 w-6 text-erp-orange" />
            Carte des Ventes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse géographique de vos ventes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs">
            CA Total: {formatCFA(totalRevenue)}
          </Badge>
        </div>
      </div>

      {/* Performance Indicators */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <PerformanceIndicators
          totalRevenue={totalRevenue}
          avgRevenuePerZone={avgRevenuePerZone}
          bestZone={bestZone}
          worstZone={worstZone}
        />
      )}

      {/* Heatmap */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <HeatmapGrid regions={regionSales} />
      )}

      {/* Region Rankings + Commercial Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </>
        ) : (
          <>
            <RegionRankings regions={regionSales} />
            <div className="space-y-4">
              <CommercialRanking commercialSales={commercialSales} />
              {monthlyTrend.length > 0 && <MonthlyTrend trend={monthlyTrend} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
