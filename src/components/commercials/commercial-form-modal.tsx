'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Commercial } from '@/lib/types'

interface CommercialFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commercial?: Commercial | null // null = create mode, Commercial = edit mode
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  password?: string
}

export function CommercialFormModal({
  open,
  onOpenChange,
  commercial,
}: CommercialFormModalProps) {
  const isEdit = !!commercial
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: commercial?.name || '',
    email: commercial?.email || '',
    phone: commercial?.phone || '',
    password: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Reset form when modal opens/closes or commercial changes
  React.useEffect(() => {
    if (open) {
      setForm({
        name: commercial?.name || '',
        email: commercial?.email || '',
        phone: commercial?.phone || '',
        password: '',
      })
      setErrors({})
    }
  }, [open, commercial])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.name.trim()) {
      newErrors.name = 'Le nom est obligatoire'
    }

    if (!form.email.trim()) {
      newErrors.email = "L'email est obligatoire"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Format d'email invalide"
    }

    if (form.phone && !/^[+]?[\d\s()-]{8,}$/.test(form.phone)) {
      newErrors.phone = 'Format de téléphone invalide'
    }

    if (!isEdit && !form.password.trim()) {
      newErrors.password = 'Le mot de passe est obligatoire'
    } else if (form.password && form.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; password: string }) => {
      const res = await fetch('/api/commercials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de création')
      return json
    },
    onSuccess: () => {
      toast.success('Commercial créé avec succès !')
      queryClient.invalidateQueries({ queryKey: ['commercials'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const res = await fetch(`/api/commercials/${commercial!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de mise à jour')
      return json
    },
    onSuccess: () => {
      toast.success('Commercial mis à jour avec succès !')
      queryClient.invalidateQueries({ queryKey: ['commercials'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/commercials/${commercial!.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de suppression')
      return json
    },
    onSuccess: () => {
      toast.success('Commercial désactivé.')
      queryClient.invalidateQueries({ queryKey: ['commercials'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    if (isEdit) {
      updateMutation.mutate({
        name: form.name,
        email: form.email,
        phone: form.phone,
      })
    } else {
      createMutation.mutate({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le commercial' : 'Nouveau commercial'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations du commercial.'
              : 'Ajoutez un nouveau membre à votre équipe commerciale.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet *</Label>
            <Input
              id="name"
              placeholder="ex: Ibrahima Ndiaye"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="ex: ibrahima@teranga.sn"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="ex: +221 77 123 45 67"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* Password (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {/* Delete button (edit mode only) */}
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm('Désactiver ce commercial ? Il n\'apparaîtra plus dans la liste.')) {
                    deleteMutation.mutate()
                  }
                }}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Désactiver
              </Button>
            )}

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer le commercial'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
