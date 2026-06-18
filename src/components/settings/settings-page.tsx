'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Building2,
  Palette,
  Bell,
  Shield,
  Camera,
  Mail,
  Phone,
  MapPin,
  Upload,
  AlertTriangle,
  Moon,
  Sun,
  Save,
  Store,
  QrCode,
  Copy,
  ExternalLink,
  Check,
  Link2,
  MessageCircle,
  Loader2,
  RefreshCw,
  Globe,
  Search,
  AtSign,
  Server,
  Lock,
  PenLine,
  Download,
  Printer,
  Share2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import StoreQRCode from '@/components/boutique/store-qr-code'
import BoutiqueQRCode from '@/components/boutique/boutique-qr-code'
import { ImageUpload } from '@/components/ui/image-upload'

// ── Section Description ────────────────────────────────────────────
function Desc({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

// ── Section Header ────────────────────────────────────────────────
function SectionHeader({
  icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  description: string
}) {
  return (
    <CardHeader>
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
          {React.cloneElement(icon as React.ReactElement<Record<string, unknown>>, {
            className: cn('h-4 w-4', iconColor),
          })}
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  )
}

// ── Save Button ─────────────────────────────────────────────────────
function SaveBtn({
  loading,
  onClick,
  label = 'Sauvegarder',
}: {
  loading: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <div className="flex justify-end pt-2">
      <Button size="sm" className="gap-1.5" onClick={onClick} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {label}
      </Button>
    </div>
  )
}

// ── Store Settings type ───────────────────────────────────────────
interface StoreSettingsData {
  whatsappNumber?: string | null
  storeTitle?: string
  storeDescription?: string | null
  currency?: string
  isActive?: boolean
  publicSlug?: string | null
  companyLogo?: string | null
  companyName?: string | null
  companyAddress?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoImage?: string | null
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUser?: string | null
  smtpPass?: string | null
  emailFrom?: string | null
  emailSignature?: string | null
}

// ═══════════════════════════════════════════════════════════════════
// 1. ENTREPRISE SECTION
// ═══════════════════════════════════════════════════════════════════
function CompanySection({
  data,
  onChange,
  saving,
  onSave,
}: {
  data: StoreSettingsData
  onChange: (field: string, value: string) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <Card>
      <SectionHeader
        icon={<Building2 />}
        iconBg="bg-erp-orange/10"
        iconColor="text-erp-orange"
        title="Informations de l'entreprise"
        description="Nom, logo, adresse de votre société"
      />
      <CardContent className="space-y-6">
        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Logo de l&apos;entreprise</Label>
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {data.companyLogo ? (
                <div className="h-20 w-20 rounded-xl border border-border overflow-hidden shadow-sm">
                  <img
                    src={data.companyLogo}
                    alt="Logo"
                    className="h-full w-full object-contain bg-white p-1"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-erp-orange to-erp-orange/80 text-white font-bold text-2xl shadow-sm">
                  {(data.companyName || 'T').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <ImageUpload
                value={data.companyLogo || ''}
                onChange={(url) => onChange('companyLogo', url)}
                label="Cliquer pour importer le logo"
                folder="logos"
                className="max-w-sm"
                previewClassName="h-24"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-xs font-medium">
              Nom de l&apos;entreprise
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company-name"
                className="pl-9"
                placeholder="Ex: Teranga Biz SARL"
                value={data.companyName || ''}
                onChange={(e) => onChange('companyName', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-phone" className="text-xs font-medium">
              Téléphone
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company-phone"
                className="pl-9"
                placeholder="+221 33 123 45 67"
                value={data.whatsappNumber || ''}
                onChange={(e) => onChange('whatsappNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company-address" className="text-xs font-medium">
              Adresse
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company-address"
                className="pl-9"
                placeholder="45 Rue Carnot, Plateau, Dakar, Sénégal"
                value={data.companyAddress || ''}
                onChange={(e) => onChange('companyAddress', e.target.value)}
              />
            </div>
          </div>
        </div>

        <SaveBtn loading={saving} onClick={onSave} label="Sauvegarder l'entreprise" />
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 2. BOUTIQUE PUBLIQUE SECTION
// ═══════════════════════════════════════════════════════════════════
function BoutiqueShareSection({
  data,
  onChange,
  saving,
  onSave,
}: {
  data: StoreSettingsData
  onChange: (field: string, value: string | boolean) => void
  saving: boolean
  onSave: () => void
}) {
  const slug = data.publicSlug || ''
  const isActive = data.isActive !== false
  const [copied, setCopied] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  const publicUrl = slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/boutique/${slug}`
    : ''

  const copyToClipboard = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Lien copié !', { description: publicUrl })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erreur lors de la copie')
    }
  }

  const generateSlug = () => {
    const base = (data.storeTitle || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 30)
    onChange('publicSlug', base)
    setSlugError(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
            <Store className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base">Boutique Publique</CardTitle>
            <Desc>Configurez votre boutique en ligne accessible à vos clients</Desc>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Boutique status */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isActive ? 'bg-emerald-100' : 'bg-gray-100'
              )}
            >
              <Store className={cn('h-5 w-5', isActive ? 'text-emerald-600' : 'text-gray-400')} />
            </div>
            <div>
              <Label className="text-sm font-medium">Boutique en ligne</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Votre boutique est visible publiquement' : 'Votre boutique est masquée'}
              </p>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(v) => onChange('isActive', v)}
          />
        </div>

        <Separator />

        {/* Store settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="store-title" className="text-xs font-medium">
              Nom de la boutique
            </Label>
            <Input
              id="store-title"
              placeholder="Ex: Boutique DistribuSN"
              value={data.storeTitle || ''}
              onChange={(e) => onChange('storeTitle', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-number" className="text-xs font-medium">
              Numéro WhatsApp
            </Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="whatsapp-number"
                className="pl-9"
                placeholder="+221 77 000 00 00"
                value={data.whatsappNumber || ''}
                onChange={(e) => onChange('whatsappNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="store-description" className="text-xs font-medium">
              Description
            </Label>
            <Textarea
              id="store-description"
              placeholder="Décrivez votre boutique en quelques mots..."
              value={data.storeDescription || ''}
              onChange={(e) => onChange('storeDescription', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* ── Public URL & QR Code Section ──────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Lien public & QR Code</Label>
          </div>

          {/* Slug input */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Identifiant de la boutique (slug)
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  /boutique/
                </span>
                <Input
                  placeholder="ma-boutique"
                  value={slug}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')
                    onChange('publicSlug', val)
                    setSlugError(null)
                  }}
                  className="pl-[85px] font-mono text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={generateSlug}
                title="Générer depuis le nom"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {slugError && <p className="text-xs text-destructive">{slugError}</p>}
            <p className="text-[11px] text-muted-foreground">
              Lettres, chiffres, tirets et underscores uniquement. Min. 3 caractères.
            </p>
          </div>

          {/* Public URL display + actions */}
          {slug && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-mono text-emerald-800 flex-1 truncate">{publicUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 shrink-0"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" asChild>
                  <a href={`/boutique/${slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>

              <Badge className="bg-emerald-100 text-emerald-700 text-[11px] border-emerald-200">
                ✅ Boutique accessible publiquement
              </Badge>
            </div>
          )}

          {/* QR Code */}
          {slug && (
            <BoutiqueQRCode
              boutiqueUrl={publicUrl}
              boutiqueName={data.storeTitle || 'Boutique'}
            />
          )}

          {!slug && (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
              <QrCode className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Définissez un identifiant pour activer votre boutique publique et générer un QR code.
              </p>
            </div>
          )}
        </div>

        <Separator />

        <SaveBtn loading={saving} onClick={onSave} label="Sauvegarder la boutique" />
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 3. DEVISE XOF SECTION
// ═══════════════════════════════════════════════════════════════════
function CurrencySection({
  data,
  onChange,
  saving,
  onSave,
}: {
  data: StoreSettingsData
  onChange: (field: string, value: string) => void
  saving: boolean
  onSave: () => void
}) {
  const currencies = [
    { value: 'XOF', label: 'XOF — Franc CFA ( BCEAO )', symbol: 'FCFA' },
    { value: 'XAF', label: 'XAF — Franc CFA ( BEAC )', symbol: 'FCFA' },
    { value: 'EUR', label: 'EUR — Euro', symbol: '€' },
    { value: 'USD', label: 'USD — Dollar US', symbol: '$' },
    { value: 'GNF', label: 'GNF — Franc Guinéen', symbol: 'FG' },
    { value: 'MRU', label: 'MRU — Ouguiya', symbol: 'UM' },
  ]

  return (
    <Card>
      <SectionHeader
        icon={<span className="text-sm font-bold">FCFA</span>}
        iconBg="bg-amber-100"
        iconColor="text-amber-700"
        title="Devise"
        description="Configurez la devise utilisée pour vos prix et factures"
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currencies.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange('currency', c.value)}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all cursor-pointer',
                data.currency === c.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold shrink-0',
                  data.currency === c.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {c.symbol.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.label}</p>
                <p className="text-xs text-muted-foreground">Symbole : {c.symbol}</p>
              </div>
              {data.currency === c.value && (
                <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            💡 La devise sélectionnée sera utilisée dans vos devis, factures et sur votre boutique
            publique. Par défaut : XOF (Franc CFA BCEAO).
          </p>
        </div>

        <SaveBtn loading={saving} onClick={onSave} label="Sauvegarder la devise" />
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 4. SEO SECTION
// ═══════════════════════════════════════════════════════════════════
function SeoSection({
  data,
  onChange,
  saving,
  onSave,
}: {
  data: StoreSettingsData
  onChange: (field: string, value: string) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <Card>
      <SectionHeader
        icon={<Search />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="Référencement (SEO)"
        description="Optimisez le référencement de votre boutique publique"
      />
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="seo-title" className="text-xs font-medium">
              Titre SEO
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="seo-title"
                className="pl-9"
                placeholder="Teranga Biz — Distributeur de produits à Dakar"
                value={data.seoTitle || ''}
                onChange={(e) => onChange('seoTitle', e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Recommandé : 50-60 caractères. Affiché dans les résultats Google.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="seo-description" className="text-xs font-medium">
              Méta description
            </Label>
            <Textarea
              id="seo-description"
              placeholder="Découvrez notre catalogue de produits de qualité à prix abordables. Livraison à Dakar et environs."
              value={data.seoDescription || ''}
              onChange={(e) => onChange('seoDescription', e.target.value)}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">
              Recommandé : 150-160 caractères. Apparaît sous le titre dans Google.
            </p>
          </div>
        </div>

        <Separator />

        {/* SEO Image */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Image OG (Open Graph)</Label>
          <p className="text-[11px] text-muted-foreground">
            Cette image s&apos;affiche lorsque votre boutique est partagée sur WhatsApp, Facebook, Twitter, etc.
            Format recommandé : 1200 × 630 px.
          </p>
          <div className="max-w-sm">
            <ImageUpload
              value={data.seoImage || ''}
              onChange={(url) => onChange('seoImage', url)}
              label="Importer l'image OG"
              folder="seo"
              previewClassName="h-32"
            />
          </div>
        </div>

        {/* Preview */}
        {data.seoTitle && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Aperçu Google</Label>
            <div className="rounded-xl border border-border p-4 bg-white space-y-1 max-w-lg">
              <p className="text-base text-blue-700 hover:underline cursor-pointer truncate">
                {data.seoTitle || 'Titre de votre boutique'}
              </p>
              <p className="text-xs text-green-700 truncate">boutique/…/votre-boutique</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {data.seoDescription || 'La méta description de votre boutique apparaîtra ici.'}
              </p>
            </div>
          </div>
        )}

        <SaveBtn loading={saving} onClick={onSave} label="Sauvegarder le SEO" />
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 5. PARAMÈTRES EMAIL SECTION
// ═══════════════════════════════════════════════════════════════════
function EmailSection({
  data,
  onChange,
  saving,
  onSave,
}: {
  data: StoreSettingsData
  onChange: (field: string, value: string) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <Card>
      <SectionHeader
        icon={<Mail />}
        iconBg="bg-purple-100"
        iconColor="text-purple-600"
        title="Paramètres Email"
        description="Configuration SMTP pour l'envoi de devis, factures et notifications"
      />
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* SMTP Host */}
          <div className="space-y-2">
            <Label htmlFor="smtp-host" className="text-xs font-medium">
              Serveur SMTP (hôte)
            </Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="smtp-host"
                className="pl-9"
                placeholder="smtp.gmail.com"
                value={data.smtpHost || ''}
                onChange={(e) => onChange('smtpHost', e.target.value)}
              />
            </div>
          </div>

          {/* SMTP Port */}
          <div className="space-y-2">
            <Label htmlFor="smtp-port" className="text-xs font-medium">
              Port SMTP
            </Label>
            <div className="relative">
              <HashIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="smtp-port"
                className="pl-9"
                placeholder="587"
                type="number"
                value={data.smtpPort?.toString() || ''}
                onChange={(e) => onChange('smtpPort', e.target.value)}
              />
            </div>
          </div>

          {/* SMTP User */}
          <div className="space-y-2">
            <Label htmlFor="smtp-user" className="text-xs font-medium">
              Utilisateur SMTP
            </Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="smtp-user"
                className="pl-9"
                placeholder="votre@email.com"
                value={data.smtpUser || ''}
                onChange={(e) => onChange('smtpUser', e.target.value)}
              />
            </div>
          </div>

          {/* SMTP Password */}
          <div className="space-y-2">
            <Label htmlFor="smtp-pass" className="text-xs font-medium">
              Mot de passe SMTP
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="smtp-pass"
                className="pl-9"
                type="password"
                placeholder="••••••••"
                value={data.smtpPass || ''}
                onChange={(e) => onChange('smtpPass', e.target.value)}
              />
            </div>
          </div>

          {/* Email From */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email-from" className="text-xs font-medium">
              Adresse d&apos;expédition (De)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email-from"
                className="pl-9"
                placeholder="contact@votre-entreprise.com"
                value={data.emailFrom || ''}
                onChange={(e) => onChange('emailFrom', e.target.value)}
              />
            </div>
          </div>

          {/* Email Signature */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email-signature" className="text-xs font-medium">
              Signature email
            </Label>
            <Textarea
              id="email-signature"
              placeholder="Cordialement,&#10;Votre Nom&#10;Teranga Biz SARL&#10;+221 77 000 00 00"
              value={data.emailSignature || ''}
              onChange={(e) => onChange('emailSignature', e.target.value)}
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">
              Cette signature sera ajoutée à tous les emails envoyés automatiquement (devis, factures,
              confirmations de commande).
            </p>
          </div>
        </div>

        {/* SMTP hints */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
          <p className="text-xs font-medium text-purple-800">⚙️ Configuration rapide</p>
          <div className="text-[11px] text-purple-700 space-y-0.5">
            <p><strong>Gmail :</strong> smtp.gmail.com — Port 587 — SSL/TLS</p>
            <p><strong>Outlook :</strong> smtp.office365.com — Port 587 — STARTTLS</p>
            <p><strong>Orange SN :</strong> smtp.orange.sn — Port 465 — SSL</p>
            <p className="text-purple-600 mt-1">
              Pour Gmail, utilisez un « mot de passe d&apos;application » (pas votre mot de passe habituel).
            </p>
          </div>
        </div>

        <SaveBtn loading={saving} onClick={onSave} label="Sauvegarder les paramètres email" />
      </CardContent>
    </Card>
  )
}

// Hash icon for port field
function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const user = useAppStore((s) => s.user)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || 'Mamadou Diallo')
  const [profileEmail, setProfileEmail] = useState(user?.email || 'mamadou@distribuerp.com')
  const [profilePhone, setProfilePhone] = useState('+221 77 123 45 67')
  const [profileSaving, setProfileSaving] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Store settings state (loaded from backend)
  const [storeData, setStoreData] = useState<StoreSettingsData>({})
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)

  // Notification state
  const [notifications, setNotifications] = useState({
    orders: true,
    stock: true,
    clients: false,
    reports: true,
    marketing: false,
  })

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const initials = profileName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/store-settings')
      const json = await res.json()
      if (json.data) {
        setStoreData(json.data)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Save profile
  const handleProfileSave = async () => {
    if (!user?.id) {
      toast.error('Erreur', { description: 'Utilisateur non identifié.' })
      return
    }
    setProfileSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error('Erreur', { description: json.error || 'Impossible de sauvegarder le profil.' })
      } else {
        // Update local store
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useAppStore.getState().setUser({ ...useAppStore.getState().user!, name: profileName, phone: profilePhone } as any)
        toast.success('Profil sauvegardé', { description: 'Vos informations ont été mises à jour.' })
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setProfileSaving(false)
    }
  }

  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide', { description: 'Veuillez sélectionner une image (JPG, PNG).' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux', { description: 'Maximum 5 Mo.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      useAppStore.getState().setUser({ ...useAppStore.getState().user!, avatar: dataUrl })
      toast.success('Photo mise à jour', { description: 'Votre avatar a été changé.' })
    }
    reader.readAsDataURL(file)
  }

  // Handle field change
  const handleChange = (field: string, value: string | boolean) => {
    setStoreData((prev) => ({ ...prev, [field]: value }))
  }

  // Save settings
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeData),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error('Erreur', { description: json.error })
      } else {
        toast.success('Paramètres sauvegardés', {
          description: 'Vos modifications ont été enregistrées avec succès.',
        })
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  if (loadingSettings) {
    return (
      <div className="space-y-6 max-w-3xl">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── 1. Profile Section ─────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<User />}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          title="Profil utilisateur"
          description="Gérez vos informations personnelles"
        />
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{profileName}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
              <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3" />
                Changer la photo
              </Button>
            </div>
          </div>

          <Separator />

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-xs font-medium">
                Nom complet
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  className="pl-9"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email" className="text-xs font-medium">
                Adresse e-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-email"
                  type="email"
                  className="pl-9"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone" className="text-xs font-medium">
                Téléphone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-phone"
                  className="pl-9"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Rôle</Label>
              <Input
                className="bg-muted text-muted-foreground"
                value={
                  user?.role
                    ?.replace('_', ' ')
                    .replace(/^\w/, (c) => c.toUpperCase()) || 'Admin'
                }
                disabled
              />
            </div>
          </div>

          <SaveBtn
            loading={profileSaving}
            onClick={handleProfileSave}
            label="Sauvegarder le profil"
          />
        </CardContent>
      </Card>

      {/* ── 2. Entreprise Section ──────────────────────────── */}
      <CompanySection
        data={storeData}
        onChange={handleChange}
        saving={saving}
        onSave={handleSave}
      />

      {/* ── 3. Boutique Publique Section ───────────────────── */}
      <BoutiqueShareSection
        data={storeData}
        onChange={handleChange}
        saving={saving}
        onSave={handleSave}
      />

      {/* ── 4. Devise Section ──────────────────────────────── */}
      <CurrencySection
        data={storeData}
        onChange={handleChange}
        saving={saving}
        onSave={handleSave}
      />

      {/* ── 5. SEO Section ─────────────────────────────────── */}
      <SeoSection
        data={storeData}
        onChange={handleChange}
        saving={saving}
        onSave={handleSave}
      />

      {/* ── 6. Email Settings Section ─────────────────────── */}
      <EmailSection
        data={storeData}
        onChange={handleChange}
        saving={saving}
        onSave={handleSave}
      />

      {/* ── 7. Appearance Section ──────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<Palette />}
          iconBg="bg-chart-4/10"
          iconColor="text-chart-4"
          title="Apparence"
          description="Personnalisez l'affichage"
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                {theme === 'light' ? (
                  <Sun className="h-5 w-5 text-erp-orange" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Thème</Label>
                <p className="text-xs text-muted-foreground">
                  {theme === 'light' ? 'Mode clair activé' : 'Mode sombre activé'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                theme === 'dark' ? 'bg-primary' : 'bg-muted'
              )}
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <span
                className={cn(
                  'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── 8. Notification Settings ──────────────────────── */}
      <Card>
        <SectionHeader
          icon={<Bell />}
          iconBg="bg-erp-success/10"
          iconColor="text-erp-success"
          title="Notifications"
          description="Configurez vos alertes et notifications"
        />
        <CardContent className="space-y-4">
          {[
            {
              key: 'orders' as const,
              label: 'Nouvelles commandes',
              description: 'Recevoir une notification pour chaque nouvelle commande',
            },
            {
              key: 'stock' as const,
              label: 'Alertes de stock',
              description: 'Notification quand un produit atteint le seuil minimum',
            },
            {
              key: 'clients' as const,
              label: 'Nouveaux clients',
              description: "Notification lors de l'ajout d'un nouveau client",
            },
            {
              key: 'reports' as const,
              label: 'Rapports hebdomadaires',
              description: 'Recevoir un résumé hebdomadaire des performances',
            },
            {
              key: 'marketing' as const,
              label: 'Offres et mises à jour',
              description: 'Promotions, nouveautés et communications marketing',
            },
          ].map((item, i) => (
            <React.Fragment key={item.key}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={notifications[item.key]}
                  onCheckedChange={() => toggleNotification(item.key)}
                />
              </div>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* ── 9. Danger Zone ────────────────────────────────── */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-base text-destructive">Zone de danger</CardTitle>
              <CardDescription>Actions irréversibles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-destructive">Supprimer le compte</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cette action est permanente et toutes vos données seront perdues. Les commandes en
                  cours seront annulées.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled
              className="shrink-0"
            >
              Supprimer mon compte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
