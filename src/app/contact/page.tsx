'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  ArrowLeft,
  User,
  Mail,
  MessageSquare,
  MapPin,
  Phone,
  Send,
  Loader2,
} from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name || !email || !message) return

    setLoading(true)

    // Send contact form data
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      toast.success('Message envoyé !', {
        description: 'Nous vous répondrons dans les plus brefs délais.',
      })
    } catch {
      toast.error('Erreur', {
        description: 'Impossible d\'envoyer le message. Réessayez plus tard.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/20 px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity">
            <span className="text-3xl font-bold text-emerald-400">Teranga</span>
            <span className="text-3xl font-bold text-amber-400">Biz</span>
          </Link>
          <p className="mt-2 text-slate-400 text-sm">
            Parlons de votre projet
          </p>
        </div>

        {/* Contact Card */}
        <Card className="bg-slate-900/50 border border-slate-800 rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-slate-50 text-center">Contactez-nous</CardTitle>
            <CardDescription className="text-slate-400 text-center">
              Remplissez le formulaire ci-dessous ou contactez-nous directement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Contact Info */}
            <div className="grid grid-cols-1 gap-3">
              <a
                href="https://wa.me/221781234567"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors group"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400 group-hover:text-emerald-300">WhatsApp</p>
                  <p className="text-xs text-slate-400">+221 78 123 45 67</p>
                </div>
              </a>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-800">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Adresse</p>
                  <p className="text-xs text-slate-400">Dakar, Sénégal</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">ou par formulaire</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name + Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-slate-300">
                    Nom
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="contact-name"
                      type="text"
                      placeholder="Votre nom"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 bg-slate-800/50 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-slate-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 bg-slate-800/50 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="contact-subject" className="text-slate-300">
                  Sujet <span className="text-slate-500">(optionnel)</span>
                </Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="contact-subject"
                    type="text"
                    placeholder="Objet de votre message"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={loading}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-slate-300">
                  Message
                </Label>
                <Textarea
                  id="contact-message"
                  placeholder="Décrivez votre besoin..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={loading}
                  rows={4}
                  className="bg-slate-800/50 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-11 rounded-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </>
                )}
              </Button>
            </form>

            {/* Plan badge if coming from pricing */}
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à l&apos;accueil
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          © 2025 Teranga Biz — DistribuSN, Dakar, Sénégal
        </p>
      </div>
    </div>
  )
}
