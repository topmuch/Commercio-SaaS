import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import crypto from 'crypto'
import { getCompanyId } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// Upload directory: configurable via env, default to ./uploads in dev
function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) return process.env.UPLOADS_DIR
  return 'uploads'
}

// Use string concatenation instead of path.join to avoid Turbopack NFT issues
function resolveUploadPath(...segments: string[]): string {
  return segments.filter(Boolean).join('/').replace(/\/+/g, '/')
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// POST /api/upload — Upload a file to uploads/{folder}/
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const companyId = await getCompanyId()
    if (!companyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'boutique'
    // Sanitize folder name to prevent path traversal
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/\.\./g, '').trim() || 'boutique'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé. Types acceptés: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximale: 5MB` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const randomString = crypto.randomBytes(8).toString('hex')
    const sanitizedName = sanitizeFilename(file.name || 'image')
    const ext = sanitizedName.split('.').pop() || 'jpg'
    const filename = `${Date.now()}-${randomString}.${ext}`

    // Upload to configurable directory (default: /app/uploads)
    const uploadsBase = getUploadsDir()
    const uploadDir = resolveUploadPath(uploadsBase, safeFolder)
    await mkdir(uploadDir, { recursive: true })

    // Read file buffer and write to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = resolveUploadPath(uploadDir, filename)
    await writeFile(filePath, buffer)

    // URL served via /uploads/* rewrite → /api/uploads/* handler
    const url = `/uploads/${safeFolder}/${filename}`

    return NextResponse.json({
      url,
      fileName: filename,
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors du téléchargement'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}