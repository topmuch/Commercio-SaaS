'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  Code2,
  FileText,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────

type Scope =
  | 'clients:read'
  | 'clients:write'
  | 'products:read'
  | 'products:write'
  | 'orders:read'
  | 'orders:write'
  | 'quotes:read'
  | 'quotes:write'
  | 'invoices:read'
  | 'invoices:write'
  | 'reports:read'

interface ApiKey {
  id: string
  name: string
  key: string
  scopes: Scope[]
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

interface NewKeyData {
  name: string
  scopes: Scope[]
  expiresAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────

const SCOPE_GROUPS: Record<string, Scope[]> = {
  Clients: ['clients:read', 'clients:write'],
  Produits: ['products:read', 'products:write'],
  Commandes: ['orders:read', 'orders:write'],
  Devis: ['quotes:read', 'quotes:write'],
  Factures: ['invoices:read', 'invoices:write'],
  Rapports: ['reports:read'],
}

const SCOPE_LABELS: Record<Scope, string> = {
  'clients:read': 'Lire les clients',
  'clients:write': 'Modifier les clients',
  'products:read': 'Lire les produits',
  'products:write': 'Modifier les produits',
  'orders:read': 'Lire les commandes',
  'orders:write': 'Modifier les commandes',
  'quotes:read': 'Lire les devis',
  'quotes:write': 'Modifier les devis',
  'invoices:read': 'Lire les factures',
  'invoices:write': 'Modifier les factures',
  'reports:read': 'Lire les rapports',
}

function formatDate(date: string | null): string {
  if (!date) return 'Jamais'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatExpiration(date: string | null): string {
  if (!date) return 'Jamais'
  const expDate = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Expiré'
  if (diffDays === 0) return 'Aujourd\'hui'
  if (diffDays === 1) return 'Demain'
  if (diffDays < 7) return `${diffDays} jours`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semaines`
  return `${Math.floor(diffDays / 30)} mois`
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text)
  toast.success('Clé copiée dans le presse-papiers')
}

// ── API Documentation ───────────────────────────────────────────────────

function ApiDocumentation() {
  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/clients',
      description: 'Lister tous les clients',
      scopes: ['clients:read'],
    },
    {
      method: 'POST',
      path: '/api/v1/clients',
      description: 'Créer un nouveau client',
      scopes: ['clients:write'],
    },
    {
      method: 'GET',
      path: '/api/v1/products',
      description: 'Lister tous les produits',
      scopes: ['products:read'],
    },
    {
      method: 'POST',
      path: '/api/v1/orders',
      description: 'Créer une commande',
      scopes: ['orders:write'],
    },
    {
      method: 'GET',
      path: '/api/v1/invoices',
      description: 'Lister toutes les factures',
      scopes: ['invoices:read'],
    },
    {
      method: 'GET',
      path: '/api/v1/reports',
      description: 'Rapports de vente',
      scopes: ['reports:read'],
    },
  ]

  const exampleCode = `// Exemple d'utilisation avec fetch
const response = await fetch('https://votre-domaine.com/api/v1/clients', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer cp_votre_cle_api',
    'Content-Type': 'application/json',
  },
})

const data = await response.json()
console.log(data.clients)`

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Comment utiliser l'API
        </h3>
        <Card>
          <CardHeader>
            <CardDescription>
              Incluez votre clé API dans l'en-tête Authorization avec le préfixe "Bearer"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                {exampleCode}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          Endpoints disponibles
        </h3>
        <div className="space-y-2">
          {endpoints.map((endpoint, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        endpoint.method === 'GET'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
                  </div>
                  <div className="text-sm text-muted-foreground flex-1 text-right">
                    {endpoint.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-muted px-3 py-2 rounded-lg">
              https://votre-domaine.com/api/v1
            </code>
          </div>
          <CardDescription className="mt-2">
            Toutes les requêtes doivent inclure l'en-tête Authorization avec votre clé API.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Create Key Dialog ───────────────────────────────────────────────────

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: NewKeyData) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<Scope[]>([])
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculateExpiryDate = (): string | null => {
    if (expiresIn === 'never') return null
    const now = new Date()
    const days = parseInt(expiresIn, 10)
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
  }

  const handleScopeToggle = (scope: Scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Veuillez entrer un nom pour la clé')
      return
    }

    if (selectedScopes.length === 0) {
      toast.error('Sélectionnez au moins une permission')
      return
    }

    setIsSubmitting(true)
    try {
      const expiresAt = calculateExpiryDate()
      await onCreate({ name, scopes: selectedScopes, expiresAt })
      setName('')
      setSelectedScopes([])
      setExpiresIn('never')
      onOpenChange(false)
      toast.success('Clé API créée avec succès')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error('Erreur', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle clé API</DialogTitle>
          <DialogDescription>
            Générez une clé pour connecter vos applications externes.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">Nom de la clé *</Label>
              <Input
                id="key-name"
                placeholder="Ex: Application mobile, Site web..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label>Permissions *</Label>
              <div className="mt-2 space-y-3">
                {Object.entries(SCOPE_GROUPS).map(([group, scopes]) => (
                  <Card key={group} className="p-3">
                    <h4 className="font-medium text-sm mb-2">{group}</h4>
                    <div className="space-y-2">
                      {scopes.map((scope) => (
                        <div key={scope} className="flex items-center space-x-2">
                          <Checkbox
                            id={scope}
                            checked={selectedScopes.includes(scope)}
                            onCheckedChange={() => handleScopeToggle(scope)}
                            disabled={isSubmitting}
                          />
                          <Label htmlFor={scope} className="text-sm cursor-pointer">
                            {SCOPE_LABELS[scope]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label>Expiration</Label>
              <div className="mt-2 space-y-2">
                {[
                  { value: 'never', label: 'Jamais' },
                  { value: '30', label: '30 jours' },
                  { value: '90', label: '90 jours' },
                  { value: '365', label: '1 an' },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exp-${option.value}`}
                      checked={expiresIn === option.value}
                      onCheckedChange={() => setExpiresIn(option.value)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={`exp-${option.value}`} className="text-sm cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer la clé'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── New Key Display Dialog ───────────────────────────────────────────────

function NewKeyDisplayDialog({
  open,
  onOpenChange,
  apiKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string | null
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (apiKey) {
      copyToClipboard(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Clé API créée avec succès
          </DialogTitle>
          <DialogDescription>
            Sauvegardez cette clé maintenant. Vous ne pourrez plus la voir par la suite.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-2 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs font-medium">Votre clé API</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={apiKey || ''}
                  readOnly
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Important</p>
                <p className="text-amber-800 mt-1">
                  Stockez cette clé en lieu sûr. Si vous la perdez, vous devrez en créer une nouvelle.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => onOpenChange(false)} className="w-full">
          J'ai sauvegardé ma clé
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// ── API Key Card Component ─────────────────────────────────────────────

function ApiKeyCard({
  apiKey,
  onDelete,
  onToggle,
}: {
  apiKey: ApiKey
  onDelete: (id: string) => Promise<void>
  onToggle: (id: string, isActive: boolean) => Promise<void>
}) {
  const [showKey, setShowKey] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette clé API ? Cette action est irréversible.')) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(apiKey.id)
      toast.success('Clé API supprimée')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur'
      toast.error('Erreur', { description: msg })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggle(apiKey.id, !apiKey.isActive)
      toast.success(apiKey.isActive ? 'Clé désactivée' : 'Clé activée')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur'
      toast.error('Erreur', { description: msg })
    } finally {
      setIsToggling(false)
    }
  }

  const expiryStatus = formatExpiration(apiKey.expiresAt)
  const isExpired = expiryStatus === 'Expiré'

  return (
    <Card className={`${isExpired ? 'opacity-60 border-muted' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              {apiKey.name}
            </CardTitle>
            <CardDescription className="mt-1">
              Créée le {formatDate(apiKey.createdAt)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {apiKey.isActive ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                Désactivée
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Display */}
        <div>
          <Label className="text-xs">Clé API</Label>
          <div className="mt-1.5 flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey.key}
                readOnly
                className="font-mono text-sm bg-muted pr-10"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-2"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(apiKey.key)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scopes */}
        <div>
          <Label className="text-xs">Permissions</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {apiKey.scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="text-xs">
                {SCOPE_LABELS[scope]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Dernière utilisation: {formatDate(apiKey.lastUsedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>Expire: {expiryStatus}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleToggle}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : apiKey.isActive ? (
              'Désactiver'
            ) : (
              'Activer'
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting || isToggling}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [isEnterprise, setIsEnterprise] = useState(false)

  const fetchApiKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/api-keys')

      if (!res.ok) {
        const json = await res.json()
        if (res.status === 403) {
          setIsEnterprise(false)
          return
        }
        throw new Error(json.error || 'Erreur lors du chargement')
      }

      const json = await res.json()
      setApiKeys(json.data || [])
      setIsEnterprise(true)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      toast.error('Erreur', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCreateKey = async (data: NewKeyData) => {
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la création')
      }

      const json = await res.json()
      setNewApiKey(json.data.key)
      setNewKeyDialogOpen(true)
      await fetchApiKeys()
    } catch (error: unknown) {
      throw error
    }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la suppression')
      }

      await fetchApiKeys()
    } catch (error: unknown) {
      throw error
    }
  }

  const handleToggleKey = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la mise à jour')
      }

      await fetchApiKeys()
    } catch (error: unknown) {
      throw error
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  if (!isEnterprise) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Key className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Accès API</h2>
            <p className="text-xs text-muted-foreground">Plan Enterprise requis</p>
          </div>
        </div>

        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Fonctionnalité Enterprise</h3>
            <p className="text-sm text-muted-foreground mb-4">
              L'accès API est disponible uniquement avec le plan Enterprise.
              Connectez vos applications et automatisez vos processus.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/subscription'}>
              Voir les plans
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Clés API</h2>
            <p className="text-xs text-muted-foreground">Gérez vos accès API</p>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle clé
            </Button>
          </DialogTrigger>
          <CreateKeyDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreate={handleCreateKey}
          />
        </Dialog>
      </div>

      {/* ── API Keys List ─────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Aucune clé API</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre première clé API pour commencer à intégrer Commercio avec vos applications.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une clé API
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apiKeys.map((apiKey) => (
            <ApiKeyCard
              key={apiKey.id}
              apiKey={apiKey}
              onDelete={handleDeleteKey}
              onToggle={handleToggleKey}
            />
          ))}
        </div>
      )}

      {/* ── API Documentation ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentation API
          </CardTitle>
          <CardDescription>
            Guide pour intégrer l'API Commercio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiDocumentation />
        </CardContent>
      </Card>

      {/* ── New Key Display Dialog ─────────────────────── */}
      <NewKeyDisplayDialog
        open={newKeyDialogOpen}
        onOpenChange={setNewKeyDialogOpen}
        apiKey={newApiKey}
      />
    </div>
  )
}