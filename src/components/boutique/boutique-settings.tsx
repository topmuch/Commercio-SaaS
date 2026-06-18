'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Upload,
  Trash2,
  Save,
  Plus,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Palette,
  Store,
  Megaphone,
} from 'lucide-react'

// ===== TYPES =====
interface StoreSettings {
  id: string
  storeTitle: string
  storeDescription?: string
  whatsappNumber?: string
  publicSlug?: string
  logoUrl?: string
  primaryColor: string
  isActive: boolean
}

interface Banner {
  id: string
  imageUrl: string
  title?: string
  subtitle?: string
  linkUrl?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
}

interface BannerFormData {
  imageUrl: string
  title: string
  subtitle: string
  linkUrl: string
  displayOrder: number
  isActive: boolean
}

const emptyBannerForm: BannerFormData = {
  imageUrl: '',
  title: '',
  subtitle: '',
  linkUrl: '',
  displayOrder: 0,
  isActive: true,
}

// ===== MAIN COMPONENT =====
export default function BoutiqueSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannersLoading, setBannersLoading] = useState(true)

  // Form state for store info
  const [storeTitle, setStoreTitle] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#10B981')
  const [storeDescription, setStoreDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Banner dialog state
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [bannerForm, setBannerForm] = useState<BannerFormData>(emptyBannerForm)
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bannerDeleting, setBannerDeleting] = useState<string | null>(null)

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoDragRef = useRef<HTMLDivElement>(null)

  // Load settings and banners
  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/store-settings')
      if (!res.ok) throw new Error('Erreur de chargement')
      const json = await res.json()
      const data = json.data as StoreSettings
      setSettings(data)
      setStoreTitle(data.storeTitle)
      setWhatsappNumber(data.whatsappNumber || '')
      setPrimaryColor(data.primaryColor || '#10B981')
      setStoreDescription(data.storeDescription || '')
      setLogoUrl(data.logoUrl || '')
    } catch {
      toast.error('Impossible de charger les paramètres de la boutique')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBanners = useCallback(async () => {
    setBannersLoading(true)
    try {
      const res = await fetch('/api/store/banners')
      if (!res.ok) throw new Error('Erreur de chargement')
      const json = await res.json()
      setBanners(json.data || [])
    } catch {
      toast.error('Impossible de charger les bannières')
    } finally {
      setBannersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadBanners()
  }, [loadSettings, loadBanners])

  // ===== LOGO UPLOAD =====
  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'boutique')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur d'upload")
      }
      const { url } = await res.json()
      setLogoUrl(url)

      // Also save to backend immediately
      try {
        const saveRes = await fetch('/api/store-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoUrl: url }),
        })
        if (!saveRes.ok) {
          const err = await saveRes.json()
          console.error('[Logo save] Backend error:', err.error)
        }
      } catch (saveErr) {
        console.error('[Logo save] Network error:', saveErr)
      }
      toast.success('Logo téléchargé avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement du logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file)
    }
  }, [])

  const handleLogoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleLogoDelete = async () => {
    setLogoUrl('')
    try {
      await fetch('/api/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: '' }),
      })
      toast.success('Logo supprimé')
    } catch {
      toast.error("Erreur lors de la suppression du logo")
    }
  }

  // ===== BANNER UPLOAD =====
  const handleBannerImageUpload = async (file: File) => {
    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'boutique')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur d'upload")
      }
      const { url } = await res.json()
      setBannerForm((prev) => ({ ...prev, imageUrl: url }))
      toast.success('Image téléchargée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement de l'image")
    } finally {
      setUploadingBanner(false)
    }
  }

  // ===== SAVE STORE SETTINGS =====
  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeTitle,
          whatsappNumber,
          primaryColor,
          storeDescription,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de sauvegarde')
      }
      const json = await res.json()
      setSettings(json.data)
      toast.success('Paramètres sauvegardés avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ===== BANNER CRUD =====
  const openBannerDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner)
      setBannerForm({
        imageUrl: banner.imageUrl,
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        linkUrl: banner.linkUrl || '',
        displayOrder: banner.displayOrder,
        isActive: banner.isActive,
      })
    } else {
      setEditingBanner(null)
      setBannerForm({ ...emptyBannerForm, displayOrder: banners.length })
    }
    setBannerDialogOpen(true)
  }

  const handleBannerSave = async () => {
    if (!bannerForm.imageUrl) {
      toast.error("L'image de la bannière est requise")
      return
    }

    setBannerSaving(true)
    try {
      const res = await fetch('/api/store/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerForm),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de sauvegarde')
      }
      toast.success(editingBanner ? 'Bannière mise à jour' : 'Bannière créée avec succès')
      setBannerDialogOpen(false)
      loadBanners()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setBannerSaving(false)
    }
  }

  const handleBannerDelete = async (id: string) => {
    setBannerDeleting(id)
    try {
      const res = await fetch(`/api/store/banners/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de suppression')
      }
      toast.success('Bannière supprimée')
      loadBanners()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setBannerDeleting(null)
    }
  }

  const toggleBannerActive = async (banner: Banner) => {
    try {
      // Delete and re-create with new active state (since no PUT endpoint)
      await fetch(`/api/store/banners/${banner.id}`, { method: 'DELETE' })
      const res = await fetch('/api/store/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...banner,
          isActive: !banner.isActive,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast.success(`Bannière ${banner.isActive ? 'désactivée' : 'activée'}`)
      loadBanners()
    } catch {
      toast.error("Erreur lors du changement de statut")
    }
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Store className="h-6 w-6 text-orange-500" />
          Paramètres de la Boutique
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez l&apos;identité visuelle, les informations et les promotions de votre boutique publique.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visual-identity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="visual-identity" className="flex items-center gap-1.5">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Identité Visuelle</span>
          </TabsTrigger>
          <TabsTrigger value="store-info" className="flex items-center gap-1.5">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Informations</span>
          </TabsTrigger>
          <TabsTrigger value="banners" className="flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Bannières</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: Visual Identity ===== */}
        <TabsContent value="visual-identity">
          <Card>
            <CardHeader>
              <CardTitle>Identité Visuelle</CardTitle>
              <CardDescription>
                Personnalisez le logo de votre boutique publique.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Logo Upload Area */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Logo de la boutique</Label>

                  <div
                    ref={logoDragRef}
                    onDrop={handleLogoDrop}
                    onDragOver={handleLogoDragOver}
                    onClick={() => logoInputRef.current?.click()}
                    className={`
                      relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
                      transition-all cursor-pointer overflow-hidden
                      ${logoUrl
                        ? 'border-border bg-muted/30 min-h-[220px]'
                        : 'border-muted-foreground/25 hover:border-orange-400/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 min-h-[220px]'
                      }
                    `}
                  >
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                        e.target.value = ''
                      }}
                    />

                    {uploadingLogo ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
                      </div>
                    ) : logoUrl ? (
                      <div className="relative flex flex-col items-center gap-4 p-6">
                        <img
                          src={logoUrl}
                          alt="Logo boutique"
                          className="max-h-40 max-w-[280px] object-contain rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Aperçu
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLogoDelete()
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">
                            Glissez-déposez ou cliquez pour charger
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG ou WebP (max. 5 MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 2: Store Info ===== */}
        <TabsContent value="store-info">
          <Card>
            <CardHeader>
              <CardTitle>Informations Boutique</CardTitle>
              <CardDescription>
                Configurez les informations affichées sur votre boutique publique.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Store Title */}
              <div className="space-y-2">
                <Label htmlFor="storeTitle">Nom de la boutique</Label>
                <Input
                  id="storeTitle"
                  placeholder="Ex: DistribuSN Boutique"
                  value={storeTitle}
                  onChange={(e) => setStoreTitle(e.target.value)}
                />
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Numéro WhatsApp</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">+221</span>
                  <Input
                    id="whatsapp"
                    placeholder="77 000 00 00"
                    value={whatsappNumber.replace('+221', '')}
                    onChange={(e) => setWhatsappNumber(`+221${e.target.value}`)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Numéro complet avec l&apos;indicatif +221
                </p>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur principale</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-32 font-mono"
                    placeholder="#10B981"
                  />
                  <div
                    className="h-10 w-10 rounded-md border shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description de la boutique</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre boutique en quelques phrases..."
                  rows={4}
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {storeDescription.length}/500 caractères
                </p>
              </div>

              {/* Public URL */}
              <div className="space-y-2">
                <Label>URL publique de la boutique</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={settings?.publicSlug ? `/boutique/${settings.publicSlug}` : '/boutique/...'}
                    readOnly
                    className="font-mono bg-muted"
                  />
                  {settings?.publicSlug && (
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                      aria-label="Ouvrir la boutique"
                    >
                      <a href={`/boutique/${settings.publicSlug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Modifiez le slug dans les paramètres généraux.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="min-w-[140px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 3: Banners ===== */}
        <TabsContent value="banners">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Promotions / Bannières</CardTitle>
                <CardDescription>
                  Gérez les bannières de promotion affichées sur votre boutique.
                </CardDescription>
              </div>
              <Button onClick={() => openBannerDialog()} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {bannersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : banners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium">Aucune bannière</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Ajoutez des bannières promotionnelles pour votre boutique.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => openBannerDialog()}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Ajouter une bannière
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {banners
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((banner) => (
                      <div
                        key={banner.id}
                        className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        {/* Thumbnail */}
                        <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title || 'Bannière'}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {banner.title || 'Sans titre'}
                            </p>
                            <Badge
                              variant={banner.isActive ? 'default' : 'secondary'}
                              className="text-[10px] h-5 shrink-0"
                            >
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {banner.subtitle && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {banner.subtitle}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Ordre : {banner.displayOrder}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleBannerActive(banner)}
                            aria-label={banner.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {banner.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openBannerDialog(banner)}
                            aria-label="Modifier"
                          >
                            <Store className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleBannerDelete(banner.id)}
                            disabled={bannerDeleting === banner.id}
                            aria-label="Supprimer"
                          >
                            {bannerDeleting === banner.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== BANNER DIALOG ===== */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? 'Modifier la bannière' : 'Ajouter une bannière'}
            </DialogTitle>
            <DialogDescription>
              Configurez l&apos;image et les informations de la bannière de promotion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Banner Image Upload */}
            <div className="space-y-2">
              <Label>Image de la bannière</Label>
              {bannerForm.imageUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={bannerForm.imageUrl}
                    alt="Bannière"
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-7 text-xs"
                    onClick={() => setBannerForm((prev) => ({ ...prev, imageUrl: '' }))}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Changer
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-orange-400/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 cursor-pointer min-h-[140px] transition-all"
                >
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleBannerImageUpload(file)
                      e.target.value = ''
                    }}
                  />
                  {uploadingBanner ? (
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {uploadingBanner ? 'Téléchargement...' : 'Cliquez pour charger une image'}
                  </p>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="banner-title">Titre (optionnel)</Label>
              <Input
                id="banner-title"
                placeholder="Ex: Soldes de fin d'année"
                value={bannerForm.title}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="banner-subtitle">Sous-titre (optionnel)</Label>
              <Input
                id="banner-subtitle"
                placeholder="Ex: Jusqu'à -50% sur tous les produits"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>

            {/* Link URL */}
            <div className="space-y-2">
              <Label htmlFor="banner-link">Lien URL (optionnel)</Label>
              <Input
                id="banner-link"
                placeholder="https://example.com/promo"
                value={bannerForm.linkUrl}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              />
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="banner-order">Ordre d&apos;affichage</Label>
              <Input
                id="banner-order"
                type="number"
                min={0}
                value={bannerForm.displayOrder}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, displayOrder: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Bannière active</Label>
                <p className="text-xs text-muted-foreground">
                  Les bannières inactives ne sont pas visibles sur la boutique
                </p>
              </div>
              <Switch
                checked={bannerForm.isActive}
                onCheckedChange={(checked) =>
                  setBannerForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setBannerDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleBannerSave}
              disabled={bannerSaving || !bannerForm.imageUrl}
            >
              {bannerSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingBanner ? 'Mettre à jour' : 'Créer la bannière'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
