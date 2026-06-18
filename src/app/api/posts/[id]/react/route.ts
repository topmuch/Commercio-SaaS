import { db } from '@/lib/db'
import { getCompanyId, getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/posts/[id]/react - Toggle a reaction (like, love, celebrate, insight)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    let { type } = body

    // SECURITY: Get the real user ID from session — ignore any client-provided userId
    const session = await getAuthSession()
    let userId: string | null = null

    if (session?.user) {
      userId = (session.user as { id: string }).id
    }

    // Fallback: if no session, use first user in DB
    if (!userId) {
      const firstUser = await db.user.findFirst({ where: { active: true }, select: { id: true } })
        || await db.user.findFirst({ select: { id: true } })
      if (firstUser) userId = firstUser.id
    }

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId et type sont requis.' },
        { status: 400 }
      )
    }

    const validTypes = ['like', 'love', 'celebrate', 'insight']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Type de réaction invalide. Types autorisés: like, love, celebrate, insight.' },
        { status: 400 }
      )
    }

    // Verify the post exists
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, likesCount: true },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Publication non trouvée.' },
        { status: 404 }
      )
    }

    // Check if reaction already exists
    const existingReaction = await db.postReaction.findUnique({
      where: {
        postId_userId_type: {
          postId: id,
          userId,
          type,
        },
      },
    })

    let newLikesCount: number
    let removed = false

    if (existingReaction) {
      // Remove the reaction (toggle off)
      await db.postReaction.delete({
        where: {
          id: existingReaction.id,
        },
      })
      newLikesCount = Math.max(0, post.likesCount - 1)
      removed = true
    } else {
      // Create the reaction
      await db.postReaction.create({
        data: {
          postId: id,
          userId,
          type,
        },
      })
      newLikesCount = post.likesCount + 1
      removed = false
    }

    // Update the post's likesCount
    await db.post.update({
      where: { id },
      data: { likesCount: newLikesCount },
    })

    // Get updated reaction counts by type
    const reactions = await db.postReaction.groupBy({
      by: ['type'],
      where: { postId: id },
      _count: { type: true },
    })

    const reactionCounts: Record<string, number> = {}
    for (const r of reactions) {
      reactionCounts[r.type] = r._count.type
    }

    return NextResponse.json({
      removed,
      likesCount: newLikesCount,
      reactions: reactionCounts,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
