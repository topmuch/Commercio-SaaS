# Commercio SaaS - Nouvelles Fonctionnalités

## 📋 Table des matières

1. [IA Assistant](#ia-assistant)
2. [Rapports Avancés](#rapports-avancés)
3. [Support Prioritaire](#support-prioritaire)
4. [API Access](#api-access)

---

## 🤖 IA Assistant

### 📍 Emplacement
- **Sidebar**: Analyse & IA → Assistant IA
- **Backend API**: `GET/POST /api/ai/assistant`

### ✨ Fonctionnalités

#### Interface Chat
- Interface de chat interactive avec l'IA
- Suggestions rapides pour questions courantes
- Historique de conversation
- Réponses formatées (markdown-like)
- Indicateur de statut en ligne

#### Capacités de l'IA
- **Analyse des ventes**: Statistiques en temps réel sur les 30 derniers jours
- **Gestion du stock**: Alertes produits en rupture
- **Performance clients**: Identification des clients les plus fidèles
- **Tendances**: Analyse des tendances de vente
- **Recommandations**: Conseils stratégiques pour améliorer les ventes

#### Contexte Business Intégré
L'assistant a accès aux données réelles de l'entreprise:
- Nombre total de clients
- Nombre de produits actifs
- Commandes récentes
- Revenus sur 30 jours
- Statistiques de ventes

### 🔧 Usage

```typescript
// Exemple d'utilisation de l'API
const response = await fetch('/api/ai/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Analyse mes ventes du mois' }
    ],
    context: { companyId: 'current' }
  })
})

const data = await response.json()
console.log(data.data.message) // Réponse de l'IA
```

### 📊 Restrictions par Plan
| Plan | Accès | Restrictions |
|------|-------|--------------|
| Starter | ❌ | Non disponible |
| Pro | ✅ | Accès complet |
| Enterprise | ✅ | Accès complet |

### 🎯 Exemples de Questions
- "Quels sont mes clients les plus fidèles ?"
- "Analyse mes ventes des 30 derniers jours"
- "Quels produits ont un stock faible ?"
- "Comment améliorer mes ventes ?"
- "Quelles sont les tendances de mes ventes ?"

---

## 📈 Rapports Avancés

### 📍 Emplacement
- **Sidebar**: Analyse & IA → Rapports
- **Backend API**: `GET /api/reports/advanced`

### ✨ Fonctionnalités

#### KPIs Principaux
- Total clients actifs
- Total produits en catalogue
- Total commandes
- Chiffre d'affaires total
- Panier moyen
- Nombre de visites
- Nombre de devis
- Taux de conversion

#### Analytics Avancés
- **Revenus par mois**: Graphique des 6 derniers mois
- **Commandes par jour**: Vue détaillée des 30 derniers jours
- **Top 5 produits**: Par quantité et chiffre d'affaires
- **Top 5 clients**: Par revenus générés
- **Commandes par statut**: Répartition des statuts
- **Factures par statut**: Répartition et montants

#### Export de Données
- Export Excel (multi-feuilles)
- Export PDF
- Filtres par période (semaine, mois, année)

### 🔧 Usage

```typescript
// Récupérer les rapports avancés
const response = await fetch('/api/reports/advanced?period=30')
const data = await response.json()

// Accéder aux KPIs
console.log(data.data.kpis.totalClients)
console.log(data.data.kpis.totalRevenue)

// Top produits
console.log(data.data.topProducts)

// Revenus mensuels
console.log(data.data.revenueByMonth)
```

### 📊 Restrictions par Plan
| Plan | Accès | Restrictions |
|------|-------|--------------|
| Starter | ❌ | Non disponible |
| Pro | ✅ | Accès complet |
| Enterprise | ✅ | Accès complet |

### 📈 Indicateurs Clés

#### KPIs Disponibles
- `totalClients`: Nombre de clients
- `totalProducts`: Nombre de produits
- `totalOrders`: Nombre de commandes
- `totalRevenue`: Chiffre d'affaires total
- `avgOrderValue`: Panier moyen
- `visitsCount`: Nombre de visites
- `quotesCount`: Nombre de devis
- `conversionRate`: Taux de conversion (commandes/clients)
- `conversionRateQuotes`: Taux de conversion (commandes/devis)

#### Périodes Disponibles
- 7 jours (semaine)
- 30 jours (mois)
- 90 jours (trimestre)
- 365 jours (année)

---

## 🎧 Support Prioritaire

### 📍 Emplacement
- **Sidebar**: Support & API → Support
- **Backend API**: `GET/POST /api/support/tickets`

### ✨ Fonctionnalités

#### Gestion des Tickets
- Création de tickets de support
- Catégorisation (technique, facturation, bug, feature, question)
- Niveaux de priorité (basse, normale, haute, urgente)
- Suivi de statut (ouvert, en cours, résolu, fermé)
- Historique des messages
- Filtres par statut et priorité

#### Priorité des Plans
- **Starter**: Priorité normale ou basse uniquement
- **Pro**: Toutes les priorités disponibles
- **Enterprise**: Toutes les priorités disponibles + temps de réponse réduit

#### Interface
- Vue liste des tickets
- Vue détaillée d'un ticket
- Ajout de messages
- Notification de création

### 🔧 Usage

```typescript
// Créer un ticket
const response = await fetch('/api/support/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Problème de connexion',
    description: 'Description détaillée du problème...',
    priority: 'high', // low, normal, high, urgent
    category: 'technical' // technical, billing, feature, bug, question
  })
})

const data = await response.json()
console.log(data.data.id) // ID du ticket créé

// Lister les tickets
const listResponse = await fetch('/api/support/tickets?status=open&priority=high')
const tickets = await listResponse.json()
```

### 📊 Restrictions par Plan
| Plan | Accès | Priorités disponibles |
|------|-------|----------------------|
| Starter | ✅ | low, normal |
| Pro | ✅ | low, normal, high, urgent |
| Enterprise | ✅ | low, normal, high, urgent + réponse prioritaire |

### 🎯 Flux de Travail

1. **Création**: L'utilisateur crée un ticket avec sujet, description et priorité
2. **Classification**: Catégorisation automatique par domaine
3. **Notification**: Notification à l'équipe support
4. **Suivi**: L'utilisateur peut suivre l'avancement
5. **Résolution**: Échange de messages jusqu'à résolution
6. **Clôture**: Ticket fermé après résolution

---

## 🔑 API Access

### 📍 Emplacement
- **Sidebar**: Support & API → Clés API
- **Backend API**: `GET/POST/PATCH/DELETE /api/api-keys`
- **Public API**: `/api/v1/*`

### ✨ Fonctionnalités

#### Gestion des Clés API
- Création de clés API
- Liste des clés existantes
- Désactivation temporaire
- Suppression définitive
- Copie dans le presse-papiers
- Affichage sécurisé (masqué par défaut)

#### Gestion des Scopes
Fine-grained permissions:
- `clients:read` - Lire les clients
- `clients:write` - Modifier les clients
- `products:read` - Lire les produits
- `products:write` - Modifier les produits
- `orders:read` - Lire les commandes
- `orders:write` - Modifier les commandes
- `quotes:read` - Lire les devis
- `quotes:write` - Modifier les devis
- `invoices:read` - Lire les factures
- `invoices:write` - Modifier les factures
- `reports:read` - Lire les rapports

#### Documentation Intégrée
- Guide d'utilisation de l'API
- Exemples de code
- Liste des endpoints disponibles
- Format d'authentification

### 🔧 Usage

#### Créer une clé API

```typescript
const response = await fetch('/api/api-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Application Mobile',
    scopes: ['clients:read', 'orders:read', 'products:read'],
    expiresAt: '2025-12-31' // ou null pour pas d'expiration
  })
})

const data = await response.json()
console.log(data.data.key) // La clé API (visible uniquement une fois!)
```

#### Lister les clés

```typescript
const response = await fetch('/api/api-keys')
const data = await response.json()
console.log(data.data) // Liste des clés (masquées)
```

#### Utiliser l'API Publique

```typescript
// Exemple: Lister les clients
const response = await fetch('/api/v1/clients?page=1&limit=20', {
  headers: {
    'x-api-key': 'cp_votre_cle_api_ici',
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log(data.data) // Liste des clients
console.log(data.pagination) // Informations de pagination
```

#### Créer un client via API

```typescript
const response = await fetch('/api/v1/clients', {
  method: 'POST',
  headers: {
    'x-api-key': 'cp_votre_cle_api_ici',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    companyName: 'Boutique Exemple',
    contactName: 'Jean Dupont',
    phone: '+221 77 123 45 67',
    email: 'jean@exemple.com',
    city: 'Dakar',
    region: 'Dakar',
    type: 'boutique'
  })
})

const client = await response.json()
console.log(client.data)
```

### 📊 Restrictions par Plan
| Plan | Accès | Restrictions |
|------|-------|--------------|
| Starter | ❌ | Non disponible |
| Pro | ❌ | Non disponible |
| Enterprise | ✅ | Accès complet |

### 🛡️ Sécurité

#### Authentification
- Toutes les requêtes API nécessitent une clé valide
- Vérification de l'expiration de la clé
- Vérification des scopes par requête
- Désactivation possible sans suppression

#### Best Practices
- Stocker les clés API de manière sécurisée
- Ne jamais exposer les clés dans le code client
- Utiliser des scopes minimum requis
- Faire tourner les clés régulièrement
- Désactiver les clés non utilisées

### 📚 Endpoints API Disponibles

#### Clients
- `GET /api/v1/clients` - Lister les clients
- `POST /api/v1/clients` - Créer un client
- `GET /api/v1/clients/:id` - Détails d'un client
- `PATCH /api/v1/clients/:id` - Modifier un client

#### Produits
- `GET /api/v1/products` - Lister les produits
- `POST /api/v1/products` - Créer un produit
- `GET /api/v1/products/:id` - Détails d'un produit

#### Commandes
- `GET /api/v1/orders` - Lister les commandes
- `POST /api/v1/orders` - Créer une commande
- `GET /api/v1/orders/:id` - Détails d'une commande

#### Rapports
- `GET /api/v1/reports` - Rapports de vente
- `GET /api/v1/reports/revenue` - Revenus par période

---

## 🔐 Gestion des Droits d'Accès

### Helper: `plan-features.ts`

Fonction utilitaire pour vérifier les accès:

```typescript
import { getCompanyFeatures, hasFeatureAccess } from '@/lib/plan-features'

// Obtenir toutes les fonctionnalités
const features = await getCompanyFeatures()
console.log(features)
// {
//   plan: 'pro',
//   hasAIAssistant: true,
//   hasAdvancedReports: true,
//   hasPrioritySupport: true,
//   hasAPIAccess: false
// }

// Vérifier une fonctionnalité spécifique
const hasAI = await hasFeatureAccess('hasAIAssistant')
```

### Utilisation dans les Composants

```typescript
// Vérifier l'accès et afficher un message d'upgrade
const response = await fetch('/api/saas/subscription')
const data = await response.json()

if (data.data?.company.plan === 'starter') {
  // Afficher message d'upgrade
  showUpgradeMessage('hasAIAssistant')
}
```

---

## 🚀 Mise en Production

### Variables d'Environnement Requises

```env
# Database
DATABASE_URL="file:./db/dev.db"

# AI Integration
ZAI_API_KEY="votre_cle_ici"

# Authentication
NEXTAUTH_SECRET="votre_secret_ici"
NEXTAUTH_URL="http://localhost:3000"

# Wave Payments (optionnel)
WAVE_API_KEY="votre_cle_wave"
WAVE_API_SECRET="votre_secret_wave"
```

### Configuration des Plans

Les plans sont configurés dans `/lib/saas-plans.ts`:

```typescript
export const SAAS_PLANS = {
  starter: {
    price: 0,
    features: ['3 utilisateurs', '50 clients', '200 produits'],
  },
  pro: {
    price: 29000,
    features: [
      '15 utilisateurs',
      'Clients illimités',
      'Rapports avancés',
      'IA Assistant',
      'Support prioritaire',
    ],
    trialDays: 14,
  },
  enterprise: {
    price: 0, // Sur mesure
    features: [
      'Utilisateurs illimités',
      'Tout du Pro +',
      'API access',
      'Intégrations personnalisées',
    ],
  },
}
```

---

## 📞 Support

Pour toute question ou problème concernant ces nouvelles fonctionnalités:
1. Consultez la documentation intégrée dans l'application
2. Utilisez le système de tickets de support (Pro/Enterprise)
3. Contactez notre équipe support

---

## 🔄 Mises à jour Futures

### Roadmap
- [ ] Intégration voix-to-text pour l'IA Assistant
- [ ] Export PDF personnalisé des rapports
- [ ] Chat en temps réel avec le support
- [ ] Webhooks pour l'API
- [ ] SDK JavaScript/Python
- [ ] Intégration avec d'autres outils CRM

---

**Version**: 1.0.0
**Date**: Juin 2025
**Plateforme**: Commercio SaaS