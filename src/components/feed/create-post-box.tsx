'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Paperclip, X, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { formatFileSize } from '@/lib/feed-utils'
import { getInitials } from '@/lib/feed-utils'

interface FileAttachment {
  file: File
  preview?: string
  id: string
}

const MAX_CONTENT_LENGTH = 2000

export function CreatePostBox({ currentUserName, authorId }: { currentUserName?: string; authorId?: string }) {
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<FileAttachment[]>([])
  const [docFiles, setDocFiles] = useState<FileAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const allFiles = [...imageFiles, ...docFiles]
  const canSubmit = (content.trim().length > 0 || allFiles.length > 0) && !isSubmitting

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: FileAttachment[] = Array.from(files).map((file) => ({
      file,
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file),
    }))

    setImageFiles((prev) => [...prev, ...newFiles])
    // Reset the input so the same file can be selected again
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [])

  const handleDocSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: FileAttachment[] = Array.from(files).map((file) => ({
      file,
      id: crypto.randomUUID(),
    }))

    setDocFiles((prev) => [...prev, ...newFiles])
    if (docInputRef.current) docInputRef.current.value = ''
  }, [])

  const removeFile = useCallback((id: string, type: 'image' | 'doc') => {
    if (type === 'image') {
      setImageFiles((prev) => {
        const file = prev.find((f) => f.id === id)
        if (file?.preview) URL.revokeObjectURL(file.preview)
        return prev.filter((f) => f.id !== id)
      })
    } else {
      setDocFiles((prev) => prev.filter((f) => f.id !== id))
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      if (authorId) formData.append('authorId', authorId)
      if (content.trim()) {
        formData.append('content', content.trim())
      }
      imageFiles.forEach((img) => formData.append('images', img.file))
      docFiles.forEach((doc) => formData.append('documents', doc.file))

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setContent('')
        setImageFiles([])
        setDocFiles([])
        queryClient.invalidateQueries({ queryKey: ['feed'] })
        toast.success('Publication ajoutée !')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Erreur lors de la publication")
      }
    } catch {
      toast.error('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, content, imageFiles, docFiles, queryClient, authorId])

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Author + Textarea */}
      <div className="p-4 pb-0">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-orange-500 text-white text-sm font-bold">
              {getInitials(currentUserName || 'Utilisateur')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                  setContent(e.target.value)
                }
              }}
              placeholder="Quoi de neuf dans l'équipe ?"
              rows={3}
              className="w-full resize-none border-0 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-0 py-1.5"
            />
          </div>
        </div>
      </div>

      {/* File previews */}
      {allFiles.length > 0 && (
        <div className="px-4 pt-3 pb-0">
          {/* Image previews */}
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {imageFiles.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="h-20 w-20 object-cover"
                  />
                  <button
                    onClick={() => removeFile(img.id, 'image')}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    type="button"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Document previews */}
          {docFiles.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {docFiles.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                >
                  <Paperclip className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="flex-1 text-gray-900 truncate min-w-0">
                    {doc.file.name}
                  </span>
                  <span className="text-gray-500 text-xs shrink-0">
                    {formatFileSize(doc.file.size)}
                  </span>
                  <button
                    onClick={() => removeFile(doc.id, 'doc')}
                    className="h-5 w-5 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
                    type="button"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            multiple
            onChange={handleDocSelect}
            className="hidden"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 gap-1.5"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Photo</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => docInputRef.current?.click()}
            className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 gap-1.5"
          >
            <Paperclip className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Fichier</span>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Character count */}
          <span className={`text-xs ${content.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
            {content.length}/{MAX_CONTENT_LENGTH}
          </span>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publication...</span>
              </>
            ) : (
              <span>Publier</span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
