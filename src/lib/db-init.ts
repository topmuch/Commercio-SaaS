/**
 * Database Schema Initialization
 *
 * Ensures all tables and columns exist in the SQLite database.
 * This runs at app startup via instrumentation.ts to handle cases where
 * `prisma db push` fails or wasn't executed (e.g. Docker deployment).
 *
 * Uses raw SQL to bypass Prisma's schema validation.
 */

import { db } from '@/lib/db'

let initialized = false

export async function initDatabase(): Promise<void> {
  if (initialized) return
  initialized = true

  try {
    // ── 1. Ensure StoreBanner table exists ──
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoreBanner" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "imageUrl" TEXT NOT NULL,
        "title" TEXT,
        "subtitle" TEXT,
        "linkUrl" TEXT,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "startDate" DATETIME,
        "endDate" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('[DB Init] StoreBanner table ready')

    // ── 2. Ensure WhatsappOrder table exists ──
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WhatsappOrder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "clientName" TEXT NOT NULL,
        "clientPhone" TEXT NOT NULL,
        "items" TEXT NOT NULL DEFAULT '[]',
        "totalAmount" REAL NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'en_attente_validation',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('[DB Init] WhatsappOrder table ready')

    // ── 3. Ensure StoreSettings has all required columns ──
    const columns = await db.$queryRawUnsafe<{ name: string }[]>(
      `PRAGMA table_info("StoreSettings")`
    )
    const colNames = columns.map((c) => c.name)

    const storeSettingsColumns: Record<string, string> = {
      logoUrl: 'ALTER TABLE "StoreSettings" ADD COLUMN "logoUrl" TEXT',
      primaryColor:
        'ALTER TABLE "StoreSettings" ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT \'#10B981\'',
      storeDescription:
        'ALTER TABLE "StoreSettings" ADD COLUMN "storeDescription" TEXT',
      seoTitle: 'ALTER TABLE "StoreSettings" ADD COLUMN "seoTitle" TEXT',
      seoDescription:
        'ALTER TABLE "StoreSettings" ADD COLUMN "seoDescription" TEXT',
      seoImage: 'ALTER TABLE "StoreSettings" ADD COLUMN "seoImage" TEXT',
      companyLogo:
        'ALTER TABLE "StoreSettings" ADD COLUMN "companyLogo" TEXT',
      companyName:
        'ALTER TABLE "StoreSettings" ADD COLUMN "companyName" TEXT',
      companyAddress:
        'ALTER TABLE "StoreSettings" ADD COLUMN "companyAddress" TEXT',
      smtpHost: 'ALTER TABLE "StoreSettings" ADD COLUMN "smtpHost" TEXT',
      smtpPort:
        'ALTER TABLE "StoreSettings" ADD COLUMN "smtpPort" INTEGER',
      smtpUser: 'ALTER TABLE "StoreSettings" ADD COLUMN "smtpUser" TEXT',
      smtpPass: 'ALTER TABLE "StoreSettings" ADD COLUMN "smtpPass" TEXT',
      emailFrom:
        'ALTER TABLE "StoreSettings" ADD COLUMN "emailFrom" TEXT',
      emailSignature:
        'ALTER TABLE "StoreSettings" ADD COLUMN "emailSignature" TEXT',
    }

    let addedCount = 0
    for (const [col, sql] of Object.entries(storeSettingsColumns)) {
      if (!colNames.includes(col)) {
        try {
          await db.$executeRawUnsafe(sql)
          addedCount++
        } catch (err) {
          // Column might already exist with a different type, ignore duplicate errors
          const msg = err instanceof Error ? err.message : String(err)
          if (!msg.includes('duplicate column')) {
            console.error(`[DB Init] Error adding column ${col}:`, msg)
          }
        }
      }
    }
    if (addedCount > 0) {
      console.log(`[DB Init] Added ${addedCount} column(s) to StoreSettings`)
    }

    // ── 4. Create indexes for StoreBanner and WhatsappOrder ──
    try {
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "StoreBanner_companyId_idx" ON "StoreBanner"("companyId")`
      )
    } catch { /* ignore */ }

    try {
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "WhatsappOrder_companyId_idx" ON "WhatsappOrder"("companyId")`
      )
    } catch { /* ignore */ }

    try {
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "WhatsappOrder_status_idx" ON "WhatsappOrder"("status")`
      )
    } catch { /* ignore */ }

    try {
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "WhatsappOrder_createdAt_idx" ON "WhatsappOrder"("createdAt")`
      )
    } catch { /* ignore */ }

    console.log('[DB Init] Database schema verified successfully')
  } catch (error) {
    console.error('[DB Init] Critical error during initialization:', error)
    // Don't throw — let the app continue, most features will still work
  }
}
