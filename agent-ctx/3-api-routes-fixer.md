# Task ID: 3 — API Routes Fixer
Agent: Main
Task: Fix auth, companyId injection, and tax rate in orders, invoices, quotes API routes

## Work Log

### Files Modified (3 files, 9 changes total)

#### 1. `/api/orders/route.ts`
- **Added imports**: `getServerSession` from `next-auth`, `authOptions` from `@/lib/auth`
- **GET handler**: Replaced `companyId = searchParams.get('companyId') || 'comp_1'` with session-based auth (`getServerSession` + `companyId` from session)
- **POST handler**: Changed `tax = 19` → `tax = 18`; replaced `companyId = 'comp_1'` with session auth

#### 2. `/api/invoices/route.ts`
- **Added imports**: `getServerSession` from `next-auth`, `authOptions` from `@/lib/auth`
- **GET handler**: Replaced `companyId = searchParams.get('companyId') || 'comp_1'` with session-based auth
- **POST handler**: Changed `tax = 19` → `tax = 18`; replaced `companyId = 'comp_1'` with session auth
- **PUT handler**: Added session auth check at top; replaced `companyId = 'comp_1'` with session companyId

#### 3. `/api/quotes/route.ts`
- **Added imports**: `getServerSession` from `next-auth`, `authOptions` from `@/lib/auth`
- **GET handler**: Replaced `companyId = searchParams.get('companyId') || 'comp_1'` with session-based auth
- **POST handler**: Changed `tax = 19` → `tax = 18`; replaced `companyId = 'comp_1'` with session auth

## Stage Summary
- All 3 API route files now use `getServerSession(authOptions)` for authentication
- All handlers return `{ error: 'Non autorisé' }` with status 401 if no session
- `companyId` derived from `session.user.companyId` instead of hardcoded `'comp_1'`
- Tax rate corrected from 19% to 18% (Senegal VAT)
- ESLint passes with 0 errors
