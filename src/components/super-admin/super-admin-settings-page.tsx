'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  Search,
  Globe,
  Mail,
  Phone,
  MapPin,
  Image,
  Save,
  Loader2,
  RefreshCw,
  Layout,
  MessageSquare,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface SiteSettings {
  id: string
  companyId: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPassword: string | null
  smtpFromEmail: string | null
  smtpFromName: string | null
  emailTemplates: string | null
  platformName: string
  platformLogo: string | null
  supportEmail: string | null
  supportPhone: string | null
  supportAddress: string | null
}

const defaultSettings: SiteSettings = {
  id: '',
  companyId: null,
  seoTitle: 'Commercio SaaS',
  seoDescription: 'Plateforme de gestion commerciale multitenant',
  seoKeywords: 'commercio, saas, gestion, commerciale',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFromEmail: '',
  smtpFromName: 'Commercio SaaS',
  emailTemplates: '{}',
  platformName: 'Commercio SaaS',
  platformLogo: '',
  supportEmail: '',
  supportPhone: '',
  supportAddress: '',
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('seo')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        toast.success('Paramètres enregistrés avec succès')
        fetchSettings()
      } else {
        toast.error('Erreur lors de l\'enregistrement')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = () => {
    fetchSettings()
    toast.success('Paramètres actualisés')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paramètres de la Plateforme</h1>
          <p className="text-muted-foreground">Configurez les paramètres globaux du système</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="seo" className="gap-2">
            <Globe className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="platform" className="gap-2">
            <Layout className="h-4 w-4" />
            Plateforme
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact
          </TabsTrigger>
        </TabsList>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Paramètres SEO
              </CardTitle>
              <CardDescription>
                Optimisez le référencement naturel de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Titre Meta *</Label>
                <Input
                  id="seoTitle"
                  value={settings.seoTitle || ''}
                  onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })}
                  placeholder="Commercio SaaS - Gestion Commerciale"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.seoTitle?.length || 0}/60 caractères recommandés
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">Description Meta *</Label>
                <Textarea
                  id="seoDescription"
                  value={settings.seoDescription || ''}
                  onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })}
                  placeholder="Plateforme de gestion commerciale multitenant pour les entreprises..."
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.seoDescription?.length || 0}/160 caractères recommandés
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">Mots-clés</Label>
                <Input
                  id="seoKeywords"
                  value={settings.seoKeywords || ''}
                  onChange={(e) => setSettings({ ...settings, seoKeywords: e.target.value })}
                  placeholder="commercio, saas, gestion, commerciale, erp"
                />
                <p className="text-xs text-muted-foreground">
                  Séparez les mots-clés par des virgules
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuration Email
              </CardTitle>
              <CardDescription>
                Configurez le serveur SMTP pour l'envoi des emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Hôte SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={settings.smtpHost || ''}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port SMTP</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort || ''}
                    onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Utilisateur SMTP</Label>
                  <Input
                    id="smtpUser"
                    value={settings.smtpUser || ''}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    placeholder="user@gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Mot de passe SMTP</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.smtpPassword || ''}
                    onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">Email d'envoi</Label>
                  <Input
                    id="smtpFromEmail"
                    type="email"
                    value={settings.smtpFromEmail || ''}
                    onChange={(e) => setSettings({ ...settings, smtpFromEmail: e.target.value })}
                    placeholder="noreply@commercio.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">Nom d'envoi</Label>
                  <Input
                    id="smtpFromName"
                    value={settings.smtpFromName || ''}
                    onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                    placeholder="Commercio SaaS"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Templates d'Email
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Les templates d'email sont configurés au format JSON
                </p>
                <Textarea
                  value={settings.emailTemplates || '{}'}
                  onChange={(e) => setSettings({ ...settings, emailTemplates: e.target.value })}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder='{\n  "welcome": {\n    "subject": "Bienvenue sur Commercio!",\n    "body": "..."\n  }\n}'
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Settings */}
        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Informations de la Plateforme
              </CardTitle>
              <CardDescription>
                Configurez l'identité visuelle et le nom de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Nom de la plateforme *</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  placeholder="Commercio SaaS"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platformLogo" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL du Logo
                </Label>
                <Input
                  id="platformLogo"
                  value={settings.platformLogo || ''}
                  onChange={(e) => setSettings({ ...settings, platformLogo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Entrez l'URL publique de votre logo
                </p>
                {settings.platformLogo && (
                  <div className="mt-2">
                    <img
                      src={settings.platformLogo}
                      alt="Logo preview"
                      className="h-16 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Coordonnées de Contact
              </CardTitle>
              <CardDescription>
                Configurez les informations de support du système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supportEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email de Support
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail || ''}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  placeholder="support@commercio.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone de Support
                </Label>
                <Input
                  id="supportPhone"
                  value={settings.supportPhone || ''}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse du Support
                </Label>
                <Textarea
                  id="supportAddress"
                  value={settings.supportAddress || ''}
                  onChange={(e) => setSettings({ ...settings, supportAddress: e.target.value })}
                  placeholder="123 Rue du Commerce, Dakar, Sénégal"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}