'use client'

import React, { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import {
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  QrCode,
  Info,
  MessageCircle,
  Store,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface BoutiqueQRCodeProps {
  boutiqueUrl: string
  boutiqueName?: string
}

export default function BoutiqueQRCode({
  boutiqueUrl,
  boutiqueName = 'Notre Boutique',
}: BoutiqueQRCodeProps) {
  const [qrSize, setQrSize] = useState(256)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  // ── Download QR as PNG ──────────────────────────────────
  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()

    img.onload = () => {
      canvas.width = qrSize * 2
      canvas.height = qrSize * 2
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `qr-${boutiqueName.replace(/\s+/g, '-').toLowerCase()}.png`
      downloadLink.href = pngFile
      downloadLink.click()
      toast.success('QR Code téléchargé !')
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  // ── Print QR ──────────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre d\'impression.')
      return
    }

    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${boutiqueName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
              background: white;
            }
            .container { text-align: center; padding: 40px; }
            h1 { color: #1e293b; margin-bottom: 24px; font-size: 24px; }
            .qr-code { margin: 24px auto; display: inline-block; }
            .url { color: #64748b; font-size: 14px; margin-top: 20px; word-break: break-all; max-width: 400px; }
            .footer { margin-top: 32px; color: #94a3b8; font-size: 12px; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${boutiqueName}</h1>
            <div class="qr-code">${svgData}</div>
            <p class="url">${boutiqueUrl}</p>
            <p class="footer">Scannez ce QR code pour accéder à notre boutique en ligne</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // ── Copy URL ──────────────────────────────────────────────
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(boutiqueUrl)
      setCopied(true)
      toast.success('URL copiée dans le presse-papier !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erreur lors de la copie.')
    }
  }

  // ── Native share ──────────────────────────────────────────
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: boutiqueName,
          text: 'Découvrez notre boutique en ligne !',
          url: boutiqueUrl,
        })
      } catch (err) {
        // User cancelled, ignore
      }
    } else {
      handleCopyUrl()
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-orange/10">
            <QrCode className="h-4 w-4 text-erp-orange" />
          </div>
          <div>
            <CardTitle className="text-base">QR Code de la Boutique</CardTitle>
            <CardDescription>
              Partagez facilement votre boutique avec vos clients
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── QR Code Display ── */}
          <div className="flex flex-col items-center">
            <div
              ref={qrRef}
              className="bg-white p-5 rounded-xl shadow-md border border-border/30"
            >
              <QRCode
                value={boutiqueUrl}
                size={qrSize}
                level="H"
                bgColor="#ffffff"
                fgColor="#f97316"
              />
            </div>

            {/* Size slider */}
            <div className="mt-4 w-full max-w-xs">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Taille du QR Code
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground shrink-0">128</span>
                <input
                  type="range"
                  min={128}
                  max={400}
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-erp-orange"
                />
                <span className="text-[10px] text-muted-foreground shrink-0">400</span>
              </div>
              <p className="text-center text-xs font-medium text-erp-orange mt-1">{qrSize}px</p>
            </div>
          </div>

          {/* ── Actions & Info ── */}
          <div className="space-y-4">
            {/* URL display */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                URL de la boutique
              </Label>
              <div className="flex gap-2">
                <Input
                  value={boutiqueUrl}
                  readOnly
                  className="flex-1 text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="hidden sm:inline text-xs">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">Copier</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Action buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleDownload}
                className="w-full gap-2 bg-erp-orange hover:bg-erp-orange/90 text-white"
              >
                <Download className="h-4 w-4" />
                Télécharger le QR Code (PNG)
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="w-full gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimer le QR Code
              </Button>

              <Button
                onClick={handleShare}
                className="w-full gap-2 bg-erp-success hover:bg-erp-success/90 text-white"
              >
                <Share2 className="h-4 w-4" />
                Partager la boutique
              </Button>
            </div>

            <Separator />

            {/* Usage instructions */}
            <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
              <div className="flex items-start gap-2 mb-2">
                <Info className="h-4 w-4 text-erp-orange shrink-0 mt-0.5" />
                <h4 className="text-sm font-semibold text-foreground">
                  Comment utiliser ce QR Code ?
                </h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
                <li>Affichez-le dans votre magasin physique</li>
                <li>Partagez-le sur vos réseaux sociaux</li>
                <li>Ajoutez-le au dos de vos cartes de visite</li>
                <li>Envoyez-le par WhatsApp à vos clients</li>
                <li>Intégrez-le dans vos emails et flyers</li>
              </ul>
            </div>

            {/* Commercial use cases */}
            <div className="rounded-lg border border-erp-orange/20 bg-erp-orange/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-erp-orange shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">
                  Cas d&apos;usage pour vos commerciaux
                </h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
                <li>Montrez le QR code sur votre téléphone lors des visites</li>
                <li>Imprimez-le et distribuez-le lors des tournées</li>
                <li>Envoyez l&apos;image PNG par WhatsApp aux prospects</li>
                <li>Affichez-le à l&apos;entrée de chaque point de vente</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
