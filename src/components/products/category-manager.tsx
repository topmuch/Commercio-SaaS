'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface Category {
  id: string
  name: string
  parentId?: string
  image?: string
  _count?: { products: number; children: number }
}

interface CategoryManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoriesChange: () => void
}

export function CategoryManager({
  open,
  onOpenChange,
  onCategoriesChange,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [adding, setAdding] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [updating, setUpdating] = useState(false)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      const json = await res.json()
      setCategories(json.data ?? [])
    } catch {
      toast.error('Erreur lors du chargement des catégories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchCategories()
      // Reset form state on open
      setNewCategoryName('')
      setEditingId(null)
      setDeleteTarget(null)
    }
  }, [open, fetchCategories])

  const handleAdd = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    setAdding(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        throw new Error(data.error || 'Erreur serveur')
      }
      setNewCategoryName('')
      toast.success(`Catégorie "${trimmed}" ajoutée`)
      fetchCategories()
      onCategoriesChange()
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de l'ajout de la catégorie"
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to update category')
      toast.success('Catégorie mise à jour')
      setEditingId(null)
      setEditName('')
      fetchCategories()
      onCategoriesChange()
    } catch {
      toast.error("Erreur lors de la modification")
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete category')
      toast.success(`Catégorie "${deleteTarget.name}" supprimée`)
      setDeleteTarget(null)
      fetchCategories()
      onCategoriesChange()
    } catch {
      toast.error("Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingId) {
        handleSaveEdit()
      } else {
        handleAdd()
      }
    }
    if (e.key === 'Escape' && editingId) {
      handleCancelEdit()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestion des Catégories</DialogTitle>
            <DialogDescription>
              Ajoutez, modifiez ou supprimez les catégories de produits.
            </DialogDescription>
          </DialogHeader>

          {/* Add category form */}
          <div className="flex gap-2">
            <Input
              placeholder="Nom de la catégorie"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={adding}
            />
            <Button onClick={handleAdd} disabled={adding || !newCategoryName.trim()}>
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span className="sr-only sm:not-sr-only">Ajouter</span>
            </Button>
          </div>

          {/* Category list */}
          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <FolderOpen className="size-8" />
                <p className="text-sm">Aucune catégorie</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    {editingId === category.id ? (
                      /* Inline edit mode */
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={updating}
                          autoFocus
                          className="h-8"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={updating || !editName.trim()}
                        >
                          {updating ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            'Enregistrer'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={updating}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      /* Display mode */
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">
                            {category.name}
                          </span>
                          {category._count?.products != null && (
                            <Badge variant="secondary" className="shrink-0">
                              {category._count.products} produit
                              {category._count.products > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => handleStartEdit(category)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Modifier</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(category)}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong>{deleteTarget?.name}</strong>
              {deleteTarget?._count?.products != null &&
                deleteTarget._count.products > 0 && (
                  <span>
                    {' '}
                    et ses {deleteTarget._count.products} produit
                    {deleteTarget._count.products > 1 ? 's' : ''} associé
                    {deleteTarget._count.products > 1 ? 's' : ''} ?
                  </span>
                )}
              {' '}Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
