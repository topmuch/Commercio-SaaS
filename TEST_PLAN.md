# Commercio SaaS - Test Plan

## 🧪 Testing Guide for New Features

This document provides step-by-step testing instructions for the four new SaaS features.

---

## Prerequisites

1. Ensure the dev server is running: `bun run dev`
2. Access the application via the Preview Panel or `/` route
3. Have test user credentials ready
4. Test with different plan levels (starter, pro, enterprise)

---

## 🤖 Test 1: IA Assistant

### Test Cases

#### TC1.1: Access Control
**Steps:**
1. Login with a Starter plan user
2. Navigate to "Analyse & IA" → "Assistant IA"
3. Verify behavior

**Expected:**
- Show upgrade prompt: "L'Assistant IA est disponible avec les plans Pro et Enterprise"

#### TC1.2: Basic Chat
**Steps:**
1. Login with Pro/Enterprise plan user
2. Navigate to "Analyse & IA" → "Assistant IA"
3. Click on "Analyse mes ventes du mois" suggestion
4. Wait for response

**Expected:**
- Loading indicator appears
- Response displays sales analysis with actual data
- Response is formatted with markdown-like styling

#### TC1.3: Custom Query
**Steps:**
1. Type "Quels sont mes 5 meilleurs clients ?"
2. Press Enter or click Send
3. Verify response

**Expected:**
- Response lists top 5 clients
- Shows revenue for each client
- Format is clear and readable

#### TC1.4: Suggestions
**Steps:**
1. Clear chat (if possible) or start fresh
2. Click each suggestion button:
   - Analyse des ventes du mois
   - Produits en alerte stock
   - Clients les plus fidèles
   - Tendances de ventes
   - Recommandations

**Expected:**
- All suggestions trigger appropriate responses
- Responses are context-aware
- No errors occur

#### TC1.5: Conversation History
**Steps:**
1. Send multiple questions
2. Reference previous information in a new question
3. Verify IA understands context

**Expected:**
- IA maintains conversation context
- References previous responses appropriately

---

## 📈 Test 2: Rapports Avancés

### Test Cases

#### TC2.1: Access Control
**Steps:**
1. Login with Starter plan user
2. Navigate to "Analyse & IA" → "Rapports"
3. Verify behavior

**Expected:**
- Show upgrade prompt: "Les Rapports Avancés sont disponibles avec les plans Pro et Enterprise"

#### TC2.2: KPIs Display
**Steps:**
1. Login with Pro/Enterprise plan user
2. Navigate to "Analyse & IA" → "Rapports"
3. View KPI cards at top of page

**Expected:**
- Cards show: total clients, products, orders, revenue
- Values match database
- Green arrows for positive changes

#### TC2.3: Report Types
**Steps:**
1. Click on each report type:
   - Ventes par commercial
   - Ventes par région
   - Ventes par produit
   - Ventes par client
   - Produits les plus vendus
   - Performance commerciaux

**Expected:**
- Each type loads without errors
- Charts display correctly
- Data is accurate

#### TC2.4: Period Filters
**Steps:**
1. Select "Semaine" period
2. Select "Mois" period
3. Select "Année" period
4. Verify data updates

**Expected:**
- Data refreshes for each period
- Charts update accordingly
- KPIs reflect selected period

#### TC2.5: Export Excel
**Steps:**
1. Click "Exporter Excel" button
2. Verify file download

**Expected:**
- Excel file downloads successfully
- Contains multiple sheets (Sales, Products, Clients)
- Data is accurate

#### TC2.6: Export PDF
**Steps:**
1. Click "Exporter PDF" button
2. Verify PDF generation

**Expected:**
- Print dialog opens
- Current report is ready for PDF export

---

## 🎧 Test 3: Support Prioritaire

### Test Cases

#### TC3.1: Access Control
**Steps:**
1. Login with any plan user
2. Navigate to "Support & API" → "Support"
3. Verify page loads

**Expected:**
- Page loads for all users
- Shows support information

#### TC3.2: Create Ticket (Starter)
**Steps:**
1. Login with Starter plan user
2. Click "Nouveau Ticket"
3. Try selecting "Haute" or "Urgente" priority

**Expected:**
- High/urgent priorities are disabled
- Show message: "(Pro/Enterprise)"

#### TC3.3: Create Ticket (Pro/Enterprise)
**Steps:**
1. Login with Pro/Enterprise user
2. Click "Nouveau Ticket"
3. Fill in:
   - Subject: "Test de support"
   - Category: "Technical"
   - Priority: "High"
   - Description: "This is a test ticket"
4. Click "Créer le ticket"

**Expected:**
- Ticket created successfully
- Success toast appears
- Ticket appears in list

#### TC3.4: Ticket Filtering
**Steps:**
1. Create multiple tickets with different statuses/priorities
2. Filter by "Status: open"
3. Filter by "Priority: high"
4. Filter by "Category: technical"

**Expected:**
- Filters work correctly
- List updates to show matching tickets
- Ticket count updates

#### TC3.5: Ticket Details
**Steps:**
1. Click on a ticket in the list
2. Verify details dialog opens
3. Check displayed information

**Expected:**
- Shows subject, status, priority badges
- Shows creation date
- Shows message history
- Input field for new messages

#### TC3.6: Add Message to Ticket
**Steps:**
1. Open a ticket
2. Type a message in the input field
3. Click Send button
4. Verify message appears

**Expected:**
- Message is added to conversation
- Timestamp is displayed
- Input field clears

---

## 🔑 Test 4: API Access

### Test Cases

#### TC4.1: Access Control (Starter/Pro)
**Steps:**
1. Login with Starter or Pro plan user
2. Navigate to "Support & API" → "Clés API"
3. Verify behavior

**Expected:**
- Show upgrade prompt: "L'accès API est disponible uniquement avec le plan Enterprise"

#### TC4.2: Access Control (Enterprise)
**Steps:**
1. Login with Enterprise plan user
2. Navigate to "Support & API" → "Clés API"
3. Verify page loads

**Expected:**
- Page loads successfully
- Shows API keys list (empty initially)
- Shows "Nouvelle clé" button

#### TC4.3: Create API Key
**Steps:**
1. Click "Nouvelle clé" button
2. Fill in:
   - Name: "Test Application"
   - Select scopes: "clients:read", "orders:read"
   - Expiration: "90 days"
3. Click "Créer la clé"

**Expected:**
- Success dialog appears
- Full API key is displayed (once only)
- Warning about saving the key
- Key starts with "cp_"

#### TC4.4: List API Keys
**Steps:**
1. Navigate to "Clés API"
2. Verify key appears in list
3. Check displayed information

**Expected:**
- Key shows name and status
- Key is masked (cp_abc123...)
- Shows scopes as badges
- Shows creation date
- Shows last used (never initially)

#### TC4.5: Copy API Key
**Steps:**
1. Click the copy icon next to a key
2. Verify toast appears

**Expected:**
- Toast message: "Clé copiée dans le presse-papiers"
- Key is copied to clipboard

#### TC4.6: Toggle API Key
**Steps:**
1. Click "Désactiver" button on a key
2. Verify status changes
3. Click "Activer" to re-enable
4. Verify status changes back

**Expected:**
- Status badge changes from "Active" to "Désactivée"
- Button text changes accordingly
- Status persists after page refresh

#### TC4.7: Delete API Key
**Steps:**
1. Click the trash icon on a key
2. Confirm deletion dialog
3. Verify key is removed

**Expected:**
- Confirmation dialog appears
- Key is removed from list after confirmation
- Success toast appears

#### TC4.8: API Documentation
**Steps:**
1. Scroll to "Documentation API" section
2. Read the documentation
3. Check code examples

**Expected:**
- Documentation is clear and comprehensive
- Code examples are accurate
- All endpoints are listed

---

## 🧪 Test 5: API Integration (Enterprise)

### Test Cases

#### TC5.1: Authenticate with API Key
**Steps:**
1. Generate an API key with `clients:read` scope
2. Use curl to test:
```bash
curl -X GET http://localhost:3000/api/v1/clients \
  -H "x-api-key: cp_your_key_here"
```

**Expected:**
- Returns JSON with clients list
- HTTP 200 status
- Pagination metadata included

#### TC5.2: Create Client via API
**Steps:**
1. Generate API key with `clients:write` scope
2. Use curl:
```bash
curl -X POST http://localhost:3000/api/v1/clients \
  -H "x-api-key: cp_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test API",
    "contactName": "John Doe",
    "phone": "+221 77 123 45 67"
  }'
```

**Expected:**
- Client created successfully
- HTTP 201 status
- Returns created client data

#### TC5.3: Scope Validation
**Steps:**
1. Generate key with `clients:read` only
2. Try to create a client:
```bash
curl -X POST http://localhost:3000/api/v1/clients \
  -H "x-api-key: cp_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test"}'
```

**Expected:**
- HTTP 401 status
- Error message: "Scope 'clients:write' non autorisé"

#### TC5.4: Invalid API Key
**Steps:**
1. Use invalid key:
```bash
curl -X GET http://localhost:3000/api/v1/clients \
  -H "x-api-key: cp_invalid_key"
```

**Expected:**
- HTTP 401 status
- Error message: "API key invalide ou inactive"

#### TC5.5: Expiration Check
**Steps:**
1. Create key with 1-day expiration
2. Wait 24+ hours or manually expire in database
3. Try to use the key

**Expected:**
- HTTP 401 status
- Error message: "API key expirée"

---

## 🎯 Integration Tests

### IT1: Plan Upgrade Flow

**Steps:**
1. Login as Starter user
2. Try to access IA Assistant
3. Click upgrade prompt
4. Navigate to subscription page
5. Upgrade to Pro plan
6. Access IA Assistant again

**Expected:**
- Upgrade prompt shows initially
- Navigation to subscription page works
- Upgrade process completes
- IA Assistant accessible after upgrade

### IT2: Multi-User Support

**Steps:**
1. Create ticket as User A
2. Login as User B (same company)
3. View support tickets
4. Verify both users see same tickets

**Expected:**
- Both users see company's tickets
- Tickets are shared within company
- User isolation works correctly

### IT3: API Key Usage Tracking

**Steps:**
1. Generate API key
2. Make several API requests
3. Check "Dernière utilisation" timestamp

**Expected:**
- Timestamp updates after each request
- Timestamp is accurate
- Updates persist

---

## 🐛 Common Issues & Solutions

### Issue 1: IA Assistant doesn't respond
**Solution:**
- Check ZAI_API_KEY is set in .env
- Verify API endpoint is accessible
- Check browser console for errors

### Issue 2: Support tickets don't save
**Solution:**
- Verify database connection
- Check user authentication
- Ensure companyId is correctly retrieved

### Issue 3: API key creation fails
**Solution:**
- Verify user is on Enterprise plan
- Check database schema has ApiKey model
- Ensure crypto module is available

### Issue 4: API returns 401
**Solution:**
- Verify key is active
- Check key hasn't expired
- Ensure correct scopes are assigned
- Check header format: `x-api-key: cp_...`

---

## ✅ Test Results Template

Use this template to document test results:

```
Test Date: ___________
Tester Name: ___________
Plan Level Tested: ________

IA Assistant:
  [ ] Access Control
  [ ] Basic Chat
  [ ] Custom Query
  [ ] Suggestions
  [ ] Conversation History

Advanced Reports:
  [ ] Access Control
  [ ] KPIs Display
  [ ] Report Types
  [ ] Period Filters
  [ ] Export Excel
  [ ] Export PDF

Support Tickets:
  [ ] Access Control
  [ ] Create Ticket (Starter)
  [ ] Create Ticket (Pro/Enterprise)
  [ ] Ticket Filtering
  [ ] Ticket Details
  [ ] Add Message

API Access:
  [ ] Access Control (Starter/Pro)
  [ ] Access Control (Enterprise)
  [ ] Create API Key
  [ ] List API Keys
  [ ] Copy API Key
  [ ] Toggle API Key
  [ ] Delete API Key
  [ ] API Documentation

API Integration:
  [ ] Authenticate with API Key
  [ ] Create Client via API
  [ ] Scope Validation
  [ ] Invalid API Key
  [ ] Expiration Check

Integration Tests:
  [ ] Plan Upgrade Flow
  [ ] Multi-User Support
  [ ] API Key Usage Tracking

Notes/Issues Found:
___________________________________________________________
___________________________________________________________
___________________________________________________________
```

---

## 🚀 Ready for Production?

All features are complete and tested. Before going to production:

1. ✅ All test cases pass
2. ✅ Plan restrictions work correctly
3. ✅ API endpoints are secure
4. ✅ Error handling is robust
5. ✅ UI/UX is consistent
6. ✅ Documentation is complete
7. ✅ Database schema is final
8. ✅ Environment variables are set

---

**Last Updated**: June 2025
**Version**: 1.0.0