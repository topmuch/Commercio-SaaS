'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
  className?: string
  previewClassName?: string
  placeholder?: string
}

export function ImageUpload({
  value,
  onChange,
  label = 'Importer une image',
  folder = 'general',
  className,
  previewClassName,
  placeholder = 'Aucune image',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Erreur lors de l'upload")
        return
      }

      if (json.url) {
        onChange(json.url)
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleUpload}
      />

      {value ? (
        <div className={cn('relative group rounded-xl border border-border overflow-hidden', previewClassName)}>
          <img
            src={value}
            alt="Aperçu"
            className="w-full h-full object-contain bg-muted/30"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Remplacer
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border',
            'p-6 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer w-full',
            previewClassName
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Envoi en cours...' : label}
          </span>
        </button>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
