import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/posts/[id]/comments - List top-level comments for a post
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify the post exists
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Publication non trouvée.' },
        { status: 404 }
      )
    }

    // Fetch top-level comments only (parentCommentId is null)
    const comments = await db.postComment.findMany({
      where: {
        postId: id,
        parentCommentId: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
        replies: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      author: comment.author,
      repliesCount: comment.replies.length,
      createdAt: comment.createdAt,
    }))

    return NextResponse.json({
      comments: formattedComments,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/posts/[id]/comments - Create a comment on a post (auth required, no spoofing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const session = await getAuthSession()
    const { id } = await params
    const body = await request.json()
    const { content, parentCommentId } = body

    // Get authorId from session (NOT from client body to prevent spoofing)
    const authorId = (session?.user as { id?: string })?.id

    if (!authorId || !content) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour commenter.' },
        { status: 401 }
      )
    }

    // Verify the post exists and belongs to the same company
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, commentsCount: true, companyId: true },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Publication non trouvée.' },
        { status: 404 }
      )
    }

    if (post.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Non autorisé.' },
        { status: 403 }
      )
    }

    // If replying to a comment, verify the parent comment exists
    if (parentCommentId) {
      const parentComment = await db.postComment.findUnique({
        where: { id: parentCommentId },
        select: { id: true },
      })
      if (!parentComment) {
        return NextResponse.json(
          { error: 'Commentaire parent non trouvé.' },
          { status: 404 }
        )
      }
    }

    // Create comment and increment commentsCount in a transaction
    const comment = await db.$transaction(async (tx) => {
      const createdComment = await tx.postComment.create({
        data: {
          postId: id,
          authorId,
          content,
          parentCommentId: parentCommentId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      })

      // Increment the post's commentsCount (only for top-level comments)
      if (!parentCommentId) {
        await tx.post.update({
          where: { id },
          data: {
            commentsCount: {
              increment: 1,
            },
          },
        })
      }

      return createdComment
    })

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          postId: comment.postId,
          authorId: comment.authorId,
          content: comment.content,
          parentCommentId: comment.parentCommentId,
          author: comment.author,
          repliesCount: 0,
          createdAt: comment.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
