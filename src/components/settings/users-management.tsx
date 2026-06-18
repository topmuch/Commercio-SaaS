'use client'

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCog,
  ChevronDown,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Types ──

interface UserItem {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  active: boolean
  createdAt: string
  counts?: {
    clients: number
    orders: number
    visits: number
    posts: number
  }
}

// ── Role helpers ──

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  director: 'Directeur',
  commercial: 'Commercial',
  accountant: 'Comptable',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 border-red-200',
  admin: 'bg-orange-100 text-orange-700 border-orange-200',
  director: 'bg-purple-100 text-purple-700 border-purple-200',
  commercial: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  accountant: 'bg-blue-100 text-blue-700 border-blue-200',
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck,
  admin: Shield,
  director: UserCog,
  commercial: Users,
  accountant: UserCheck,
}

function getRoleBadge(role: string) {
  const color = ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'
  return color
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function getAvatarColor(role: string): string {
  switch (role) {
    case 'super_admin': return 'bg-red-500'
    case 'admin': return 'bg-orange-500'
    case 'director': return 'bg-purple-500'
    case 'commercial': return 'bg-emerald-500'
    case 'accountant': return 'bg-blue-500'
    default: return 'bg-gray-500'
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── User Form Modal ──

function UserFormModal({
  mode,
  user,
  open,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  user?: UserItem | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role || 'commercial')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (open) {
      setName(user?.name || '')
      setEmail(user?.email || '')
      setPhone(user?.phone || '')
      setPassword('')
      setRole(user?.role || 'commercial')
      setShowPassword(false)
    }
  }, [open, user])

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Le nom et l\'email sont obligatoires')
      return
    }
    if (mode === 'create' && password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setSaving(true)
    try {
      const url = mode === 'create' ? '/api/users' : `/api/users/${user?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const body: Record<string, string> = { name, email, phone, role }
      if (password.length >= 6) body.password = password

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(mode === 'create' ? 'Utilisateur créé !' : 'Utilisateur mis à jour !')
        onSaved()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erreur lors de l\'opération')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            {mode === 'create' ? (
              <>
                <Plus className="h-5 w-5 text-orange-500" />
                Nouvel utilisateur
              </>
            ) : (
              <>
                <Edit2 className="h-5 w-5 text-orange-500" />
                Modifier l&apos;utilisateur
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Jean Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="jean@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">
              Téléphone
            </label>
            <Input
              placeholder="+221 77 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">
              Rôle
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-1 block">
              Mot de passe {mode === 'create' && <span className="text-red-500">*</span>}
              {mode === 'edit' && <span className="text-gray-400 font-normal">(laisser vide pour ne pas changer)</span>}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'create' ? 'Minimum 6 caractères' : 'Nouveau mot de passe'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-gray-700">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !email.trim() || (mode === 'create' && password.length < 6)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ──

export function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{
    data: UserItem[]
    count: number
  }>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const users = data?.data || []

  // Filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  // ── Delete ──
  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`Désactiver l'utilisateur "${userName}" ?`)) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Utilisateur désactivé')
        queryClient.invalidateQueries({ queryKey: ['users'] })
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  // ── Stats ──
  const totalActive = users.filter((u) => u.active).length
  const totalInactive = users.filter((u) => !u.active).length
  const roleCounts: Record<string, number> = {}
  users.filter((u) => u.active).forEach((u) => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1
  })

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-orange-500" />
              Gestion des utilisateurs
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Créez et gérez les comptes de votre équipe
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvel utilisateur</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalActive}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <UserCheck className="h-3 w-3" /> Actifs
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-400">{totalInactive}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <UserX className="h-3 w-3" /> Inactifs
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{roleCounts['commercial'] || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Commerciaux</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{roleCounts['admin'] || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Admins</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white border-gray-200"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterRole('all')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                  filterRole === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Tous
              </button>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterRole(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                    filterRole === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <Card className="bg-white border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const RoleIcon = ROLE_ICONS[user.role] || Users
                    return (
                      <div
                        key={user.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                          !user.active && 'opacity-50'
                        )}
                      >
                        {/* Avatar */}
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback
                            className={cn(
                              'text-white text-sm font-bold',
                              getAvatarColor(user.role)
                            )}
                          >
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {user.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] h-5 px-1.5 border', getRoleBadge(user.role))}
                            >
                              <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                              {ROLE_LABELS[user.role] || user.role}
                            </Badge>
                            {!user.active && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-gray-300 text-gray-400">
                                Inactif
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="truncate">{user.email}</span>
                            {user.phone && <span>{user.phone}</span>}
                            <span>Créé le {formatDate(user.createdAt)}</span>
                          </div>
                        </div>

                        {/* Stats mini */}
                        {user.counts && (
                          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                            <span>{user.counts.clients} clients</span>
                            <span>•</span>
                            <span>{user.counts.orders} cmd</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {user.active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeactivate(user.id, user.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-900 font-medium">Aucun utilisateur trouvé</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {searchQuery || filterRole !== 'all'
                          ? 'Essayez de modifier vos filtres'
                          : 'Créez votre premier utilisateur'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <UserFormModal
        mode="create"
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />

      {/* Edit Modal */}
      <UserFormModal
        mode="edit"
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  )
}
