'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, Plus, UserPlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Client } from '@/lib/types'

interface ClientSelectWithCreateProps {
  clients: Client[]
  value: string
  onClientChange: (clientId: string) => void
  onClientsRefresh: () => void
  label?: string
}

interface NewClientForm {
  companyName: string
  contactName: string
  phone: string
  whatsapp: string
  email: string
}

export function ClientSelectWithCreate({
  clients,
  value,
  onClientChange,
  onClientsRefresh,
  label = 'Client *',
}: ClientSelectWithCreateProps) {
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [justCreated, setJustCreated] = useState<Client | null>(null)
  const [form, setForm] = useState<NewClientForm>({
    companyName: '',
    contactName: '',
    phone: '',
    whatsapp: '',
    email: '',
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Merge the just-created client into the list for immediate display
  const allClients = useMemo(() => {
    if (!justCreated) return clients
    if (clients.some((c) => c.id === justCreated.id)) return clients
    return [justCreated, ...clients]
  }, [clients, justCreated])

  const filteredClients = useMemo(() => {
    if (!search.trim()) return allClients.slice(0, 50)
    const q = search.toLowerCase()
    return allClients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    )
  }, [allClients, search])

  // Find selected client from merged list
  const selectedClient = allClients.find((c) => c.id === value)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear justCreated once the parent's client list catches up
  useEffect(() => {
    if (justCreated && clients.some((c) => c.id === justCreated.id)) {
      setJustCreated(null)
    }
  }, [clients, justCreated])

  const resetForm = () => {
    setForm({ companyName: '', contactName: '', phone: '', whatsapp: '', email: '' })
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
      toast.error('Les champs société, responsable et téléphone sont requis.')
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim() || undefined,
          email: form.email.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création du client.')
        return
      }
      const newClient = data.client as Client
      toast.success(`Client "${newClient.companyName}" créé avec succès.`)
      resetForm()
      setShowCreateForm(false)
      setSearch('')
      setDropdownOpen(false)

      // Immediately select the new client & store locally for display
      setJustCreated(newClient)
      onClientChange(newClient.id)

      // Refresh parent list in background (no await — non-blocking)
      onClientsRefresh()
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsCreating(false)
    }
  }

  const selectClient = (clientId: string) => {
    onClientChange(clientId)
    setDropdownOpen(false)
    const c = clients.find((cl) => cl.id === clientId)
    if (c) setSearch('')
  }

  const updateField = (field: keyof NewClientForm, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Selected client badge + dropdown trigger */}
      {!showCreateForm && (
        <div ref={containerRef} className="relative">
          {selectedClient ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedClient.companyName}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedClient.contactName} — {selectedClient.phone}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={() => {
                  onClientChange('')
                  setSearch('')
                  setJustCreated(null)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => setDropdownOpen(true)}
            >
              <ChevronDown className="h-4 w-4" />
              Sélectionner un client
            </button>
          )}

          {/* Dropdown */}
          {dropdownOpen && !selectedClient && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
              <div className="p-2 border-b">
                <Input
                  placeholder="Rechercher par nom, téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>
              <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
                {filteredClients.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {search ? 'Aucun client trouvé.' : 'Aucun client disponible.'}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                      onClick={() => selectClient(client.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.contactName} — {client.phone}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Nouveau client button */}
          {!selectedClient && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                setDropdownOpen(false)
                setShowCreateForm(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau client
            </Button>
          )}
        </div>
      )}

      {/* Inline new client form */}
      {showCreateForm && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="size-4 text-primary" />
              Nouveau client
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                resetForm()
                setShowCreateForm(false)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <form onSubmit={handleCreateClient} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="nc-name" className="text-xs text-muted-foreground">Société *</Label>
                <Input id="nc-name" placeholder="Nom de la société" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} required disabled={isCreating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nc-contact" className="text-xs text-muted-foreground">Responsable *</Label>
                <Input id="nc-contact" placeholder="Nom du responsable" value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} required disabled={isCreating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nc-phone" className="text-xs text-muted-foreground">Téléphone *</Label>
                <Input id="nc-phone" placeholder="Numéro de téléphone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required disabled={isCreating} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nc-whatsapp" className="text-xs text-muted-foreground">WhatsApp</Label>
                <Input id="nc-whatsapp" placeholder="Numéro WhatsApp" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} disabled={isCreating} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="nc-email" className="text-xs text-muted-foreground">Email</Label>
                <Input id="nc-email" type="email" placeholder="Adresse email" value={form.email} onChange={(e) => updateField('email', e.target.value)} disabled={isCreating} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={isCreating}>
                {isCreating ? <><Loader2 className="size-4 animate-spin mr-1" /> Création...</> : <><Plus className="size-4 mr-1" /> Créer le client</>}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}