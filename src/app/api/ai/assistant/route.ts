import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'
import { NextRequest, NextResponse } from 'next/server'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const body = await request.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages invalides' },
        { status: 400 }
      )
    }

    // Récupérer les données du company pour le contexte
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        plan: true,
        createdAt: true,
      },
    })

    // Récupérer les statistiques récentes
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalClients,
      totalProducts,
      totalOrders,
      recentOrders,
      totalRevenue,
    ] = await Promise.all([
      db.client.count({ where: { companyId } }),
      db.product.count({ where: { companyId } }),
      db.order.count({ where: { companyId } }),
      db.order.findMany({
        where: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          number: true,
          total: true,
          status: true,
          createdAt: true,
          client: {
            select: {
              companyName: true,
            },
          },
        },
      }),
      db.invoice.aggregate({
        where: {
          companyId,
          status: 'paid',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          total: true,
        },
      }),
    ])

    const stats = {
      company: {
        name: company?.name,
        plan: company?.plan,
      },
      metrics: {
        totalClients,
        totalProducts,
        totalOrders,
        recentOrdersCount: recentOrders.length,
        totalRevenue30Days: totalRevenue._sum.total || 0,
      },
      recentOrders: recentOrders.map(o => ({
        number: o.number,
        total: o.total,
        status: o.status,
        date: o.createdAt,
        client: o.client.companyName,
      })),
    }

    // Construire le système prompt avec contexte business
    const systemPrompt = `Tu es un assistant commercial intelligent pour Commercio, une plateforme de gestion CRM/ERP.

CONTEXTE DE L'ENTREPRISE:
${JSON.stringify(stats, null, 2)}

TES RÔLES:
1. Assistant Commercial: Aide les commerciaux à gérer leurs clients, commandes, et devis
2. Analyste: Fournis des insights basés sur les données réelles de l'entreprise
3. Conseiller: Donne des recommandations pour améliorer les ventes

COMPÉTENCES:
- Analyse des données de vente et revenus
- Suggestions basées sur les tendances récentes
- Aide à la prise de décision commerciale
- Réponds aux questions sur les clients, produits, commandes
- Donne des conseils stratégiques

DIRECTIVES:
- Utilise toujours les données réelles du contexte quand c'est pertinent
- Sois concis et précis
- Propose des actions concrètes
- Adapte ton ton selon le type de question (analytique, conseil, réponse directe)
- Pour les données financières, utilise le format monétaire approprié

Si tu n'as pas assez d'informations, demande des clarifications.`

    // Initialiser LLM
    const ai = await ZAI.create()
    const llm = new ai.LLM({
      apiKey: process.env.ZAI_API_KEY || '',
    })

    // Construire l'historique de conversation
    const conversationHistory = messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Ajouter le système prompt au début
    conversationHistory.unshift({
      role: 'system',
      content: systemPrompt,
    })

    // Générer la réponse
    const response = await llm.chat({
      messages: conversationHistory,
      temperature: 0.7,
      maxTokens: 1000,
    })

    return NextResponse.json({
      data: {
        message: response.content,
        usage: response.usage,
      },
    })
  } catch (error: unknown) {
    console.error('[POST /api/ai/assistant] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Récupérer des suggestions prédéfinies
export async function GET() {
  try {
    const suggestions = [
      {
        id: 'analytics',
        category: 'Analytics',
        question: 'Analyse mes ventes des 30 derniers jours',
        icon: '📊',
      },
      {
        id: 'clients',
        category: 'CRM',
        question: 'Quels sont mes clients les plus fidèles?',
        icon: '👥',
      },
      {
        id: 'products',
        category: 'Produits',
        question: 'Quels produits se vendent le mieux?',
        icon: '📦',
      },
      {
        id: 'trends',
        category: 'Tendances',
        question: 'Quelles sont les tendances de mes ventes?',
        icon: '📈',
      },
      {
        id: 'revenue',
        category: 'Finance',
        question: 'Combien ai-je gagné ce mois?',
        icon: '💰',
      },
      {
        id: 'advice',
        category: 'Conseils',
        question: 'Comment améliorer mes ventes?',
        icon: '💡',
      },
    ]

    return NextResponse.json({ data: suggestions })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}