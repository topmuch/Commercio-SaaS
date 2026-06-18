# Commercio SaaS - Fonctionnalités Avancées

## 🎯 Vue d'ensemble

Ce document décrit les 4 fonctionnalités principales développées pour le SaaS Commercio:

1. **IA Assistant** - Assistant intelligent avec contexte business
2. **Rapports Avancés** - KPIs, analytics, exports PDF
3. **Support Prioritaire** - Tickets, chat, notifications
4. **API Access** - REST API publique (Enterprise only)

---

## 1. 🤖 IA Assistant

### Backend

**Endpoint**: `POST /api/ai/assistant`

**Corps de la requête**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyse mes ventes des 30 derniers jours",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "context": {
    "companyId": "current"
  }
}
```

**Réponse**:
```json
{
  "data": {
    "message": "Voici l'analyse de vos ventes...",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 300,
      "totalTokens": 450
    }
  }
}
```

**Suggestions pré-définies**:
- `GET /api/ai/assistant` - Récupérer les suggestions de questions

**Fonctionnalités**:
- ✅ Contexte business automatique (clients, produits, ventes)
- ✅ Suggestions de questions intelligentes
- ✅ Historique de conversation
- ✅ Analyse en temps réel des données
- ✅ Recommandations personnalisées

**Configuration**:
```bash
# Ajoutez à votre .env:
ZAI_API_KEY="votre_clé_zai"
```

### Frontend

Le composant IA Assistant est situé dans:
- `src/components/ai/ai-assistant-page.tsx`

**Intégration**:
- Déjà intégré dans le dashboard sidebar
- Accessible via le menu "Assistant IA"

---

## 2. 📊 Rapports Avancés

### Backend

#### KPIs et Analytics

**Endpoint**: `GET /api/reports/advanced?period=30`

**Paramètres**:
- `period`: Nombre de jours (défaut: 30)

**Réponse**:
```json
{
  "data": {
    "kpis": {
      "totalClients": 150,
      "totalProducts": 80,
      "totalOrders": 500,
      "totalRevenue": 25000000,
      "avgOrderValue": 50000,
      "visitsCount": 1200,
      "quotesCount": 150,
      "conversionRate": 85.5,
      "conversionRateQuotes": 45.2
    },
    "period": {
      "days": 30,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T23:59:59Z",
      "orders": 100,
      "revenue": 5000000,
      "newClients": 25
    },
    "topProducts": [
      {
        "name": "Produit A",
        "reference": "REF001",
        "price": 15000,
        "totalQuantity": 50,
        "totalRevenue": 750000
      }
    ],
    "topClients": [
      {
        "companyName": "Client A",
        "contactName": "Jean Dupont",
        "city": "Dakar",
        "totalRevenue": 1500000
      }
    ],
    "ordersByStatus": [
      { "status": "delivered", "count": 300 },
      { "status": "shipped", "count": 100 },
      { "status": "new", "count": 50 },
      { "status": "preparation", "count": 50 }
    ],
    "revenueByMonth": [
      { "month": "2025-01", "revenue": 5000000 },
      { "month": "2024-12", "revenue": 4500000 }
    ],
    "ordersByDay": [
      { "day": "2025-01-31", "orders": 5, "revenue": 250000 }
    ]
  }
}
```

#### Export PDF

**Endpoint**: `POST /api/reports/export`

**Corps de la requête**:
```json
{
  "type": "sales",
  "period": 30,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z"
}
```

**Types de rapports**:
- `sales` - Rapport des ventes
- `clients` - Rapport clients
- `products` - Rapport produits

**Réponse**:
```json
{
  "data": {
    "filename": "rapport_ventes_2025-01-31.pdf",
    "pdf": "base64_encoded_pdf_content"
  }
}
```

### Fonctionnalités

- ✅ KPIs en temps réel
- ✅ Top produits par ventes
- ✅ Top clients par CA
- ✅ Commandes par statut
- ✅ Revenus par mois
- ✅ Tendance des commandes par jour
- ✅ Export PDF professionnel
- ✅ Personnalisation de la période

---

## 3. 🎧 Support Prioritaire

### Backend

#### Créer un ticket

**Endpoint**: `POST /api/support/tickets`

**Corps de la requête**:
```json
{
  "subject": "Problème de connexion",
  "description": "Je n'arrive pas à me connecter...",
  "priority": "high",
  "category": "technical"
}
```

**Priorités disponibles**:
- `low` - Basse
- `normal` - Normale
- `high` - Haute (Pro/Enterprise)
- `urgent` - Urgente (Pro/Enterprise)

**Catégories disponibles**:
- `technical` - Technique
- `billing` - Facturation
- `feature` - Nouvelle fonctionnalité
- `bug` - Bug
- `question` - Question

**Réponse**:
```json
{
  "data": {
    "id": "ticket_xxx",
    "subject": "Problème de connexion",
    "status": "open",
    "priority": "high",
    "category": "technical",
    "createdAt": "2025-01-15T10:30:00Z",
    "message": "Ticket créé avec succès"
  }
}
```

#### Lister les tickets

**Endpoint**: `GET /api/support/tickets?status=open&priority=high&category=technical`

#### Messages de ticket

**Ajouter un message**:
```
POST /api/support/tickets/[id]/messages
```

**Corps**:
```json
{
  "content": "Merci pour votre aide!",
  "attachments": ["https://example.com/file1.pdf"],
  "isInternal": false
}
```

**Récupérer les messages**:
```
GET /api/support/tickets/[id]/messages
```

### Fonctionnalités

- ✅ Système de tickets complet
- ✅ Priorités (limitées selon le plan)
- ✅ Catégories
- ✅ Messages de discussion
- ✅ Messages internes (équipe support)
- ✅ Statuts de progression
- ✅ Notifications automatiques
- ✅ Historique des tickets

### Limites par plan

- **Starter**: Tickets normaux seulement (priorité low/normal)
- **Pro**: Tickets prioritaires (priorité high)
- **Enterprise**: Tickets urgents + accès prioritaire (priorité urgent)

---

## 4. 🔌 API Access (REST API)

### Disponibilité

- **Plan**: Enterprise uniquement
- **Type**: REST API v1
- **Authentification**: API Key

### Gestion des API Keys

#### Créer une API Key

**Endpoint**: `POST /api/api-keys`

**Corps de la requête**:
```json
{
  "name": "Mon Integration CRM",
  "scopes": ["clients:read", "clients:write", "orders:read"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Scopes disponibles**:
- `clients:read` - Lire les clients
- `clients:write` - Créer/modifier les clients
- `products:read` - Lire les produits
- `products:write` - Créer/modifier les produits
- `orders:read` - Lire les commandes
- `orders:write` - Créer/modifier les commandes
- `quotes:read` - Lire les devis
- `quotes:write` - Créer/modifier les devis
- `invoices:read` - Lire les factures
- `invoices:write` - Créer/modifier les factures
- `reports:read` - Lire les rapports

**Réponse**:
```json
{
  "data": {
    "id": "key_xxx",
    "name": "Mon Integration CRM",
    "key": "cp_1234567890abcdef...",
    "scopes": ["clients:read", "clients:write", "orders:read"],
    "expiresAt": "2025-12-31T23:59:59Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

⚠️ **Important**: La clé API n'est affichée qu'une seule fois!

#### Lister les API Keys

**Endpoint**: `GET /api/api-keys`

**Réponse**:
```json
{
  "data": [
    {
      "id": "key_xxx",
      "name": "Mon Integration CRM",
      "key": "cp_1234567890abcdef...", // Partiellement cachée
      "scopes": ["clients:read", "clients:write"],
      "lastUsedAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2025-12-31T23:59:59Z",
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### API Publique v1

#### Clients API

**Lister les clients**:
```http
GET /api/v1/clients
x-api-key: cp_1234567890abcdef...

# Paramètres de requête:
# ?page=1
# &limit=20
# &search=ClientA
```

**Réponse**:
```json
{
  "data": [
    {
      "id": "client_xxx",
      "companyName": "Client A",
      "contactName": "Jean Dupont",
      "phone": "+221770000001",
      "whatsapp": "+221770000001",
      "email": "clienta@example.com",
      "city": "Dakar",
      "region": "Dakar",
      "sector": "Distribution",
      "type": "boutique",
      "status": "client_vert",
      "latitude": 14.7167,
      "longitude": -17.4677,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Créer un client**:
```http
POST /api/v1/clients
x-api-key: cp_1234567890abcdef...
Content-Type: application/json

{
  "companyName": "Client B",
  "contactName": "Marie Dupont",
  "phone": "+221770000002",
  "whatsapp": "+221770000002",
  "email": "clientb@example.com",
  "address": "123 Rue Principale",
  "city": "Dakar",
  "region": "Dakar",
  "sector": "Distribution",
  "type": "revendeur",
  "latitude": 14.7167,
  "longitude": -17.4677,
  "notes": "Client fidèle"
}
```

### Sécurité

- ✅ Authentification par API Key
- ✅ Système de scopes granulaires
- ✅ Vérification du plan (Enterprise)
- ✅ Limitation des requêtes (rate limiting recommandé)
- ✅ Suivi d'utilisation (lastUsedAt)
- ✅ Expiration des clés

### Endpoints supplémentaires

Pour les autres endpoints (Produits, Commandes, Devis, Factures), suivez le même pattern:

- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/[id]`
- `PUT /api/v1/products/[id]`
- `DELETE /api/v1/products/[id]`

---

## 📦 Base de Données

### Nouveaux modèles

#### SupportTicket
```prisma
model SupportTicket {
  id          String   @id @default(cuid())
  companyId   String
  userId      String
  subject     String
  description String
  priority    String   @default("normal")
  status      String   @default("open")
  category    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  resolvedAt  DateTime?
  messages    SupportMessage[]
}
```

#### SupportMessage
```prisma
model SupportMessage {
  id          String   @id @default(cuid())
  ticketId    String
  senderId    String
  senderType  String   // user, support
  content     String
  attachments String?
  isInternal  Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

#### ApiKey
```prisma
model ApiKey {
  id          String   @id @default(cuid())
  companyId   String
  userId      String
  name        String
  key         String   @unique
  scopes      String
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🎨 Utilisation Frontend

### IA Assistant

Accédez via le menu "Assistant IA" dans le sidebar.

**Actions disponibles**:
- Cliquer sur une suggestion
- Taper une question
- Voir l'historique de conversation
- Réponses formatées (markdown-like)

### Rapports Avancés

Accédez via le menu "Rapports" dans le sidebar.

**Actions disponibles**:
- Voir les KPIs en temps réel
- Filtrer par période
- Voir les graphiques
- Exporter en PDF

### Support Prioritaire

Accédez via le menu "Support" dans le sidebar.

**Actions disponibles**:
- Créer un nouveau ticket
- Voir la liste des tickets
- Répondre aux tickets
- Voir les priorités disponibles

### API Access

Accédez via le menu "API" dans les paramètres (Plan Enterprise).

**Actions disponibles**:
- Créer une nouvelle API Key
- Voir les clés existantes
- Révoquer une clé
- Voir l'utilisation

---

## 🔧 Configuration

### Variables d'environnement

```bash
# IA Assistant
ZAI_API_KEY="votre_clé_zai"

# (Les autres variables sont déjà configurées pour Wave, etc.)
```

### Installation des dépendances

```bash
# Les dépendances sont déjà installées:
# - z-ai-web-dev-sdk (IA)
# - jspdf (Export PDF)
# - jspdf-autotable (Tableaux PDF)
```

---

## 🧪 Tests

### Tester l'IA Assistant

```bash
curl -X POST http://localhost:3000/api/ai/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Combien ai-je gagné ce mois?"
      }
    ]
  }'
```

### Tester les rapports

```bash
curl http://localhost:3000/api/reports/advanced?period=30
```

### Tester l'API publique

```bash
# Lister les clients
curl http://localhost:3000/api/v1/clients \
  -H "x-api-key: cp_1234567890abcdef..."

# Créer un client
curl -X POST http://localhost:3000/api/v1/clients \
  -H "x-api-key: cp_1234567890abcdef..." \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Client",
    "contactName": "Test User",
    "phone": "+221770000000"
  }'
```

---

## 📊 Monitoring et Logs

Toutes les erreurs sont loggées dans la console:
- `[POST /api/ai/assistant] Error: ...`
- `[GET /api/reports/advanced] Error: ...`
- `[POST /api/support/tickets] Error: ...`
- `[POST /api/v1/clients] Error: ...`

---

## 🐛 Dépannage

### IA Assistant ne répond pas

**Solutions**:
1. Vérifiez que `ZAI_API_KEY` est configuré
2. Vérifiez que les API limits ne sont pas atteintes
3. Consultez les logs du serveur

### Export PDF échoue

**Solutions**:
1. Vérifiez qu'il y a des données dans la période spécifiée
2. Vérifiez que jsPDF est correctement installé
3. Consultez les logs du serveur

### API Key refuse l'accès

**Solutions**:
1. Vérifiez que le plan est Enterprise
2. Vérifiez que l'API key est active
3. Vérifiez que le scope est correct
4. Vérifiez que la clé n'a pas expiré

---

## 📝 Améliorations futures

- [ ] Webhooks pour les API events
- [ ] Rate limiting pour l'API publique
- [ ] Analytics détaillés de l'utilisation de l'API
- [ ] Notifications en temps réel pour le support
- [ ] Chat en direct avec l'équipe support
- [ ] Export Excel pour les rapports
- [ ] Custom dashboards
- [ ] Alerts automatiques

---

**Date**: 2025-01-15
**Version**: 1.0
**Développeur**: Z.ai Code