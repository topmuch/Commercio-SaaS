'use client'

import React, { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  PieChart as PieChartIcon,
  TrendingUp,
  Filter,
  Users,
  MapPin,
  Package,
  Target,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

const COLORS = [
  'oklch(0.45 0.12 255)',  // primary blue
  'oklch(0.65 0.2 55)',    // orange
  'oklch(0.6 0.15 150)',   // success green
  'oklch(0.65 0.15 310)',  // pink
  'oklch(0.75 0.15 70)',   // warning yellow
  'oklch(0.5 0.12 45)',    // brown
  'oklch(0.7 0.15 55)',    // light orange
  'oklch(0.55 0.1 150)',   // teal
]

const PIE_COLORS = [
  '#2563eb',
  '#f97316',
  '#16a34a',
  '#d946ef',
  '#eab308',
  '#6366f1',
  '#14b8a6',
  '#f43f5e',
]

// ── Report Types ──────────────────────────────────────────────────────

type ReportType =
  | 'commercial'
  | 'region'
  | 'product'
  | 'client'
  | 'top-products'
  | 'performance'

interface ReportTypeConfig {
  id: ReportType
  label: string
  description: string
  icon: React.ElementType
  chartType: 'bar' | 'pie' | 'line'
}

const reportTypes: ReportTypeConfig[] = [
  { id: 'commercial', label: 'Ventes par commercial', description: 'Analyse des ventes par chaque commercial', icon: Users, chartType: 'bar' },
  { id: 'region', label: 'Ventes par région', description: 'Répartition géographique des ventes', icon: MapPin, chartType: 'pie' },
  { id: 'product', label: 'Ventes par produit', description: 'Performance individuelle des produits', icon: Package, chartType: 'bar' },
  { id: 'client', label: 'Ventes par client', description: 'Contribution de chaque client', icon: Target, chartType: 'bar' },
  { id: 'top-products', label: 'Produits les plus vendus', description: 'Classement des meilleurs produits', icon: Trophy, chartType: 'bar' },
  { id: 'performance', label: 'Performance commerciaux', description: 'Tendance de performance mensuelle', icon: TrendingUp, chartType: 'line' },
]

// ── API Response Types ────────────────────────────────────────────────

interface SummaryCard {
  label: string
  value: string
  change: string
  up: boolean
}

interface ReportsApiResponse {
  chartData: Record<string, unknown>[]
  seriesKeys?: { key: string; name: string }[]
  summary: {
    cards: SummaryCard[]
  }
}

// ── Custom Tooltip ────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 10000
            ? formatCFA(entry.value)
            : entry.value.toLocaleString('fr-FR')}
        </p>
      ))}
    </div>
  )
}

// ── Chart Renderers ────────────────────────────────────────────────────

function CommercialBarChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="ventes" name="Ventes" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="objectif" name="Objectif" fill={COLORS[1]} radius={[4, 4, 0, 0]} opacity={0.5} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function RegionPieChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={140}
          paddingAngle={2}
          dataKey="value"
          label={({ name, value }) => `${name} (${value}%)`}
          labelLine={true}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value}%`, 'Part']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ProductBarChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="ventes" name="Ventes" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ClientBarChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="ventes" name="Ventes" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TopProductsBarChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="quantité" name="Quantité" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="CA" name="Chiffre d'affaires" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PerformanceLineChart({ data, seriesKeys }: { data: Record<string, unknown>[]; seriesKeys?: { key: string; name: string }[] }) {
  const keys = seriesKeys || []
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {keys.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Loading Skeletons ──────────────────────────────────────────────────

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('commercial')
  const [period, setPeriod] = useState('month')
  const [reportData, setReportData] = useState<ReportsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?type=${selectedReport}&period=${period}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors du chargement')
      }
      const json: ReportsApiResponse = await res.json()
      setReportData(json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
      toast.error('Erreur', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [selectedReport, period])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const handleExportPDF = () => {
    window.print()
  }

  const [exporting, setExporting] = useState(false)

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/reports?type=full&period=${period}`)
      if (!response.ok) throw new Error('Erreur lors du chargement des données')
      const data = await response.json()

      const wb = XLSX.utils.book_new()

      // Feuille 1 : Ventes par commercial
      if (data.salesByCommercial?.length) {
        const ws1 = XLSX.utils.json_to_sheet(data.salesByCommercial)
        XLSX.utils.book_append_sheet(wb, ws1, 'Ventes par commercial')
      }

      // Feuille 2 : Top produits
      if (data.topProducts?.length) {
        const ws2 = XLSX.utils.json_to_sheet(data.topProducts)
        XLSX.utils.book_append_sheet(wb, ws2, 'Top produits')
      }

      // Feuille 3 : Top clients
      if (data.topClients?.length) {
        const ws3 = XLSX.utils.json_to_sheet(data.topClients)
        XLSX.utils.book_append_sheet(wb, ws3, 'Top clients')
      }

      // Télécharger
      XLSX.writeFile(wb, `rapport-teranga-biz-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Rapport Excel téléchargé')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur export'
      toast.error('Erreur export', { description: msg })
    } finally {
      setExporting(false)
    }
  }

  const renderChart = () => {
    if (!reportData || !reportData.chartData?.length) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>Aucune donnée disponible pour cette période</p>
        </div>
      )
    }

    switch (selectedReport) {
      case 'commercial':
        return <CommercialBarChart data={reportData.chartData} />
      case 'region':
        return <RegionPieChart data={reportData.chartData} />
      case 'product':
        return <ProductBarChart data={reportData.chartData} />
      case 'client':
        return <ClientBarChart data={reportData.chartData} />
      case 'top-products':
        return <TopProductsBarChart data={reportData.chartData} />
      case 'performance':
        return <PerformanceLineChart data={reportData.chartData} seriesKeys={reportData.seriesKeys} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Report Type Selector ────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Types de rapports</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reportTypes.map((report) => {
            const Icon = report.icon
            const isSelected = selectedReport === report.id
            return (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all duration-150 hover:shadow-md ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 shadow-md'
                    : 'border-border/60 hover:border-primary/30'
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{report.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────── */}
      {loading ? (
        <SummaryCardsSkeleton />
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : reportData?.summary?.cards?.length ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {reportData.summary.cards.map((card, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
                <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                  card.up ? 'text-erp-success' : 'text-muted-foreground'
                }`}>
                  {card.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span>{card.change}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* ── Chart Area ──────────────────────────────────────── */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {reportTypes.find((r) => r.id === selectedReport)?.label}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Données réelles
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={period} onValueChange={(v) => setPeriod(v)}>
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="text-xs px-3 h-6">Semaine</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-3 h-6">Mois</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs px-3 h-6">Année</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>
      )}

      {/* ── Export Buttons ───────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Exporter le rapport &ldquo;{reportTypes.find((r) => r.id === selectedReport)?.label}&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
              <FileText className="h-4 w-4" />
              Exporter PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel} disabled={exporting}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? 'Export...' : 'Exporter Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
