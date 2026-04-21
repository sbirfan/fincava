# Fincava — Architecture Document
**Colombian Agricultural Marketplace**
*April 2026*

---

## 1. Project Overview

Fincava is a B2B marketplace and supply-chain financing platform that connects Colombian smallholder farmers and cooperatives with international buyers. The platform covers the full commercial journey: supplier onboarding and AI scoring, product discovery, RFQ/inquiry management, order tracking, embedded trade finance, and post-sale communications via WhatsApp.

---

## 2. Monorepo Structure

The project is a **pnpm workspace** monorepo with the following top-level layout:

```
/
├── artifacts/
│   ├── fincava/          # React 19 + Vite frontend
│   ├── api-server/       # Express 5 API
│   └── mockup-sandbox/   # Isolated UI component preview server
├── lib/
│   ├── db/               # Drizzle ORM schema + migrations (shared)
│   ├── api-spec/         # OpenAPI / Swagger definitions
│   ├── api-zod/          # Auto-generated Zod validation schemas
│   └── api-client-react/ # Auto-generated TanStack Query hooks
└── scripts/              # Build and maintenance utilities
```

Each artifact is an independent deployable unit, bound to a port via the `PORT` environment variable and proxied through Replit's path-based routing.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, Framer Motion, Lucide React |
| Data fetching | TanStack Query (React Query) + auto-generated hooks from `lib/api-client-react` |
| Backend | Node.js, Express 5, TypeScript, tsx/esbuild |
| Database | PostgreSQL (Replit-managed), Drizzle ORM |
| Validation | Zod (server-side schemas in `src/schemas.ts`; shared via `lib/api-zod`) |
| AI | Anthropic Claude (`claude-sonnet-4-5`) — export readiness scoring + document generation |
| Messaging | Twilio WhatsApp Business API |
| Auth | JWT (Bearer tokens), bcrypt password hashing |
| Logging | Pino (structured JSON logs) |
| Package manager | pnpm v10 |

---

## 4. Database Schema

All tables live in `lib/db/src/schema/` and are managed by Drizzle ORM.

### 4.1 Users & Auth
| Table | Purpose |
|---|---|
| `users` | Authentication — email, bcrypt password, role (`BUYER`, `SUPPLIER`, `ADMIN`), phone |
| `companies` | Company linked 1:1 to a user — name, tax ID, address |

### 4.2 Suppliers
| Table | Purpose |
|---|---|
| `suppliers` | Core profile — `nombreCompleto`, `whatsappNumber`, department, municipio, `supplierType` (`FARMER`, `COOPERATIVE`, `PROCESSOR`, `EXPORTER`), `status` (`PENDING`, `ACTIVE`, `INACTIVE`), primary product |
| `supplier_certifications` | Certifications held (Fairtrade, Organic, RainForest Alliance, etc.) |
| `supplier_products` | Products offered by a supplier with details (variety, altitude, cupping score) |

### 4.3 AI Outputs
| Table | Purpose |
|---|---|
| `ai_outputs` | One row per Claude API call — `callType` (`ONBOARD_SCORE`, `DOCUMENT_GENERATION`), `exportReadinessScore` (0–100), `pathway` (`READY_TO_EXPORT`, `NEEDS_PREPARATION`, `EARLY_STAGE`), `capitalCapacityCop`, `complianceGaps`, `gapAnalysis`, `documentContent`, `whatsappMessageSent` (Twilio SID) |

### 4.4 Marketplace
| Table | Purpose |
|---|---|
| `products` | Marketplace catalog — linked to supplier, category, price, certifications, origin story |
| `origin_stories` | Human narrative behind a farm/cooperative |

### 4.5 Transactions
| Table | Purpose |
|---|---|
| `inquiries` | Buyer-to-supplier leads |
| `rfqs` | Request-for-Quote documents |
| `orders` | Order lifecycle — status (`PENDING`, `CONFIRMED`, `SHIPPED`, `COMPLETED`, `CANCELLED`) |
| `order_items` | Line items per order |

### 4.6 Finance
| Table | Purpose |
|---|---|
| `loans` | Trade finance loans — amount, APR, status (`PENDING`, `APPROVED`, `ACTIVE`, `REPAID`, `DEFAULTED`) |
| `repayments` | Individual repayment records against a loan |

### 4.7 Communication
| Table | Purpose |
|---|---|
| `messages` | In-platform messaging between buyers and suppliers |

---

## 5. API Routes

Base path: `/api`

### Auth — `src/routes/auth.ts`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user (with optional company) |
| POST | `/auth/login` | Authenticate, returns JWT |
| GET | `/auth/me` | Current user profile |

### Suppliers — `src/routes/suppliers.ts`
| Method | Path | Description |
|---|---|---|
| POST | `/suppliers/onboard` | Multi-step supplier registration, triggers Claude scoring |
| GET | `/suppliers/admin-list` | Paginated admin list with AI scores + `whatsappMessageSent` |
| GET | `/suppliers/:id` | Supplier detail (public) |
| GET | `/suppliers/:id/document` | Latest generated compliance document |
| POST | `/suppliers/:id/generate-document` | Trigger Claude document generation |
| POST | `/suppliers/:id/send-whatsapp` | Manual WhatsApp message trigger (admin only) |

### Admin — `src/routes/admin.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | All users with company + phone |
| POST | `/admin/users` | Create user + optional company |
| PATCH | `/admin/users/:id` | Update user (upserts company row if missing) |
| DELETE | `/admin/users/:id` | Delete user |
| PATCH | `/admin/suppliers/:id/status` | Update supplier status |
| GET | `/admin/stats` | Dashboard KPIs |

### Products — `src/routes/products.ts`
| Method | Path | Description |
|---|---|---|
| GET | `/products` | Browse marketplace (filter by origin, cert, score) |
| GET | `/products/:id` | Product detail |
| POST | `/products` | Create listing (supplier) |
| PATCH | `/products/:id` | Update listing |
| DELETE | `/products/:id` | Remove listing |

### Orders & Finance
| Method | Path | Description |
|---|---|---|
| GET/POST | `/orders` | List / create orders |
| PATCH | `/orders/:id/status` | Advance order status |
| GET/POST | `/financing/loans` | List / apply for trade finance loans |
| POST | `/financing/loans/:id/repayments` | Record repayment |

---

## 6. Feature Descriptions

### 6.1 Supplier Onboarding + AI Scoring
New suppliers submit a multi-step registration form (personal info, location, products, certifications). On submission, `scoreSupplier()` calls Claude with a structured prompt. Claude returns:
- `export_readiness_score` (0–100)
- `pathway` (READY_TO_EXPORT / NEEDS_PREPARATION / EARLY_STAGE)
- `capital_capacity_cop` (estimated capital in Colombian pesos)
- `compliance_gaps` (array of gaps)
- `gap_analysis` (narrative)

Results are stored in `ai_outputs`. On success, a WhatsApp message is automatically sent to the supplier's registered number via Twilio.

### 6.2 Document Generation
Admins can trigger a compliance document for any supplier via "Gen Doc". Claude generates a formatted document (stored as plain text in `ai_outputs.documentContent`). The admin can open it in the DocModal viewer (with Download-as-TXT), or re-open the last generated document via "View Last".

### 6.3 WhatsApp Notifications (Twilio)
- **Automatic**: fires immediately after successful AI scoring on onboarding
- **Manual**: "Send WA" button in the admin supplier table — sends a Spanish-language summary with score and pathway
- Phone normalisation: E.164 format, strips spaces, adds `+57` Colombia prefix if missing
- The Twilio message SID is stored in `ai_outputs.whatsappMessageSent`; the admin table reflects sent/unsent state via button styling

### 6.4 Admin Console
Full CRUD for users and suppliers:
- **Users**: create (with company), edit (upserts company row), delete, role management
- **Suppliers**: status controls (PENDING / ACTIVE / INACTIVE), pathway badge, AI score display, document viewer, WhatsApp trigger
- Filtering by product type, status, search (name/location)
- Pagination

### 6.5 Embedded Trade Finance
Buyers can apply for trade finance loans linked to specific orders. The finance dashboard tracks loan status, APR, outstanding balance, and repayment schedule.

### 6.6 Multilingual Support
All frontend UI strings are served from a `lang` context (English / Spanish toggle). Labels, buttons, and status values switch at runtime.

---

## 7. Key Integrations

| Service | Purpose | Config |
|---|---|---|
| Anthropic Claude | AI scoring + document generation | `ANTHROPIC_API_KEY` |
| Twilio WhatsApp | Supplier notifications | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |
| PostgreSQL | Primary datastore | `DATABASE_URL` (Replit-managed) |

---

## 8. Auth & Security

- Passwords hashed with **bcrypt** (10 rounds)
- Sessions managed via **JWT** — signed with `JWT_SECRET`, 7-day expiry
- All admin and supplier-mutating routes are behind `requireAuth` + `requireAdmin` middleware
- Request bodies validated with Zod schemas before reaching business logic

---

## 9. Deployment

The app is published via **Replit's native deployment system** (not GitHub Actions). Replit handles:
- Build (`pnpm run build` per artifact)
- Hosting and TLS
- Health checks
- Port routing (path-based, proxied iframe)

GitHub is used as a source-control mirror. The Replit project is the source of truth.

---

## 10. Local Development Workflows

| Workflow | Command |
|---|---|
| API Server | `pnpm --filter @workspace/api-server run dev` |
| Frontend | `pnpm --filter @workspace/fincava run dev` |
| DB schema push | `pnpm --filter @workspace/db run db:push` |

---

*Document generated April 2026 — reflects codebase at commit `faeb902`*
