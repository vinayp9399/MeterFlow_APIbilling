# MeterFlow — Usage-Based API Billing & Metering Platform

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Cloud-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Razorpay-Integrated-02042B?style=for-the-badge&logo=razorpay&logoColor=white" />
</p>

---

## Introduction

MeterFlow is a full-stack SaaS platform that simulates how real-world API companies manage, monetize, and meter their APIs. It allows **API providers** to register and manage APIs, generate access keys, and track consumer usage — while **consumers** can browse available APIs, subscribe to them, and are automatically billed based on how many requests they make each month.

The platform is built around a **central API gateway** — all consumer requests pass through MeterFlow's proxy layer, which validates the API key, enforces rate limits, logs every request, and triggers billing when the free tier is exhausted. Payment is handled in real-time via Razorpay, with a modal that appears automatically the moment a consumer exceeds their free quota.

MeterFlow is inspired by real systems such as **Stripe Billing**, **RapidAPI**, **AWS API Gateway**, and **OpenAI's usage-based pricing**.

---

## Use Cases

**For API Providers**
- A developer builds a data API (weather, sports, finance) and wants to monetize it without building billing infrastructure from scratch
- A startup wants to offer a freemium API product — free for light users, paid beyond a threshold
- A team wants to monitor which endpoints are being hit, by whom, and how often

**For API Consumers**
- A developer wants to integrate third-party APIs without exposing direct credentials in their code
- A team wants a single gateway URL for all external API calls with centralized logging
- A user wants to track exactly how much they are spending on API usage each month

**For Platform Admins**
- Monitoring platform-wide health — total requests, errors, revenue across all users
- Managing API listings — activating or deactivating APIs across the platform
- Viewing user distribution by role and tracking growth

---

## Industry Value

Usage-based billing is one of the fastest-growing monetization models in SaaS. Companies like Stripe, Twilio, OpenAI, and AWS have shifted away from flat subscription pricing toward metered billing — where customers pay only for what they consume.

MeterFlow addresses the core infrastructure challenge behind this model:

**Metering** — Every API request is intercepted at the gateway layer, logged with metadata (endpoint, latency, status code, timestamp), and associated with a specific consumer. This creates an auditable usage trail.

**Rate Limiting** — Redis-backed per-key rate limiting prevents abuse and ensures fair usage across consumers. This is the same approach used by enterprise API gateways like AWS API Gateway and Kong.

**Real-Time Billing** — Rather than running billing jobs at the end of the month, MeterFlow blocks requests at the gateway the moment the free tier is exhausted and surfaces a Razorpay payment modal immediately. This eliminates revenue leakage.

**Automated Invoicing** — BullMQ runs a scheduled billing job on the first of every month that calculates and records invoices for all consumers automatically, without manual intervention.

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MeterFlow Platform                        │
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │  Admin   │    │ Provider │    │ Consumer │                  │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
│        │               │               │                         │
│        ▼               ▼               ▼                         │
│   ┌─────────────────────────────────────────┐                   │
│   │              React Frontend              │                   │
│   │         (Role-based dashboards)          │                   │
│   └──────────────────┬──────────────────────┘                   │
│                       │ REST API calls                           │
│                       ▼                                          │
│   ┌─────────────────────────────────────────┐                   │
│   │           Express.js Backend             │                   │
│   │  /api/auth  /api/apis  /api/billing      │                   │
│   │  /api/admin  /api/consumer  /gateway     │                   │
│   └──────┬──────────────────────────────────┘                   │
│          │                                                        │
│    ┌─────┼─────────────────┐                                     │
│    ▼     ▼                 ▼                                     │
│ ┌──────┐ ┌───────┐ ┌─────────────┐                              │
│ │Mongo │ │ Redis │ │   BullMQ    │                              │
│ │  DB  │ │       │ │  (billing   │                              │
│ │      │ │ Rate  │ │   jobs)     │                              │
│ └──────┘ │ Limit │ └─────────────┘                              │
│          └───────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Roles

MeterFlow has three distinct user roles. Every new registration defaults to **Consumer**. Role upgrades must be done directly in the database — there is no self-service role selection, which mirrors how real platforms manage trust levels.

```
Register / Login
       │
       ▼
  role = "consumer"  ◄──── default for all new users
       │
       │   (Admin changes role in MongoDB)
       │
  ┌────┴──────────────────────┐
  │                           │
  ▼                           ▼
role = "provider"       role = "admin"
```

### Admin
- Views platform-wide stats: total users, total APIs, total requests, total revenue
- Sees all registered users with their roles
- Can activate or deactivate any API on the platform

### Provider
- Creates and manages their own APIs
- Generates, revokes, and rotates API keys
- Views usage analytics for requests made to their APIs by consumers
- Does **not** get billed — providers list APIs, consumers pay to use them

### Consumer
- Browses all active APIs listed by providers
- Subscribes to APIs to receive an API key
- Makes requests through the MeterFlow gateway
- Gets **50 free requests per month** — beyond that, pays ₹0.50 per 100 requests

**To change a user's role:**
```js
db.users.updateOne({ email: "dev@example.com" }, { $set: { role: "provider" } })
// Valid values: "admin", "provider", "consumer"
```

---

## Gateway Request Flow

Every consumer request goes through this flow:

```
Consumer App / curl / Postman
            │
            │  GET /gateway/pokemon/pikachu
            │  Header: X-API-Key: mf_abc123
            ▼
┌───────────────────────────┐
│     MeterFlow Gateway     │
│                           │
│  1. Is X-API-Key present? ├──── NO ──► 401 Unauthorized
│                           │
│  2. Is key valid & active?├──── NO ──► 401 Invalid Key
│                           │
│  3. Is API active?        ├──── NO ──► 404 API Not Found
│                           │
│  4. Is user a consumer?   │
│     Check usage this month│
│     vs free tier (50 req) │
│                           │
│     Usage >= 50?          ├──── YES ──► Upsert billing record
│                           │            Return 402 Payment Required
│     Bill already paid?    ├──── YES ──► Continue
│                           │
│  5. Redis rate limit check├── EXCEEDED ► 429 Too Many Requests
│     (per minute window)   │
│                           │
│  6. Forward to upstream   │
│     API via node-fetch    │
│                           │
│  7. Log usage to MongoDB  │ (async, non-blocking)
│     Update key stats      │ (async, non-blocking)
│                           │
└───────────┬───────────────┘
            │
            ▼
   Response back to consumer
   Headers added:
   X-Response-Time: 142ms
   X-RateLimit-Remaining: 47
   X-MeterFlow-API: Pokemon API
```

---

## Payment Flow

When a consumer exhausts their free tier:

```
Consumer makes 51st request
            │
            ▼
   Gateway returns HTTP 402
   {
     code: "PAYMENT_REQUIRED",
     data: {
       totalRequests: 51,
       freeRequests: 50,
       amount: 0.50,
       billingId: "abc123"
     }
   }
            │
            ▼
   Axios interceptor catches 402
            │
            ▼
   Fires window event:
   "meterflow:payment-required"
            │
            ▼
   PaymentModalProvider receives event
   (mounted at app root — works on any page)
            │
            ▼
┌───────────────────────────┐
│     Payment Modal Opens   │
│                           │
│  Shows usage breakdown    │
│  Amount due: ₹1000        │
│                           │
│  [Pay ₹1000 with Razorpay]│
└───────────┬───────────────┘
            │
            ▼
   POST /api/payments/create-order
            │
            ▼
   Backend creates Razorpay order
   Saves Payment record (status: created)
            │
            ▼
   Razorpay checkout opens
   (UPI / Card / Net Banking / Wallets)
            │
       ┌────┴────┐
       │         │
    Paid      Dismissed
       │         │
       ▼         ▼
  POST /api/    Modal back
  payments/     to prompt
  verify
       │
       ▼
  Backend verifies
  HMAC-SHA256 signature
       │
       ▼
  Payment → status: paid
  Billing → status: paid
       │
       ▼
  Modal shows success ✓
  "API access restored"
            │
            ▼
  Consumer retries request
  Gateway allows through ✓
```

---

## Billing Calculation

```
Monthly billing runs on 1st of every month (BullMQ cron)

For each consumer:

  Total requests this month
           │
           ▼
  Is total > 50 (free tier)?
           │
     NO ───┤─── YES
     │         │
     ▼         ▼
  Amount = 0   Billable = total - 50
               Amount = (billable / 100) × ₹0.50
           │
           ▼
  Upsert billing record in MongoDB
  { userId, month, totalRequests,
    freeRequests: 50, billableRequests,
    amount, status: "pending" }
```

**Example:**

| Requests Used | Free | Billable | Amount |
|---|---|---|---|
| 30 | 30 | 0 | ₹0.00 |
| 50 | 50 | 0 | ₹0.00 |
| 150 | 50 | 100 | ₹1000 |

---

## Authentication Flow

```
Register / Login
      │
      ▼
Backend returns:
  accessToken  (expires: 15 min)
  refreshToken (expires: 7 days)
      │
      ▼
Stored in localStorage
      │
      ▼
Every API request:
  Authorization: Bearer <accessToken>
      │
      ▼
  accessToken expired? (401 received)
      │
      ▼
  Axios interceptor fires automatically
      │
      ▼
  POST /api/auth/refresh
  Body: { refreshToken }
      │
      ▼
  New accessToken issued
      │
      ▼
  Original request retried ✓
  User never sees an error
```

---

## Tech Stack & Rationale

| Technology | Used For | Why This Over Alternatives |
|---|---|---|
| MongoDB | API logs, usage tracking, user data | Schemaless documents handle flexible log metadata; aggregation pipeline makes time-series analytics fast |
| Redis | Rate limiting, BullMQ backing store | In-memory — checks complete in under 1ms vs 10–50ms for MongoDB; atomic INCR prevents race conditions |
| BullMQ | Monthly billing cron job | Jobs persist across server restarts; simple setInterval would lose jobs on crash |
| Razorpay | Payment processing | Built for Indian market; supports UPI natively; better INR support than Stripe in India |
| Socket.io | Real-time dashboard updates | WebSocket with automatic fallback; no polling needed for live counters |
| JWT + Refresh Tokens | Authentication | Stateless — no session store needed; transparent renewal via Axios interceptor |
| Vite | Frontend build tool | Dev server starts in milliseconds; native ES modules, no webpack overhead |

---

## Technologies Used

### Backend

**Node.js** — The JavaScript runtime. Single-threaded event loop handles thousands of concurrent proxy requests without spawning a thread per connection.

**Express.js** — HTTP routing and middleware. Strictly modular file structure: routes → controllers → models. All endpoints follow REST conventions.

**Mongoose** — ODM for MongoDB. Provides schema validation and a clean async/await query API. All database calls use async/await with try/catch — no callbacks.

**MongoDB Atlas** — Cloud-hosted MongoDB. Five collections: `users`, `apis`, `apikeys`, `usagelogs`, `billings`. Compound indexes on `userId + timestamp` and `apiId + timestamp` for fast analytics queries.

**Redis Cloud** — Managed Redis. Stores rate limit counters (auto-expiring, 60-second TTL) and BullMQ job state.

**ioredis** — Redis client. Configured with `lazyConnect: true` — app starts normally even if Redis is temporarily unavailable, with rate limiting silently skipped.

**BullMQ** — Job queue on Redis. Schedules the monthly billing cron, survives server restarts, retries failed jobs automatically.

**JSON Web Tokens** — Access tokens expire in 15 minutes, refresh tokens in 7 days. Both signed with secret keys from environment variables.

**bcryptjs** — Hashes passwords with salt factor 10 before storing. Hashes are one-way — cannot be reversed even if the database is leaked.

**node-fetch** — Forwards HTTP requests from the gateway to upstream APIs (PokéAPI, CoinGecko, DummyJSON, etc.).

**Razorpay SDK** — Creates payment orders and verifies HMAC-SHA256 signatures on payment callbacks. Signature verification prevents forged payment confirmations.

**Socket.io** — Real-time push updates to connected dashboards without polling.

**dotenv** — Loads secrets from `.env` into `process.env` at startup. Keeps credentials out of the codebase.

### Frontend

**React 18** — Component-based UI. Functional components throughout with hooks. Three separate page trees — one per role — with shared layout and auth context.

**Vite** — Build tool. Proxies `/api/*` to the backend in development. Reads `VITE_API_URL` in production to point at the deployed backend.

**React Router v6** — Client-side routing with nested routes. `ProtectedRoute` redirects unauthenticated users. `RoleDashboard` reads `user.role` and redirects to the correct dashboard.

**TanStack Query** — Server-state management. Wraps every API call in `useQuery` with caching, background refetch, and automatic cache invalidation on mutations.

**Axios** — HTTP client with two interceptors: attaches Bearer token to every request; handles 401 by refreshing the token silently, and 402 by triggering the payment modal globally.

**Tailwind CSS** — Utility-first styling. All styles are class names in JSX. Custom tokens (brand colors, surface colors, animations) defined in `tailwind.config.js`.

**Recharts** — Declarative chart components built on D3. Used for area charts and bar charts on dashboards.

---

## Billing Model

| Tier | Requests | Price |
|------|----------|-------|
| Free | 0 – 50 / month | ₹0 |
| Pay-as-you-go | Every 100 beyond 50 | ₹0.50 |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-username/meterflow
cd meterflow

# 2. Backend
cd backend
npm install
cp .env.example .env
# Fill in: MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, REDIS_URL, RAZORPAY keys
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev

# Open http://localhost:5173
```

## Production Deployment

| Service | Platform | Notes |
|---|---|---|
| Backend | Render / Railway | Needs persistent process for Socket.io + BullMQ |
| Frontend | Vercel | Set `VITE_API_URL` env var to your backend URL |
| Database | MongoDB Atlas | Free M0 tier works for development |
| Cache | Redis Cloud | Free 30MB tier is sufficient |

---

*Built with the MERN stack · Inspired by Stripe Billing, RapidAPI, and AWS API Gateway*