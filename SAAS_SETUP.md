# Commercio SaaS - Configuration Guide

## 🎯 Vue d'ensemble

Commercio a été transformé en application SaaS avec les fonctionnalités suivantes:

- ✅ Inscription publique multi-tenant
- ✅ 3 plans tarifaires (Starter, Pro, Enterprise)
- ✅ Intégration Wave pour les paiements
- ✅ Système d'abonnements avec essai gratuit
- ✅ Limites par plan (utilisateurs, clients, produits)
- ✅ Admin Dashboard pour gérer tous les tenants
- ✅ Gestion d'abonnement pour les clients

## 📦 Architecture

### Modèles de données

**Subscription**
- `companyId`: ID de l'entreprise
- `plan`: Plan (starter, pro, enterprise)
- `status`: Statut (active, cancelled, suspended, past_due)
- `startDate`: Date de début
- `endDate`: Date de fin
- `trialEndDate`: Date de fin de l'essai
- `autoRenew`: Renouvellement automatique
- `waveCheckoutId`: ID du checkout Wave

**SaasPayment**
- `subscriptionId`: ID de l'abonnement
- `companyId`: ID de l'entreprise
- `amount`: Montant
- `currency`: Devise (XOF)
- `status`: Statut (pending, completed, failed, refunded)
- `wavePaymentId`: ID du paiement Wave
- `waveCheckoutId`: ID du checkout Wave
- `paidAt`: Date de paiement

## 🔧 Configuration

### Variables d'environnement

Ajoutez ces variables à votre fichier `.env`:

```bash
# Wave Payment API
WAVE_API_KEY="your_wave_api_key"
WAVE_API_SECRET="your_wave_api_secret"
WAVE_WEBHOOK_SECRET="your_wave_webhook_secret"

# Utiliser le sandbox pour les tests
# Les URLs de l'API Wave sont configurées automatiquement
```

### Obtenir les clés Wave

1. Créez un compte sur [https://wave.com](https://wave.com)
2. Accédez à votre Dashboard développeur
3. Créez une application
4. Copiez votre API Key et API Secret
5. Configurez le webhook URL: `https://votre-domaine.com/api/saas/webhook/wave`

## 🚀 Routes

### Publiques

- `GET /api/saas/register` - Liste des plans disponibles
- `POST /api/saas/register` - Création de compte SaaS

### Authentifiées (Tenant)

- `GET /api/saas/subscription` - Récupérer l'abonnement actuel
- `POST /api/saas/subscription` - Mettre à niveau le plan

### Admin SaaS

- `GET /api/saas/admin/companies` - Liste des entreprises
- `GET /api/saas/admin/subscriptions` - Liste des abonnements

### Webhooks

- `POST /api/saas/webhook/wave` - Webhook Wave

### Pages Frontend

- `/saas-register` - Page d'inscription publique
- `/dashboard/subscription` - Gestion d'abonnement
- `/saas-admin` - Admin Dashboard (requiert auth super_admin)

## 📊 Plans

### Starter (Gratuit)
- 3 utilisateurs
- 50 clients
- 200 produits
- Boutique WhatsApp
- Carte territoriale

### Pro (29 000 FCFA/mois)
- 15 utilisateurs
- Clients illimités
- 2000 produits
- Rapports avancés
- IA Assistant
- Support prioritaire
- 14 jours d'essai gratuit

### Enterprise (Sur mesure)
- Utilisateurs illimités
- Tout du Pro +
- API access
- Intégrations personnalisées
- Account manager dédié
- SLA garanti

## 🔐 Sécurité

Les webhooks Wave sont vérifiés avec une signature HMAC pour garantir qu'ils proviennent bien de Wave.

```typescript
verifyWaveWebhookSignature(payload, signature, webhookSecret)
```

## 📈 Surveillance

L'admin Dashboard `/saas-admin` permet de:

- Voir toutes les entreprises
- Voir tous les abonnements
- Voir les statistiques de revenus
- Voir l'utilisation par entreprise

## 🧪 Tests

Pour tester sans paiement:

1. Configurez les clés Wave dans `.env`
2. Le système détectera automatiquement si les clés sont absentes
3. En mode démo, les abonnements sont créés sans paiement

## 💰 Paiements

### Flux de paiement

1. L'utilisateur sélectionne un plan
2. L'API crée un checkout Wave
3. L'utilisateur est redirigé vers Wave
4. Après paiement, Wave envoie un webhook
5. Le webhook met à jour l'abonnement
6. L'utilisateur est redirigé vers le dashboard

### Gestion des erreurs

- Si le paiement échoue, l'abonnement reste en mode essai (si applicable)
- Le statut du paiement est mis à jour automatiquement
- Les notifications peuvent être ajoutées pour informer l'utilisateur

## 🔨 Limites par plan

Les limites sont vérifiées automatiquement lors de la création de:

- Utilisateurs: `checkUserLimit()`
- Clients: `checkClientLimit()`
- Produits: `checkProductLimit()`

Si une limite est atteinte, une erreur est retournée avec un message explicite.

## 📝 À faire

- [ ] Ajouter des notifications pour les renouvellements
- [ ] Créer des factures PDF pour les paiements
- [ ] Ajouter des emails de confirmation
- [ ] Implémenter la réduction de plan
- [ ] Ajouter des coupons de réduction
- [ ] Créer des rapports d'utilisation

## 🐛 Dépannage

### Problème: Le webhook Wave ne fonctionne pas

**Solution:**
1. Vérifiez que le webhook secret est correct
2. Vérifiez que l'URL du webhook est publique
3. Vérifiez les logs pour les erreurs de signature

### Problème: L'abonnement n'est pas activé

**Solution:**
1. Vérifiez que le paiement a réussi dans le dashboard Wave
2. Vérifiez les logs pour les erreurs
3. Assurez-vous que le webhook est correctement configuré

### Problème: Les limites ne fonctionnent pas

**Solution:**
1. Vérifiez que `checkUserLimit()`, `checkClientLimit()`, et `checkProductLimit()` sont appelés
2. Vérifiez que le plan de l'entreprise est correct
3. Vérifiez que les fonctions de limite sont importées correctement

## 📞 Support

Pour toute question, contactez le support technique ou consultez la documentation de l'API Wave.

---

**Date de création:** 2025
**Version:** 1.0
**Développeur:** Z.ai Code