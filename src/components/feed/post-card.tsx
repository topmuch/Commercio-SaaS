'use client'

import React, { useState } from 'react'
import { Pin, Trash2, MessageCircle, FileText, Download, ThumbsUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getTimeAgo, formatFileSize, formatCount, getInitials } from '@/lib/feed-utils'
import { CommentSection } from './comment-section'
import { ReactionPicker } from './reaction-picker'

// ── Types ──

export interface FeedPostAttachment {
  id: string
  type: string
  fileUrl: string
  fileName: string
  mimeType?: string
  fileSize?: number
}

export interface FeedPostComment {
  id: string
  content: string
  authorId: string
  createdAt: string
  author: {
    id: string
    name: string
    avatar?: string | null
  }
}

export interface FeedPostAuthor {
  id: string
  name: string
  avatar?: string | null
}

export interface FeedPost {
  id: string
  content: string | null
  authorId: string
  companyId: string
  isPinned: boolean
  likesCount: number
  commentsCount: number
  createdAt: string
  author: FeedPostAuthor
  attachments: FeedPostAttachment[]
  currentUserReaction?: { type: string } | null
  comments: FeedPostComment[]
}

interface PostCardProps {
  post: FeedPost
  currentUserId?: string
  onReact: (postId: string, reactionType: string) => void
  onDelete: (postId: string) => void
  onAddComment: (postId: string, content: string) => Promise<void>
}

// ── Helpers ──

const REACTION_LABELS: Record<string, string> = {
  like: "J'aime",
  love: "J'aime",
  celebrate: 'Bravo',
  insight: 'Super',
}

function getReactionEmoji(type: string): string {
  switch (type) {
    case 'like': return '👍'
    case 'love': return '❤️'
    case 'celebrate': return '🎉'
    case 'insight': return '💡'
    default: return '👍'
  }
}

function isImageAttachment(att: FeedPostAttachment): boolean {
  return att.mimeType?.startsWith('image/') || att.type === 'image'
}

// ── Image Gallery Component ──

function ImageGallery({ attachments }: { attachments: FeedPostAttachment[] }) {
  const images = attachments.filter(isImageAttachment)
  if (images.length === 0) return null

  const gridClass =
    images.length === 1
      ? 'grid-cols-1'
      : images.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-3'

  const imageClass =
    images.length === 1
      ? 'max-h-96'
      : 'max-h-64'

  return (
    <div className={`grid ${gridClass} gap-1.5`}>
      {images.map((img, index) => (
        <a
          key={img.id}
          href={img.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`relative rounded-lg overflow-hidden bg-gray-100 ${imageClass} ${images.length === 1 ? 'w-full' : 'w-full'}`}
        >
          <img
            src={img.fileUrl}
            alt={img.fileName || `Image ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  )
}

// ── Document Attachments Component ──

function DocumentAttachments({ attachments }: { attachments: FeedPostAttachment[] }) {
  const docs = attachments.filter((att) => !isImageAttachment(att))
  if (docs.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {docs.map((doc) => (
        <a
          key={doc.id}
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
        >
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
            {doc.fileSize && (
              <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
            )}
          </div>
          <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
        </a>
      ))}
    </div>
  )
}

// ── Main PostCard Component ──

export function PostCard({ post, currentUserId, onReact, onDelete, onAddComment }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const isAuthor = currentUserId && currentUserId === post.authorId
  const isReacted = !!post.currentUserReaction

  const handleReaction = (type: string) => {
    onReact(post.id, type)
    setShowReactionPicker(false)
  }

  const handleToggleLike = () => {
    if (isReacted) {
      onReact(post.id, '')
    } else {
      onReact(post.id, 'like')
    }
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* ── Author Header ── */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-orange-500 text-white text-sm font-bold">
            {getInitials(post.author.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900 truncate">
              {post.author.name}
            </span>
            <span className="text-gray-400 text-sm">•</span>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {getTimeAgo(post.createdAt)}
            </span>
            {post.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-xs text-orange-600">
                <Pin className="h-3 w-3" />
                <span className="font-medium">Épinglé</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>
      )}

      {/* ── Attachments ── */}
      {post.attachments.length > 0 && (
        <div className="px-4 pb-3">
          <ImageGallery attachments={post.attachments} />
          <DocumentAttachments attachments={post.attachments} />
        </div>
      )}

      {/* ── Stats Bar ── */}
      {(post.likesCount > 0 || post.commentsCount > 0) && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              {post.likesCount > 0 && (
                <>
                  <span className="inline-flex items-center gap-0.5">
                    <span>👍</span>
                    <span className="text-gray-700 font-medium">{formatCount(post.likesCount)}</span>
                  </span>
                  <span className="text-gray-400">réaction{post.likesCount > 1 ? 's' : ''}</span>
                </>
              )}
            </div>
            {post.commentsCount > 0 && (
              <button
                onClick={() => setShowComments(!showComments)}
                className="hover:text-gray-700 hover:underline transition-colors"
              >
                {post.commentsCount} commentaire{post.commentsCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      <Separator className="bg-gray-100" />

      {/* ── Action Buttons ── */}
      <div className="relative px-1 py-1">
        {/* Reaction picker popup */}
        {showReactionPicker && (
          <div className="absolute bottom-full left-0 mb-1 z-20">
            <ReactionPicker
              currentReaction={post.currentUserReaction?.type}
              onSelect={handleReaction}
              onClose={() => setShowReactionPicker(false)}
            />
          </div>
        )}

        <div className="flex items-center">
          {/* Like / React button */}
          <button
            onClick={handleToggleLike}
            onMouseEnter={() => setShowReactionPicker(true)}
            onMouseLeave={() => {
              // Delay to allow moving to the picker
              setTimeout(() => setShowReactionPicker(false), 200)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isReacted
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isReacted ? (
              <>
                <span className="text-base">{getReactionEmoji(post.currentUserReaction?.type || 'like')}</span>
                <span>{REACTION_LABELS[post.currentUserReaction?.type || 'like']}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="h-4 w-4" />
                <span>J&apos;aime</span>
              </>
            )}
          </button>

          {/* Comment button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Commenter</span>
          </button>

          {/* Delete button (author only) */}
          {isAuthor && (
            <button
              onClick={() => onDelete(post.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Comment Section (expandable) ── */}
      {showComments && (
        <div className="border-t border-gray-100">
          <CommentSection
            postId={post.id}
            comments={post.comments}
            onAddComment={onAddComment}
          />
        </div>
      )}
    </Card>
  )
}
