# 🚀 Préparation Coolify - Résumé

Le projet est maintenant prêt pour le déploiement sur Coolify!

## ✅ Fichiers ajoutés

### 1. **Dockerfile**
- Build multi-stage optimisé pour la production
- Image Alpine Linux (légère)
- Configuration health check intégrée
- Utilisateur non-root pour la sécurité
- Next.js standalone mode activé

### 2. **.dockerignore**
- Réduit la taille de l'image Docker
- Exclut: node_modules, tests, logs, fichiers temporaires
- Inclut uniquement les fichiers nécessaires

### 3. **.env.example**
- Toutes les variables d'environnement documentées
- Variables obligatoires et optionnelles
- Exemples de configuration pour tous les services

### 4. **Health Check API** (`/api/health`)
- Vérification de la connexion database
- Monitoring de l'uptime
- Utilisation mémoire
- Informations d'environnement

### 5. **Guides de déploiement**
- **DEPLOYMENT.md** - Guide en anglais
- **COOLIFY_DEPLOYMENT.md** - Guide en français

## 📋 Prochaines étapes après installation de Coolify

1. **Connecter Coolify à GitHub**
   - Settings → Git Sources → Connect GitHub

2. **Créer l'application**
   - Applications → Create New Application
   - Sélectionner le dépôt `Commercio-SaaS`
   - Branch: `main`
   - Build Type: `Dockerfile`

3. **Configurer les variables d'environnement**
   ```bash
   NODE_ENV=production
   DATABASE_URL="file:./db/dev.db"
   NEXTAUTH_SECRET=openssl rand -base64 32
   NEXTAUTH_URL=https://votre-domaine.com
   ```

4. **Configurer les volumes** (IMPORTANT!)
   - Name: `db-data`
   - Mount Path: `/app/db`
   - Permet de persister la base de données SQLite

5. **Configurer le domaine**
   - Ajouter votre domaine personnalisé
   - Ou utiliser un domaine Coolify

6. **Déployer**
   - Cliquer sur "Deploy"
   - Attendre le build
   - Vérifier que le health check passe

## 🔧 Configuration minimale requise

### Variables d'environnement (obligatoires)
- `NODE_ENV=production`
- `DATABASE_URL="file:./db/dev.db"`
- `NEXTAUTH_SECRET=<secret-généré>`
- `NEXTAUTH_URL=<votre-domaine>`

### Volumes (obligatoire pour persistance)
- `db-data` → `/app/db`

### Ports
- Container Port: `3000`

## ✨ Fonctionnalités après déploiement

- ✅ Application accessible via votre domaine
- ✅ SSL/TLS automatique (Let's Encrypt)
- ✅ Health checks automatiques
- ✅ Redéploiement automatique après git push
- ✅ Base de données persistante
- ✅ Logs accessibles dans Coolify

## 📚 Documentation

Voir les fichiers détaillés:
- **COOLIFY_DEPLOYMENT.md** - Guide complet en français
- **DEPLOYMENT.md** - Guide complet en anglais
- **.env.example** - Variables d'environnement

## 🆘 Support en cas de problème

Consultez le guide **COOLIFY_DEPLOYMENT.md** section "Dépannage":
- Problèmes de démarrage
- Erreurs de base de données
- Health check échoue
- Erreurs de build

---

**Projet prêt pour Coolify! 🎉**

Commit: `b4116e4`