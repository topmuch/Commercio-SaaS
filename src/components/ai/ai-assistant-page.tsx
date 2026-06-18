'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Package,
  Users,
  Loader2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ── Suggestions ───────────────────────────────────────────────────────

const suggestions = [
  { id: 's1', label: 'Analyse des ventes du mois', icon: TrendingUp, color: 'text-emerald-400', question: 'Analyse mes ventes des 30 derniers jours' },
  { id: 's2', label: 'Produits en alerte stock', icon: Package, color: 'text-amber-400', question: 'Quels produits ont un stock faible?' },
  { id: 's3', label: 'Clients les plus fidèles', icon: Users, color: 'text-blue-400', question: 'Quels sont mes clients les plus fidèles?' },
  { id: 's4', label: 'Tendances de ventes', icon: TrendingUp, color: 'text-purple-400', question: 'Quelles sont les tendances de mes ventes?' },
  { id: 's5', label: 'Recommandations', icon: Lightbulb, color: 'text-yellow-400', question: 'Comment améliorer mes ventes?' },
]

// ── Markdown-like renderer ────────────────────────────────────────────

function renderFormattedText(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    // Bold: **text**
    let renderedLine: React.ReactNode = line

    // Check if line is bold header (starts with **)
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={i} className="font-bold text-foreground mt-3 mb-1">
          {line.replace(/\*\*/g, '')}
        </p>
      )
      return
    }

    // Process inline bold
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    if (parts.length > 1) {
      renderedLine = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-semibold text-foreground">{part.replace(/\*\*/g, '')}</strong>
        }
        return <span key={j}>{part}</span>
      })
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-primary font-semibold shrink-0">{numberedMatch[1]}.</span>
          <span className="text-foreground/90">{renderedLine as React.ReactNode}</span>
        </div>
      )
      return
    }

    // Bullet points (starts with -)
    if (line.trimStart().startsWith('- ')) {
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-erp-orange shrink-0">•</span>
          <span className="text-foreground/90">{line.replace(/^-\s+/, '')}</span>
        </div>
      )
      return
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
      return
    }

    // Regular text
    elements.push(
      <p key={i} className="text-foreground/90 my-0.5">{renderedLine}</p>
    )
  })

  return elements
}

// ── Chat Message Component ────────────────────────────────────────────

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <Avatar className={`h-8 w-8 shrink-0 mt-0.5 ${isAssistant ? '' : ''}`}>
        <AvatarFallback className={
          isAssistant
            ? 'bg-primary text-primary-foreground text-xs font-bold'
            : 'bg-erp-orange text-white text-xs font-bold'
        }>
          {isAssistant ? 'AI' : 'U'}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[80%] ${isAssistant ? '' : 'text-right'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isAssistant
              ? 'bg-muted text-foreground rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          }`}
        >
          {isAssistant ? renderFormattedText(message.content) : message.content}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Bienvenue sur DistribuAI !**

Je suis votre assistant intelligent pour la gestion de votre activité de distribution. Je peux vous aider avec :

1. 📊 **Analyse des ventes** — Suivi et statistiques en temps réel
2. 📦 **Gestion du stock** — Alertes et recommandations
3. 👥 **Performance commerciale** — Suivi des équipes
4. 📈 **Prévisions** — Tendances et projections
5. 💡 **Recommandations** — Optimisation stratégique

Cliquez sur une suggestion ci-dessous ou tapez votre question pour commencer.`,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Build history: last 10 messages for context
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp }))

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context: { companyId: 'current' } }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la communication avec l\'assistant')
      }

      const json = await res.json()

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: json.data.message,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error('Erreur DistribuAI', { description: msg })

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Erreur**\n\nDésolé, une erreur est survenue : ${msg}\n\nVeuillez réessayer dans un instant.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* ── AI Branding ─────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-erp-blue text-white shadow-md">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-1.5">
            DistribuAI
            <Sparkles className="h-4 w-4 text-erp-orange" />
          </h2>
          <p className="text-xs text-muted-foreground">Assistant intelligent pour la distribution</p>
        </div>
        <Badge variant="secondary" className="ml-auto bg-erp-success/10 text-erp-success text-xs gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-erp-success animate-pulse" />
          En ligne
        </Badge>
      </div>

      {/* ── Chat Area ────────────────────────────────────── */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 px-1" ref={scrollRef}>
          <div className="space-y-4 p-4">
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    DistribuAI réfléchit...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Suggestions ───────────────────────────────── */}
        {messages.length <= 1 && !isLoading && (
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Suggestions rapides
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSend(s.label)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border/50"
                  >
                    <Icon className={`h-3 w-3 ${s.color}`} />
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Input Area ──────────────────────────────────── */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Posez votre question..."
              className="flex-1 h-10"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            DistribuAI peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </Card>
    </div>
  )
}
