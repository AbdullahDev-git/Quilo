# Quilo — E-Commerce Automation Platform

## What is Quilo?

Quilo is a **no-code e-commerce automation platform** that helps Shopify store owners automate returns, refunds, exchanges, and other operational workflows through a visual rules engine. It is designed as an AI-powered automation tool for e-commerce merchants.

**Tagline:** Automate your Shopify store with custom rules, webhooks, and workflows.

---

## Problem Statement

E-commerce stores, especially on Shopify, receive high volumes of return, refund, and exchange requests that require manual review. This creates several pain points:

- **Time-consuming manual processing** — support teams manually review every return/refund request
- **Inconsistent decision-making** — different team members apply different criteria to similar cases
- **Fraud detection challenges** — identifying suspicious return patterns is difficult without automation
- **Delayed customer satisfaction** — manual review slows down refund processing
- **Scaling limitations** — as order volume grows, so does the manual workload

**Quilo's solution:** Let merchants define IF/THEN rules (e.g., "if a return is for a damaged item AND the order is less than 20 days old, auto-refund") to automatically process requests, flag suspicious ones, and create exchanges — all without writing code.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.2.10 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS v4 | ^4 |
| UI Components | shadcn/ui (Radix UI primitives) | — |
| Icons | Lucide React + Material Symbols | — |
| Backend | Express.js (separate server) | 5.2.1 |
| Database ORM | Drizzle ORM | 0.45.2 |
| Database (Dev) | SQLite via sql.js | — |
| Database (Prod) | PostgreSQL via @neondatabase/serverless | — |
| Auth | JWT + bcryptjs + Google OAuth | — |
| Job Queue | BullMQ (Redis-backed) | 5.80.8 |
| Shopify API | @shopify/shopify-api | 13.1.0 |
| Payments | Stripe | 22.3.2 |
| Error Tracking | Sentry | 10.66.0 |
| Forms | react-hook-form + zod | — |
| Fonts | Inter + Geist Mono | — |
| Toasts | sonner | 2.0.7 |
| Dev Runner | tsx | 4.23.1 |
| Process Manager | concurrently | 10.0.3 |

---

## Architecture Overview

```
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Next.js (port 3001) │────▶│  Express (port 4000)  │────▶│   SQLite    │
│   Frontend SSR/CSR   │     │   REST API Server     │     │   (sql.js)  │
│                      │     │   JWT Auth Middleware  │     │             │
│   AuthContext │      │     │   Drizzle ORM         │     │   quilo.db  │
│   Dashboard UI       │     │   BullMQ Workers      │     │             │
└──────────────────────┘     └──────────────────────┘     └─────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │   Shopify API  │
                              │   Stripe API   │
                              └───────────────┘
```

**Communication:** The browser makes HTTP requests to the Next.js server (same origin). Next.js API routes proxy to the Express backend. Auth is handled via httpOnly `session` cookies.

**Development:** Run `npm run dev:all` to start both Next.js and Express simultaneously via `concurrently`.

---

## Functionalities & Implementation Details

### 1. Authentication System

**Three authentication methods** are supported:

#### 1a. Email/Password Registration

**Flow:**
1. User fills name, email, password on `/register`
2. Frontend calls `AuthContext.register()` which hits `POST /api/auth/register`
3. Express checks for existing email (409 if duplicate), hashes password with **bcrypt** (12 salt rounds)
4. Inserts user into the `users` table via Drizzle ORM
5. Generates a **JWT** signed with `JWT_SECRET`, stores it in an httpOnly `session` cookie (7-day expiry)
6. Returns `{ user: { id, email, name } }`
7. AuthContext sets user state, redirects to `/onboarding`

**Key files:**
- `src/app/(auth)/register/page.tsx` — registration form UI
- `src/app/api/auth/register/route.ts` — Next.js proxy to Express
- `backend/routes/auth.ts` (POST /register) — Express handler
- `backend/middleware/auth.ts` — JWT generation + verification
- `src/lib/auth-context.tsx` — React context managing auth state

#### 1b. Email/Password Login

Same flow as registration but uses **bcrypt.compare()** instead of hash. Redirects to `/dashboard`.

**Key files:**
- `src/app/(auth)/login/page.tsx` — login form UI
- `src/app/api/auth/login/route.ts` — Next.js proxy
- `backend/routes/auth.ts` (POST /login) — Express handler

#### 1c. Google OAuth (Server-Side Redirect)

**Flow:**
1. User clicks "Sign in with Google" → `window.location.href = "/api/auth/google"`
2. Next.js `GET /api/auth/google` → `Response.redirect("http://localhost:4000/api/auth/google")`
3. Express builds Google OAuth URL with `client_id`, `redirect_uri`, `scope=openid email profile`, `prompt=consent` → redirects to accounts.google.com
4. User consents → Google redirects to `http://localhost:4000/api/auth/google/callback?code=...`
5. Express exchanges `code` for tokens via `https://oauth2.googleapis.com/token`
6. Express verifies the ID token using **google-auth-library** `OAuth2Client.verifyIdToken()`
7. Extracts user info (sub, email, name), finds or creates user (password_hash stored as `google_{sub}`)
8. Generates JWT, redirects to `http://localhost:3001/api/auth/google/callback?token=JWT`
9. Next.js callback route sets the `session` httpOnly cookie and redirects to `/dashboard`

**Key files:**
- `src/components/google-sign-in.tsx` — Google button component
- `src/app/api/auth/google/route.ts` — GET (redirect) + POST (ID token) handlers
- `src/app/api/auth/google/callback/route.ts` — sets cookie from JWT token param
- `backend/routes/auth.ts` (GET /google, GET /google/callback) — Express handlers

#### Session Validation

- `GET /api/auth/me` uses the `authenticate` middleware
- Middleware extracts JWT from `req.cookies.session` or `Authorization: Bearer <token>`
- Verifies with `jwt.verify()`, sets `req.userId`
- Returns `{ user: { id, email, name } }` or `{ user: null }`
- AuthContext calls this on mount to hydrate the session

#### Route Protection

- **Backend:** `authenticate` middleware applied to `/api/rules`, `/api/stores`, `/api/auth/me`
- **Frontend:** `DashboardLayout` checks `user` from AuthContext — if null after loading, redirects to `/login`

#### Audit Logging

**Implementation:** Express middleware (`backend/middleware/audit.ts`) that monkey-patches `res.json` to asynchronously insert an audit log entry before sending the response.

**Audited events:** `rule.created`, `rule.updated`, `rule.deleted`, `store.connected`, `store.disconnected`

**Frontend:** `/dashboard/activity` displays the audit trail with search and filters.

**Key files:**
- `backend/middleware/audit.ts` — audit middleware
- `src/app/(dashboard)/dashboard/activity/page.tsx` — audit log UI

---

### 2. Rules Engine

The core feature of Quilo — a visual IF/THEN rule builder for automating e-commerce workflows.

**Frontend (src/app/(dashboard)/dashboard/rules/page.tsx):**
- Tabbed interface: Active / Paused / Templates
- Each rule has: name, conditions, actions, status toggle
- **Conditions** are built with:
  - Fields: `reason`, `order_age_days`, `in_stock`, `order_total`, `customer_email`, etc.
  - Operators: `equals`, `not_equals`, `greater_than`, `less_than`, `contains`, `not_contains`, `starts_with`, `ends_with`, `in`, `not_in`, `between`, `is_set`, `is_not_set`
  - Logic: ALL (AND) or ANY (OR)
- **Actions** available: `Auto-refund`, `Offer exchange`, `Send notification`, `Flag for manual review`, `Apply discount`
- Inline editing — users can rename rules, change conditions/actions directly in the UI
- Status toggle to enable/disable rules

**Backend (backend/routes/rules.ts):**
- Full CRUD: `GET /api/rules`, `POST /api/rules`, `PUT /api/rules/:id`, `DELETE /api/rules/:id`
- Create/Update/Delete operations are audited
- Drizzle ORM stores conditions and actions as JSON columns

**Rules Engine Service (backend/services/rules-engine.ts):**
- Framework-agnostic `RulesEngine` class
- `evaluate(conditions, data, logic)` — returns boolean
  - If `logic === "all"`, all conditions must match (AND)
  - If `logic === "any"`, any one condition must match (OR)
- `executeActions(actions, context)` — async action dispatcher
  - Actions currently have stub implementations ready for Shopify API integration
- Supported action types: `send_email`, `update_order_tags`, `update_product`, `create_discount`, `send_webhook`, `fulfill_order`

**Key files:**
- `backend/routes/rules.ts`
- `backend/services/rules-engine.ts`
- `src/app/(dashboard)/dashboard/rules/page.tsx`

---

### 3. Shopify Integration

**OAuth Setup (backend/plugins/shopify.ts):**
- `getShopifyAuthUrl(shop, state)` — builds Shopify OAuth URL with required scopes
- `getAccessToken(shop, code)` — exchanges OAuth code for a permanent access token
- `verifyWebhook(body, hmac)` — verifies Shopify webhook HMAC signatures

**API Client (backend/services/shopify.ts):**
- `getProducts(limit)` — fetches active products via REST
- `getOrders(limit, status)` — fetches orders via REST
- `graphql<T>(query, variables)` — raw GraphQL queries
- `updateProduct(productId, data)` — updates product via REST
- `addOrderTags(orderId, tags)` — adds tags via GraphQL mutation

**Store Connection (backend/routes/stores.ts):**
- `POST /api/stores/connect` — receives `{ shop, code }`, gets access token, creates store record
- `GET /api/stores` — lists stores for authenticated user
- `DELETE /api/stores/:id` — disconnects store (audited)

**Webhook Handler (backend/controllers/shopify.ts):**
- `handleShopifyWebhook` — receives Shopify webhooks, looks up the store, logs the event (stub)
- `syncOrders` — syncs orders from Shopify (stub)

**Frontend:**
- `/dashboard/stores` — lists connected stores
- `/dashboard/connect-store` — platform selection + Shopify OAuth initiation
- `/onboarding` — 3-step wizard (Connect Store → Choose Plan → Set First Rule)

**Key files:**
- `backend/plugins/shopify.ts`
- `backend/services/shopify.ts`
- `backend/routes/stores.ts`
- `backend/controllers/shopify.ts`
- `src/app/(dashboard)/dashboard/stores/page.tsx`
- `src/app/(dashboard)/dashboard/connect-store/page.tsx`

---

### 4. Stripe Billing

**Stripe Client (backend/plugins/stripe.ts):**
- Initialized lazily — only creates the Stripe instance when `STRIPE_SECRET_KEY` is set
- `createCustomer(email, name)` — creates a Stripe customer
- `createSubscription(customerId, priceId)` — creates a subscription
- `constructWebhookEvent(body, signature, webhookSecret)` — verifies Stripe webhook signatures

**Stripe Service (backend/services/stripe.ts):**
- `createCheckoutSession(userId, priceId, successUrl, cancelUrl)` — creates Stripe Checkout session
- `cancelSubscription(subscriptionId)` — cancels subscription
- `getSubscription(subscriptionId)` — retrieves subscription

**Webhook Controller (backend/controllers/stripe.ts):**
- `handleStripeWebhook` — handles `checkout.session.completed` (creates subscription record in DB) and `customer.subscription.deleted` (marks subscription as cancelled)

**Pricing Plans (frontend):**
- **Starter:** $29/month — 500 rules, 1 store, email support
- **Pro:** $79/month — 5,000 rules, 5 stores, priority support
- **Enterprise:** $199/month — unlimited rules, unlimited stores, dedicated support

**Key files:**
- `backend/plugins/stripe.ts`
- `backend/services/stripe.ts`
- `backend/controllers/stripe.ts`
- `src/app/(dashboard)/dashboard/billing/page.tsx`

---

### 5. Webhook Management

**Database:** `webhooks` table stores topic, endpoint, status per store.

**Frontend:** `/dashboard/webhooks` — lists configured webhooks with status indicators.

**Delivery Queue (backend/jobs/queue.ts):**
- `webhookDeliveryQueue` — BullMQ queue dedicated to webhook delivery
- Worker POSTs payloads to configured URLs
- 5 retry attempts with exponential backoff
- Job TTL of 60 seconds per attempt

**Key files:**
- `src/app/(dashboard)/dashboard/webhooks/page.tsx`
- `backend/jobs/queue.ts`

---

### 6. Job Queue System (BullMQ)

**Architecture:**
- Three separate BullMQ queues backed by Redis
- Each queue has a worker that processes jobs and retries on failure

| Queue | Purpose | Retries | Backoff |
|-------|---------|---------|---------|
| `rule-evaluation` | Evaluates rules against events | 3 | Exponential (5s base) |
| `webhook-delivery` | Delivers outgoing webhooks | 5 | Exponential (5s base) |
| `email` | Sends email notifications | 3 | Fixed 30s |

**Key files:**
- `backend/jobs/queue.ts`

---

### 7. Dashboard

**Frontend (src/app/(dashboard)/dashboard/page.tsx):**
- Fraud alert banner (hardcoded demo)
- 4 metric cards: Refunds Processed, Money Saved via Exchanges, Hours Saved, Pending Approvals
- Recent Activity list
- Connected Stores sidebar
- Quick Stats panel

**Layout (src/components/dashboard-layout.tsx):**
- Fixed sidebar (indigo `#1f108e`) with nav items
- Collapsible sidebar (w-60 ↔ w-16) on desktop
- Mobile drawer overlay with hamburger button
- Search bar + notification bell + user avatar in top bar
- Dark mode support via `.dark` class
- Auth protection — redirects to `/login` if not authenticated

**Key files:**
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard-layout.tsx`

---

### 8. Orders

**Frontend (src/app/(dashboard)/dashboard/orders/page.tsx):**
- Table of orders with columns: Order ID, Customer, Product, Amount, Status, Date
- Filter by status + export button
- Side panel with order details
- Action buttons: Process Refund, Mark as Fraud
- Data is static/mock — not yet connected to backend

**Key files:**
- `src/app/(dashboard)/dashboard/orders/page.tsx`

---

### 9. Approval Queue

**Frontend (src/app/(dashboard)/dashboard/approval-queue/page.tsx):**
- Items requiring manual review
- Risk levels: Low (green), Medium (amber), High (red)
- Approve / Reject action buttons per item
- Static/mock data

**Key files:**
- `src/app/(dashboard)/dashboard/approval-queue/page.tsx`

---

### 10. Analytics

**Frontend (src/app/(dashboard)/dashboard/analytics/page.tsx):**
- Returns Overview: auto-approved / pending / flagged breakdown
- Money Saved: $12.8k (static demo)
- Monthly Automation Impact table
- Time range filters: 7 days / 30 days / 90 days

**Key files:**
- `src/app/(dashboard)/dashboard/analytics/page.tsx`

---

### 11. Settings

**Frontend (src/app/(dashboard)/dashboard/settings/page.tsx):**
Multi-tab settings panel:

| Tab | Features |
|-----|----------|
| **Profile** | Name, email, phone, timezone |
| **Preferences** | Dark mode toggle, email notifications, error reports |
| **Integrations** | Shopify, Stripe, Slack, ShipStation, Zendesk |
| **Spend Caps** | Monthly auto-refund limits per store |
| **Billing** | Plan comparison, payment method |
| **Team Members** | Invite team, role management (Admin/Member/Viewer) |

**Key files:**
- `src/app/(dashboard)/dashboard/settings/page.tsx`

---

### 12. Onboarding Wizard

**Frontend (src/app/onboarding/page.tsx):**
3-step post-registration setup:
1. **Connect Store** — Select platform (Shopify, WooCommerce, Magento, Custom API)
2. **Choose Plan** — Select pricing tier
3. **Set First Rule** — Quick rule template selection

**Key files:**
- `src/app/onboarding/page.tsx`

---

### 13. Landing Page

**Frontend (src/app/page.tsx):**
Marketing landing page with:
- Hero section with CTA "Automate Your Store"
- Feature highlights (Visual Rules Builder, Real-Time Sync, Fraud Detection, Custom Workflows)
- Footer with links

**Key files:**
- `src/app/page.tsx`

---

## Database Schema

Six tables defined with Drizzle ORM (`backend/models/schema.ts`):

### users
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | Auto-generated primary key |
| email | text | Unique, not null |
| name | text | Not null |
| password_hash | text | Not null |
| created_at | text (ISO) | Auto-generated |
| updated_at | text (ISO) | Auto-generated |

### stores
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| user_id | text | FK → users.id |
| name | text | — |
| domain | text | Unique |
| access_token | text | Shopify access token |
| shopify_store_id | text | Shopify store ID |
| status | text | Default 'active' |

### rules
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| user_id | text | FK → users.id |
| store_id | text | FK → stores.id (nullable) |
| name | text | — |
| description | text | — |
| conditions | text (JSON) | Rule conditions |
| actions | text (JSON) | Rule actions |
| logic | text | 'all' or 'any', default 'all' |
| status | text | 'active' or 'paused', default 'active' |
| trigger_count | integer | Auto-incremented |
| last_triggered_at | text (ISO) | — |

### webhooks
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| store_id | text | FK → stores.id |
| topic | text | Webhook event type |
| endpoint | text | Target URL |
| status | text | Default 'active' |

### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| user_id | text | FK → users.id (nullable) |
| store_id | text | FK → stores.id (nullable) |
| event | text | Event type string |
| description | text | Human-readable description |
| metadata | text (JSON) | Additional context |
| ip_address | text | — |

### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| user_id | text | FK → users.id |
| stripe_subscription_id | text | Stripe subscription ID |
| plan | text | 'free', 'starter', 'pro', 'enterprise' |
| status | text | Default 'active' |

---

## API Reference

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account with email/password |
| POST | /api/auth/login | No | Login with email/password |
| POST | /api/auth/google | No | Google sign-in via ID token |
| GET | /api/auth/google | No | Redirect to Google OAuth consent screen |
| GET | /api/auth/google/callback | No | Google OAuth callback (sets cookie) |
| POST | /api/auth/logout | No | Clear session cookie |
| GET | /api/auth/me | Yes | Get current user info |

### Rules Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/rules | Yes | List user's rules |
| POST | /api/rules | Yes | Create new rule (audited) |
| PUT | /api/rules/:id | Yes | Update rule (audited) |
| DELETE | /api/rules/:id | Yes | Delete rule (audited) |

### Stores Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/stores | Yes | List connected stores |
| POST | /api/stores/connect | Yes | Connect Shopify store (audited) |
| DELETE | /api/stores/:id | Yes | Disconnect store (audited) |
| POST | /api/stores/:storeId/sync | Yes | Sync orders from Shopify |

### Webhook Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/webhooks/shopify | HMAC | Receive Shopify webhook events |
| POST | /api/webhooks/stripe | Signature | Receive Stripe webhook events |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | No | Health check |

---

## Frontend Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Login form |
| `/register` | Public | Registration form |
| `/onboarding` | Protected | Post-registration wizard |
| `/dashboard` | Protected | Main dashboard |
| `/dashboard/rules` | Protected | Rules engine |
| `/dashboard/orders` | Protected | Order management |
| `/dashboard/analytics` | Protected | Analytics |
| `/dashboard/settings` | Protected | Settings |
| `/dashboard/billing` | Protected | Subscription billing |
| `/dashboard/stores` | Protected | Store management |
| `/dashboard/approval-queue` | Protected | Manual review queue |
| `/dashboard/activity` | Protected | Audit log |
| `/dashboard/connect-store` | Protected | Store connection |
| `/dashboard/webhooks` | Protected | Webhook management |

---

## Styling System

**Tailwind CSS v4** with a custom `@theme` block defining a Material Design 3-inspired color palette:

- **Primary:** `#1f108e` (deep indigo)
- **Secondary:** `#006b5f` (teal)
- **Background:** `#f8f9ff` (light), dark mode overrides
- Custom surface color scale: `surface`, `surface-container-low`, `surface-container`, `surface-dim`, `surface-bright`
- Custom typography: `text-headline-lg`, `text-body-md`, `text-label-md`, etc.
- Fonts: Inter (sans-serif) + Geist Mono (monospace)

**Dark mode:** Implemented via a custom React context (`theme-provider.tsx`), persisted to `localStorage` key `quilo-theme`. Applied via `.dark` CSS class on the dashboard root element.

**UI Component Library:** shadcn/ui components built on Radix UI primitives:
- Button, Card, Input, Badge, Avatar, Switch, Table, DropdownMenu, Skeleton, Label, Separator
- Utility function `cn()` merges Tailwind classes using clsx + tailwind-merge

---

## Development Guide

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
# Install dependencies
npm install

# Create .env file with required variables (see .env)
# Run both servers
npm run dev:all
```

### Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server only |
| `npm run dev:server` | Start Express dev server only |
| `npm run dev:all` | Start both (Next.js + Express) |
| `npm run build` | Build Next.js for production |
| `npm run server` | Start Express in production mode |
| `npm run worker` | Start BullMQ worker |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |

### Database
- **Development:** SQLite via sql.js (file: `quilo.db`)
- **Production:** PostgreSQL via @neondatabase/serverless
- Schema defined in `backend/models/schema.ts`
- Migrations in `drizzle/` directory

### OAuth Setup (Google)
To enable Google sign-in, set these in `.env`:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

Add `http://localhost:4000/api/auth/google/callback` as an **Authorized redirect URI** in Google Cloud Console.

---

## Deployment

Configured for deployment on:
- **Next.js** → Vercel
- **Express** → Railway (via Procfile + Nixpacks config)
- **Redis** → Redis Cloud or Railway add-on
- **Database** → Neon (PostgreSQL)
- **Error Tracking** → Sentry

---

## Current Status

The application is in **early development**. Key aspects:

- ✅ Authentication (email/password + Google OAuth) — fully functional
- ✅ Backend API for Rules, Stores, Auth — built and working
- ✅ Shopify integration (OAuth, API client, webhooks) — built
- ✅ Stripe billing — built (requires API keys)
- ✅ Job queue system — built (requires Redis)
- ✅ Frontend UI for all pages — built (many use static/mock data)
- ❌ Dashboard pages not yet wired to backend APIs for dynamic data
- ❌ Rules management frontend uses local React state, not backend API
- ❌ Order/analytics/approval-queue data is hardcoded
