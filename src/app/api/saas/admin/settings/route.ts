import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const SETTINGS_FILE = path.join(process.cwd(), 'platform-settings.json')

// Default settings
const defaultSettings = {
  companyName: 'Commercio',
  companyEmail: 'contact@commercio.com',
  companyPhone: '+221 77 123 45 67',
  companyAddress: 'Dakar, Sénégal',
  seoTitle: 'Commercio - ERP CRM Gestion Commerciale',
  seoDescription: 'Solution ERP CRM complète pour la gestion commerciale',
  smtpHost: '',
  smtpPort: '',
  smtpUser: '',
  emailSignature: '',
  enableEmailNotifications: true,
  enableWhatsAppNotifications: true,
}

// Helper to read settings
async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(data) }
  } catch {
    return defaultSettings
  }
}

// Helper to write settings
async function writeSettings(settings: typeof defaultSettings) {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

// GET /api/saas/admin/settings - Get platform settings
export async function GET() {
  try {
    const settings = await readSettings()
    return NextResponse.json({ data: settings })
  } catch (error: unknown) {
    console.error('[GET /api/saas/admin/settings] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/saas/admin/settings - Update platform settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate settings
    const settings = {
      ...defaultSettings,
      ...body,
    }

    await writeSettings(settings)

    return NextResponse.json({
      data: settings,
      message: 'Paramètres sauvegardés avec succès',
    })
  } catch (error: unknown) {
    console.error('[PATCH /api/saas/admin/settings] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}