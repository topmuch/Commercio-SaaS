# Guide de Déploiement sur Coolify

Ce guide explique comment déployer Commercio SaaS sur Coolify.

## 📋 Prérequis

- Un compte Coolify (self-hosted ou cloud)
- Un dépôt GitHub avec le code du projet
- Un domaine (optionnel, Coolify peut en fournir un)

## 🚀 Étape 1: Préparer le Code

Le projet est déjà configuré pour Coolify avec:
- ✅ Dockerfile optimisé pour la production
- ✅ .dockerignore pour réduire la taille de l'image
- ✅ .env.example avec toutes les variables d'environnement
- ✅ Endpoint de health check (`/api/health`)
- ✅ Configuration Next.js standalone output

## 🔧 Étape 2: Pousser sur GitHub

Assurez-vous que votre code est à jour sur GitHub:

```bash
git add .
git commit -m "chore: prepare for Coolify deployment"
git push origin main
```

## 📦 Étape 3: Configurer Coolify

### 3.1 Connecter votre compte GitHub

1. Connectez-vous à votre instance Coolify
2. Allez dans **Settings** → **Git Sources**
3. Cliquez sur **Connect GitHub**
4. Autorisez l'accès à votre dépôt

### 3.2 Créer une nouvelle application

1. Allez dans **Applications** → **Create New Application**
2. Sélectionnez votre dépôt GitHub: `Commercio-SaaS`
3. Sélectionnez la branche: `main`
4. Configurez l'application:

#### Configuration de base
- **Application Name**: `commercio-saas`
- **Branch**: `main`
- **Build Type**: `Dockerfile`
- **Dockerfile Path**: `Dockerfile` (chemin par défaut)

#### Configuration du conteneur
- **Container Port**: `3000`
- **Expose Port**: `3000`

#### Environment Variables
Ajoutez les variables d'environnement nécessaires depuis `.env.example`:

**Variables obligatoires:**
```bash
NODE_ENV=production
DATABASE_URL="file:./db/dev.db"
NEXTAUTH_SECRET=votre-secret-généré-ici
NEXTAUTH_URL=https://votre-domaine.com
```

**Variables recommandées:**
```bash
NEXT_PUBLIC_APP_NAME=Commercio SaaS
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

**Pour générer NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3.3 Configurer le domaine

1. Dans la section **Domains**, cliquez sur **Add Domain**
2. Option A: Utiliser un domaine Coolify (ex: `commercio.your-coolify-instance.com`)
3. Option B: Utiliser votre propre domaine:
   - Ajoutez votre domaine (ex: `commercio.example.com`)
   - Coolify vous fournira les DNS à configurer
   - Configurez les enregistrements DNS sur votre fournisseur

### 3.4 Configurer les volumes (Persistance des données)

Comme nous utilisons SQLite, nous devons persister le fichier de base de données:

1. Dans la section **Volumes**, cliquez sur **Add Volume**
2. Configuration:
   - **Name**: `db-data`
   - **Mount Path**: `/app/db`
3. Cela assurera que la base de données persiste entre les redéploiements

### 3.5 Configurer le Health Check

Coolify utilisera automatiquement le health check configuré dans le Dockerfile:
- **Endpoint**: `/api/health`
- **Interval**: 30 secondes
- **Timeout**: 3 secondes
- **Start Period**: 40 secondes

## 🔄 Étape 4: Premier Déploiement

1. Cliquez sur **Deploy** pour lancer le premier déploiement
2. Coolify va:
   - Cloner votre dépôt
   - Construire l'image Docker
   - Démarrer le conteneur
   - Exécuter le health check
3. Suivez les logs dans l'onglet **Logs**

## 🎯 Étape 5: Vérification

Une fois le déploiement terminé:

1. Vérifiez que le conteneur est en status: **Running**
2. Visitez votre domaine
3. Testez le health check: `https://votre-domaine.com/api/health`

Réponse attendue:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "database": "connected",
  "uptime": 123.456,
  "memory": { ... },
  "environment": "production"
}
```

## 📊 Étape 6: Configuration Post-Déploiement

### 6.1 Initialiser la base de données

Si nécessaire, vous pouvez exécuter des migrations:

```bash
# Via le terminal Coolify
bun run db:push
```

### 6.2 Configurer SSL/TLS

Coolify gère automatiquement les certificats SSL via Let's Encrypt pour:
- Domaines Coolify
- Vos propres domaines avec les DNS configurés

### 6.3 Configurer les backups

Coolify offre des options de backup:
1. Allez dans **Backups**
2. Configurez les backups automatiques de:
   - Volume de la base de données
   - Configuration

## 🔍 Dépannage

### Le conteneur ne démarre pas

1. Vérifiez les logs dans l'onglet **Logs**
2. Vérifiez que toutes les variables d'environnement sont configurées
3. Vérifiez que le volume est monté correctement

### Erreur de connexion à la base de données

1. Vérifiez que le volume `db-data` est monté sur `/app/db`
2. Vérifiez la variable `DATABASE_URL`
3. Vérifiez les permissions du fichier de base de données

### Health check échoue

1. Vérifiez que l'endpoint `/api/health` répond
2. Vérifiez que le port 3000 est exposé
3. Vérifiez les logs du conteneur

### Erreur de build

1. Vérifiez que `bun.lockb` est dans le dépôt
2. Vérifiez que `Dockerfile` est à la racine
3. Vérifiez que `.dockerignore` ne bloque pas des fichiers nécessaires

## 📈 Mises à jour

Pour mettre à jour l'application:

1. Pushez vos changements sur GitHub
2. Coolify détectera automatiquement le nouveau commit
3. Vous pouvez aussi cliquer sur **Redeploy** dans Coolify

## 🔐 Sécurité

### Mots de passe et Secrets

- Utilisez des secrets forts pour toutes les clés API
- Changez les secrets par défaut
- Utilisez la gestion des secrets de Coolify
- Ne committez jamais de secrets dans Git

### Variables d'environnement sensibles

Dans Coolify, utilisez la section **Environment Variables** avec:
- `NEXTAUTH_SECRET`: Secret pour NextAuth.js
- `DATABASE_URL`: URL de base de données
- Clés API pour services externes (Stripe, Wave, etc.)

### Rate Limiting

L'application inclut rate limiting. Configurez:
- `RATE_LIMIT_MAX_REQUESTS`: Nombre max de requêtes par fenêtre
- `RATE_LIMIT_WINDOW_MS`: Fenêtre de temps en millisecondes

## 🚀 Optimisations

### Performance

- Le Dockerfile utilise le mode `standalone` de Next.js pour une performance optimale
- Prisma Client est généré pendant le build
- Image Alpine Linux pour une taille réduite

### Ressources

Configurez les limites de ressources dans Coolify:
- **CPU**: 1-2 vCPU (minimum)
- **RAM**: 1-2 GB (minimum)
- **Disque**: 10-20 GB (selon les données)

### Scaling

Pour plus de charge:
1. Augmentez les ressources allouées
2. Utilisez plusieurs instances avec un load balancer
3. Envisagez PostgreSQL au lieu de SQLite pour de meilleures performances

## 📚 Documentation Supplémentaire

- [Coolify Documentation](https://coolify.io/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

## 🆘 Support

En cas de problème:
1. Vérifiez les logs dans Coolify
2. Consultez la documentation Coolify
3. Vérifiez les issues GitHub du projet

---

**Note importante**: Ce projet utilise SQLite pour la base de données. Pour la production avec beaucoup d'utilisateurs, envisagez de migrer vers PostgreSQL pour de meilleures performances et des fonctionnalités avancées.