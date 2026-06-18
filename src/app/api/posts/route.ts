import { db } from '@/lib/db'
import { getCompanyId, getAuthSession, ensureDefaultUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/posts - List posts with filters, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''
    const authorId = searchParams.get('authorId') || ''

    const where: Record<string, unknown> = { companyId }

    // Filter logic
    if (filter === 'images') {
      where.attachments = {
        some: { type: 'image' },
      }
    } else if (filter === 'documents') {
      where.attachments = {
        some: { type: 'document' },
      }
    } else if (filter === 'mine' && authorId) {
      where.authorId = authorId
    }

    // Search in content (SQLite doesn't support mode: 'insensitive')
    if (search) {
      where.content = { contains: search }
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          attachments: true,
          reactions: {
            select: {
              id: true,
              userId: true,
              type: true,
            },
          },
          _count: {
            select: {
              comments: { where: { parentCommentId: null } },
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.post.count({ where }),
    ])

    // Map posts to response shape (counts already included via _count)
    const postsWithDetails = posts.map((post) => ({
      id: post.id,
      content: post.content,
      authorId: post.authorId,
      companyId: post.companyId,
      author: post.author,
      attachments: post.attachments.map((a) => ({
        id: a.id,
        type: a.type,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
      })),
      reactions: post.reactions,
      likesCount: post.likesCount,
      commentsCount: post._count.comments,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
    }))

    return NextResponse.json({
      posts: postsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/posts - Create a new post (accepts FormData with files)
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const formData = await request.formData()
    const content = formData.get('content') as string | null

    // SECURITY: Get the real user ID from session — ignore any client-provided authorId
    const session = await getAuthSession()
    let authorId: string | null = null
    let author: { id: string; name: string; avatar: string | null } | null = null

    if (session?.user) {
      authorId = (session.user as { id: string }).id
      author = await db.user.findUnique({
        where: { id: authorId },
        select: { id: true, name: true, avatar: true },
      })
    }

    // Fallback: find first active user in company if session lookup fails
    if (!author) {
      author = await db.user.findFirst({
        where: { active: true, companyId },
        select: { id: true, name: true, avatar: true },
      })
      if (!author) {
        // Try any user in this company
        author = await db.user.findFirst({
          where: { companyId },
          select: { id: true, name: true, avatar: true },
        })
      }
    }

    // If still no user, auto-create a default admin user
    if (!author) {
      const defaultUserId = await ensureDefaultUser(companyId)
      authorId = defaultUserId
      author = await db.user.findUnique({
        where: { id: defaultUserId },
        select: { id: true, name: true, avatar: true },
      })
    } else {
      authorId = author.id
    }

    // Process uploaded files
    const { writeFile, mkdir } = await import('fs/promises')
    const path = await import('path')

    const attachmentData: Array<{
      type: string
      fileUrl: string
      fileName: string
      mimeType: string
      fileSize: number
    }> = []

    // Collect all image files (field name: "images")
    const images = formData.getAll('images').filter((f) => f instanceof File && f.size > 0)
    const documents = formData.getAll('documents').filter((f) => f instanceof File && f.size > 0)

    const allFiles = [...images, ...documents]

    for (const file of allFiles) {
      const f = file as File
      const bytes = await f.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const isImage = f.type.startsWith('image/')
      const fileType = isImage ? 'image' : 'document'

      const timestamp = Date.now()
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const uniqueFileName = `${timestamp}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

      const uploadsBase = process.env.UPLOADS_DIR || 'uploads'
      const uploadDir = path.join(uploadsBase, 'posts')
      await mkdir(uploadDir, { recursive: true })

      const filePath = path.join(uploadDir, uniqueFileName)
      await writeFile(filePath, buffer)

      attachmentData.push({
        type: fileType,
        fileUrl: `/uploads/posts/${uniqueFileName}`,
        fileName: f.name,
        mimeType: f.type,
        fileSize: f.size,
      })
    }

    // Create post and attachments in a transaction
    const post = await db.$transaction(async (tx) => {
      return tx.post.create({
        data: {
          content: content || null,
          authorId,
          companyId,
          attachments: attachmentData.length > 0
            ? {
                create: attachmentData,
              }
            : undefined,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          attachments: true,
        },
      })
    })

    return NextResponse.json(
      {
        post: {
          id: post.id,
          content: post.content,
          authorId: post.authorId,
          companyId: post.companyId,
          author: post.author,
          attachments: post.attachments.map((a) => ({
            id: a.id,
            type: a.type,
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            mimeType: a.mimeType,
            fileSize: a.fileSize,
          })),
          reactions: [],
          likesCount: 0,
          commentsCount: 0,
          isPinned: false,
          createdAt: post.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    console.error('Error creating post:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
