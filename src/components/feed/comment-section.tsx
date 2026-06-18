'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getTimeAgo, getInitials } from '@/lib/feed-utils'
import type { FeedPostComment } from './post-card'

interface CommentSectionProps {
  postId: string
  comments: FeedPostComment[]
  onAddComment: (postId: string, content: string) => Promise<void>
}

const INITIAL_VISIBLE_COMMENTS = 3

export function CommentSection({ postId, comments, onAddComment }: CommentSectionProps) {
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new comments are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAddComment(postId, commentText.trim())
      setCommentText('')
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commentText.trim()) {
      handleSubmit()
    }
  }

  const hasHiddenComments = comments.length > INITIAL_VISIBLE_COMMENTS
  const visibleComments = isExpanded || !hasHiddenComments
    ? comments
    : comments.slice(0, INITIAL_VISIBLE_COMMENTS)

  return (
    <div className="px-4 py-3">
      {/* Expand / Collapse button */}
      {hasHiddenComments && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 mb-2 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Masquer les commentaires
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Voir les {comments.length} commentaires
            </>
          )}
        </button>
      )}

      {/* Comments list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {visibleComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* Empty state */}
      {comments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Aucun commentaire pour le moment
        </p>
      )}

      <Separator className="bg-gray-100 my-3" />

      {/* Reply input */}
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-orange-500 text-white text-[10px] font-bold">
            MO
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un commentaire..."
            className="flex-1 h-8 px-3 text-sm rounded-full border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-all"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!commentText.trim() || isSubmitting}
            className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Single Comment Item ──

function CommentItem({ comment }: { comment: FeedPostComment }) {
  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarFallback className="bg-orange-500 text-white text-[10px] font-bold">
          {getInitials(comment.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-gray-900">
              {comment.author.name}
            </span>
            <span className="text-[10px] text-gray-500">
              {getTimeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>
      </div>
    </div>
  )
}
