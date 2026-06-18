'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Download,
  Printer,
  Copy,
  Check,
  Smartphone,
  Chrome,
  Apple,
  QrCode,
  ArrowLeft,
  MapPin,
  MonitorSmartphone,
  CircleDot,
  ExternalLink,
  ShieldCheck,
  Zap,
  Wifi,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// ─── Install Instructions Data ──────────────────────────────────────────

const androidSteps = [
  {
    step: 1,
    title: 'Ouvrez le lien',
    description: 'Ouvrez ce lien sur Google Chrome sur votre téléphone.',
  },
  {
    step: 2,
    title: 'Menu Chrome',
    description: 'Appuyez sur les 3 petits points (⋮) en haut à droite du navigateur.',
  },
  {
    step: 3,
    title: 'Installer',
    description:
      'Sélectionnez "Ajouter à l\'écran d\'accueil" ou "Installer l\'application".',
  },
  {
    step: 4,
    title: 'Confirmer',
    description: 'Appuyez sur "Ajouter" pour confirmer l\'installation.',
  },
]

const iosSteps = [
  {
    step: 1,
    title: 'Ouvrez le lien',
    description: 'Ouvrez ce lien sur Safari sur votre iPhone ou iPad.',
  },
  {
    step: 2,
    title: 'Bouton Partager',
    description:
      'Appuyez sur le bouton Partager (carré avec flèche vers le haut) en bas de l\'écran.',
  },
  {
    step: 3,
    title: 'Écran d\'accueil',
    description:
      'Faites défiler vers le bas et appuyez sur "Sur l\'écran d\'accueil".',
  },
  {
    step: 4,
    title: 'Ajouter',
    description: 'Appuyez sur "Ajouter" en haut à droite pour confirmer.',
  },
]

// ─── Step Card ────────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="text-sm font-bold text-emerald-400">{step}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <p className="mt-0.5 text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ─── Feature Badge ────────────────────────────────────────────────────────

function FeatureItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 border border-slate-700/40 px-3 py-2">
      <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────

export default function InstallAppPage() {
  const [appUrl] = useState(() => {
    if (typeof window !== 'undefined') return window.location.origin
    return 'https://app.terangabiz.sn'
  })
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android')
  const [copied, setCopied] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const isMobile = isMobileDevice()
  const qrRef = useRef<HTMLDivElement>(null)

  // ─── Listen for beforeinstallprompt ───
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ─── Download QR as PNG ───
  const downloadQR = useCallback(() => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    // High-res export (1024x1024)
    const exportSize = 1024
    const padding = 32

    img.onload = () => {
      canvas.width = exportSize
      canvas.height = exportSize
      if (!ctx) return

      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, exportSize, exportSize)

      // Draw QR code centered with padding
      const qrSize = exportSize - padding * 2
      ctx.drawImage(img, padding, padding, qrSize, qrSize)

      // Download
      const link = document.createElement('a')
      link.download = `teranga-biz-qr-code-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('QR Code téléchargé', {
        description: 'L\'image PNG a été enregistrée.',
      })
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  // ─── Print ───
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // ─── Copy link ───
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(appUrl)
      setCopied(true)
      toast.success('Lien copié', {
        description: appUrl,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = appUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      toast.success('Lien copié', {
        description: appUrl,
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }, [appUrl])

  // ─── Trigger PWA install ───
  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        toast.success('Application installée !')
        setDeferredPrompt(null)
        setCanInstall(false)
      }
    } else if (isIOS()) {
      // iOS Safari: just scroll to instructions
      setActiveTab('ios')
      document.getElementById('instructions-section')?.scrollIntoView({ behavior: 'smooth' })
      toast.info('Suivez les instructions Safari ci-dessous.')
    } else {
      // Fallback: add to home screen manually
      document.getElementById('instructions-section')?.scrollIntoView({ behavior: 'smooth' })
      toast.info('Suivez les instructions ci-dessous pour installer.')
    }
  }, [deferredPrompt, isIOS])

  const steps = activeTab === 'android' ? androidSteps : iosSteps

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {/* ─── Print-only header ─── */}
      <div className="hidden print:block print:mb-8 print:text-center">
        <h1 className="text-2xl font-bold text-black">Teranga Biz — Installer l&apos;Application</h1>
        <p className="text-sm text-gray-600 mt-1">Scannez ce QR Code avec votre smartphone</p>
      </div>

      {/* ─── Top Navigation ─── */}
      <div className="print:hidden border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="flex-1" />
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium"
          >
            <QrCode className="mr-1.5 h-3 w-3" />
            Version 1.0 — Android &amp; iOS
          </Badge>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* ─── Header Section ─── */}
        <div className="text-center mb-10 print:mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <Smartphone className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 print:text-black">
            Installer l&apos;Application Mobile
            <br />
            <span className="text-emerald-400">Teranga Biz</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Scannez ce QR Code avec votre smartphone pour installer
            l&apos;application sur votre écran d&apos;accueil.
          </p>
        </div>

        {/* ─── QR Code Card ─── */}
        <Card className="mx-auto max-w-md bg-slate-800 border-slate-700/60 overflow-hidden print:border-2 print:border-gray-300 print:shadow-none print:bg-white print:rounded-xl print:p-8 print:max-w-sm">
          <CardContent className="flex flex-col items-center p-6 sm:p-8">
            {/* QR Code */}
            <div
              ref={qrRef}
              className="inline-flex items-center justify-center rounded-2xl bg-white p-4 shadow-lg shadow-emerald-500/5 print:shadow-none"
            >
              <QRCode
                value={appUrl}
                size={256}
                bgColor="#FFFFFF"
                fgColor="#10B981"
                level="H"
              />
            </div>

            {/* URL text */}
            <p className="mt-4 text-xs font-mono text-slate-500 print:text-gray-500 select-all">
              {appUrl}
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full print:hidden">
              <Button
                onClick={downloadQR}
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-slate-100 gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger PNG
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-slate-100 gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
              <Button
                onClick={copyLink}
                variant="outline"
                size="sm"
                className={copied
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 gap-2'
                  : 'border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-slate-100 gap-2'
                }
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Mobile Install CTA ─── */}
        {isMobile && (
          <div className="mt-8 print:hidden">
            <Button
              onClick={handleInstall}
              size="lg"
              className="w-full h-14 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white gap-2 rounded-xl shadow-lg shadow-emerald-500/25"
            >
              <Smartphone className="h-5 w-5" />
              {canInstall
                ? 'Installer l\'application maintenant'
                : 'Voir les instructions d\'installation'
              }
            </Button>
            <p className="mt-2 text-center text-xs text-slate-500">
              {isIOS()
                ? 'Disponible sur Safari pour iPhone et iPad'
                : 'Compatible Chrome, Edge et Samsung Internet'
              }
            </p>
          </div>
        )}

        {/* ─── Installation Instructions ─── */}
        <div id="instructions-section" className="mt-12 print:mt-8">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-50 print:text-black">
              Comment installer l&apos;application ?
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 print:text-gray-500">
              Suivez les étapes selon votre appareil
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center justify-center mb-8 print:hidden">
            <div className="inline-flex rounded-xl bg-slate-800 border border-slate-700/60 p-1">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'android'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Chrome className="h-4 w-4" />
                Android
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === 'ios'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Apple className="h-4 w-4" />
                iOS
              </button>
            </div>
          </div>

          {/* Steps */}
          <Card className="mx-auto max-w-lg bg-slate-800 border-slate-700/60 print:border-0 print:bg-white print:shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-5">
                {steps.map((item) => (
                  <StepCard
                    key={`${activeTab}-${item.step}`}
                    step={item.step}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>

              {/* Done indicator */}
              <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <CircleDot className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">
                  L&apos;application apparaîtra sur votre écran d&apos;accueil
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── App Features ─── */}
        <div className="mt-12 print:mt-8">
          <h2 className="text-center text-xl font-bold text-slate-50 print:text-black mb-2">
            Pourquoi installer Teranga Biz ?
          </h2>
          <p className="text-center text-sm text-slate-400 print:text-gray-500 mb-6">
            Tout ce dont votre équipe a besoin, directement dans leur poche
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mx-auto max-w-lg">
            <FeatureItem icon={Wifi} label="Fonctionne hors ligne" />
            <FeatureItem icon={Zap} label="Rapide & léger" />
            <FeatureItem icon={MapPin} label="GPS intégré" />
            <FeatureItem icon={ShieldCheck} label="Sécurisé" />
            <FeatureItem icon={MonitorSmartphone} label="Expérience native" />
            <FeatureItem icon={QrCode} label="Scan clients" />
          </div>
        </div>

        {/* ─── Manager Share Tip ─── */}
        {!isMobile && (
          <div className="mt-10 print:hidden">
            <Card className="mx-auto max-w-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                    <ExternalLink className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">
                      Partager avec votre équipe
                    </p>
                    <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                      Téléchargez le QR Code ci-dessus et envoyez-le par WhatsApp ou email
                      à vos commerciaux. Ils peuvent installer l&apos;app en scannant directement
                      depuis leur téléphone.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Footer ─── */}
        <footer className="mt-12 pb-6 text-center print:hidden">
          <p className="text-xs text-slate-600">
            Teranga Biz — L&apos;ERP qui comprend votre commerce
          </p>
          <p className="mt-1 text-[10px] text-slate-700">
            © {new Date().getFullYear()} Tous droits réservés
          </p>
        </footer>
      </div>
    </div>
  )
}
