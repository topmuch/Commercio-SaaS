'use client'

import React, { useState, useCallback } from 'react'
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Newspaper, Search, Loader2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { CreatePostBox } from '@/components/feed/create-post-box'
import { PostCard, type FeedPost } from '@/components/feed/post-card'
import { FeedFilters, type FeedFilter } from '@/components/feed/feed-filters'

// ── Fetch helpers ──

async function fetchFeed({
  page,
  filter,
  search,
  authorId,
}: {
  page: number
  filter: FeedFilter
  search: string
  authorId: string
}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10',
    filter,
    search,
    authorId,
  })
  const res = await fetch(`/api/posts?${params}`)
  if (!res.ok) throw new Error('Erreur chargement')
  return res.json()
}

// ── Main Discussions Page ──

export default function DiscussionsPage() {
  const user = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const currentUserId = user?.id || ''
  const currentUserName = user?.name || ''

  // Infinite scroll query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', activeFilter, searchQuery],
    queryFn: ({ pageParam }) =>
      fetchFeed({
        page: pageParam as number,
        filter: activeFilter,
        search: searchQuery,
        authorId: currentUserId,
      }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined
    },
    initialPageParam: 1,
  })

  // Flatten posts from all pages
  const posts: FeedPost[] = data?.pages.flatMap((page) => page.posts) || []

  // ── Reaction handler ──
  const handleReact = useCallback(
    async (postId: string, reactionType: string) => {
      try {
        const res = await fetch(`/api/posts/${postId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, type: reactionType }),
        })
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['feed'] })
        }
      } catch {
        toast.error('Erreur lors de la réaction')
      }
    },
    [currentUserId, queryClient]
  )

  // ── Delete handler ──
  const handleDelete = useCallback(
    async (postId: string) => {
      try {
        const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
        if (res.ok) {
          toast.success('Publication supprimée')
          queryClient.invalidateQueries({ queryKey: ['feed'] })
        } else {
          toast.error('Erreur lors de la suppression')
        }
      } catch {
        toast.error('Erreur lors de la suppression')
      }
    },
    [queryClient]
  )

  // ── Comment handler ──
  const handleAddComment = useCallback(
    async (postId: string, content: string) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: currentUserId, content }),
      })
      if (!res.ok) {
        toast.error('Erreur lors de l\'ajout du commentaire')
      }
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
    [currentUserId, queryClient]
  )

  // ── Search handler with debounce ──
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-orange-500" />
              Fil d&apos;actualité
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Partagez et échangez avec votre équipe
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Create Post Box */}
          <CreatePostBox
            currentUserName={currentUserName}
            authorId={currentUserId}
          />

          {/* Filters + Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <FeedFilters
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
            <div className="relative sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 h-9 text-sm bg-white border-gray-200 w-full sm:w-48"
              />
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts Feed */}
          {!isLoading && posts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-900 font-medium">Aucune publication</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery
                  ? `Aucun résultat pour "${searchQuery}"`
                  : 'Soyez le premier à publier quelque chose !'}
              </p>
            </div>
          )}

          {!isLoading && (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onReact={handleReact}
                  onDelete={handleDelete}
                  onAddComment={handleAddComment}
                />
              ))}

              {/* Load More / Infinite Scroll Trigger */}
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Chargement...</span>
                      </>
                    ) : (
                      <span>Voir plus de publications</span>
                    )}
                  </button>
                </div>
              )}

              {/* End of feed */}
              {!hasNextPage && posts.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400">Vous avez tout vu !</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
