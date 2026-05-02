# MeterFlow – Usage-Based API Billing Platform

A full-stack SaaS platform that lets developers create APIs, generate API keys, track usage per request, apply rate limiting, and calculate billing based on usage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) + Tailwind CSS + React Query + Recharts |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Cache / Rate Limiting | Redis (ioredis) |
| Realtime | Socket.io |
| Queue | BullMQ |

---

## Project Structure

```
meterflow/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── redis.js           # Redis client (singleton)
│   ├── controllers/
│   │   ├── authController.js  # JWT auth (register, login, refresh, logout)
│   │   ├── apiController.js   # API + API key CRUD
│   │   ├── gatewayController.js # Proxy layer (rate limit + log + forward)
│   │   ├── usageController.js # Usage analytics
│   │   └── billingController.js # Billing calculation
│   ├── middleware/
│   │   ├── auth.js            # JWT protect middleware
│   │   └── rateLimiter.js     # Redis-based rate limiter
│   ├── models/
│   │   ├── User.js
│   │   ├── Api.js
│   │   ├── ApiKey.js
│   │   ├── UsageLog.js
│   │   └── Billing.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── apis.js
│   │   ├── gateway.js
│   │   ├── usage.js
│   │   └── billing.js
│   ├── jobs/
│   │   └── billingJob.js      # BullMQ monthly billing job
│   └── server.js              # Entry point + Socket.io
│
└── frontend/
    └── src/
        ├── components/
        │   └── layout/Layout.jsx
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── ApisPage.jsx
        │   ├── ApiDetailPage.jsx
        │   ├── UsagePage.jsx
        │   ├── BillingPage.jsx
        │   └── GatewayPage.jsx
        ├── services/
        │   └── api.js          # Axios instance with interceptors
        └── App.jsx
```

---

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud) — optional, falls back gracefully

---

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables (backend/.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/meterflow
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apis` | List all user's APIs |
| POST | `/api/apis` | Create new API |
| GET | `/api/apis/presets` | Get preset API templates |
| GET | `/api/apis/:id` | Get single API |
| PUT | `/api/apis/:id` | Update API |
| DELETE | `/api/apis/:id` | Delete API |
| GET | `/api/apis/:id/keys` | List API keys |
| POST | `/api/apis/:id/keys` | Generate new key |
| PATCH | `/api/apis/:id/keys/:keyId/revoke` | Revoke key |
| POST | `/api/apis/:id/keys/:keyId/rotate` | Rotate key |

### Gateway
| Method | Endpoint | Description |
|--------|----------|-------------|
| ALL | `/gateway/*` | Proxy any request (requires `X-API-Key` header) |

### Usage
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/usage/summary` | Usage totals |
| GET | `/api/usage/logs` | Paginated request logs |
| GET | `/api/usage/by-day` | Daily usage chart data |
| GET | `/api/usage/by-api` | Usage per API |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/current` | Current month's bill |
| GET | `/api/billing/history` | Past 12 months |
| GET | `/api/billing/pricing` | Pricing info |
| PATCH | `/api/billing/:id/pay` | Mark bill as paid |

---

## Gateway Usage Example

```bash
# All requests go through /gateway/* with X-API-Key header
curl http://localhost:5000/gateway/pokemon/pikachu \
  -H "X-API-Key: mf_your_api_key_here"
```

---

## Billing Model

- **Free tier:** 1,000 requests/month included
- **Pro:** ₹0.50 per 100 requests beyond free tier
- Monthly billing jobs run via BullMQ (scheduled for 1st of each month)

---

## Free Public APIs for Testing

| API | Base URL | Category |
|-----|----------|----------|
| Pokémon API | `https://pokeapi.co/api/v2` | pokemon |
| JSON Placeholder | `https://jsonplaceholder.typicode.com` | placeholder |
| CoinGecko | `https://api.coingecko.com/api/v3` | crypto |
| DummyJSON | `https://dummyjson.com` | products |
