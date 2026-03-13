# NexaRats Pro — Architecture & Backend Design

## 1. Frontend Architecture (Current)

```mermaid
graph TD
    A["index.html"] --> B["src/index.tsx"]
    B --> C["src/App.tsx"]
    C --> D["Layouts"]
    C --> E["Pages"]
    D --> D1["Sidebar.tsx"]
    D --> D2["Header.tsx"]
    E --> E1["Dashboard"]
    E --> E2["Billing / POS"]
    E --> E3["Inventory"]
    E --> E4["Customers"]
    E --> E5["Vendors"]
    E --> E6["Analytics"]
    E --> E7["Reports"]
    E --> E8["Settings (9 sub-pages)"]
    C --> F["Hooks"]
    F --> F1["useLocalStorage"]
    C --> G["Data Layer"]
    G --> G1["localStorage"]
```

**Tech Stack:** React 19 · TypeScript · Vite 6 · Tailwind CSS 3 · Recharts · Framer Motion · Lucide Icons

**State Management:** React `useState` + custom `useLocalStorage` hook. No external state library needed at current scale.

**Data Persistence:** `localStorage` with JSON serialization. Keys prefixed with `nx_` to avoid collisions.

---

## 2. Proposed Backend Architecture

```mermaid
graph LR
    subgraph Client
        FE["React SPA"]
    end
    subgraph API_Gateway["API Gateway"]
        AG["Nginx / AWS ALB"]
    end
    subgraph Backend["Node.js Backend"]
        API["Express.js API"]
        AUTH["Auth Middleware (JWT)"]
        VAL["Validation (Zod)"]
    end
    subgraph Database["Database Layer"]
        PG["PostgreSQL"]
        REDIS["Redis Cache"]
    end
    subgraph External["External Services"]
        WA["WhatsApp Business API"]
        SMTP["Email (SendGrid)"]
        S3["File Storage (S3)"]
    end

    FE -->|HTTPS| AG
    AG --> API
    API --> AUTH
    AUTH --> VAL
    VAL --> PG
    API --> REDIS
    API --> WA
    API --> SMTP
    API --> S3
```

### Tech Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 20 LTS | Same language as frontend |
| Framework | Express.js | Lightweight, mature |
| Database | PostgreSQL 16 | Relational data, ACID, JSON support |
| ORM | Prisma | Type-safe, auto migrations |
| Auth | JWT + bcrypt | Stateless, scalable |
| Validation | Zod | TypeScript-first schemas |
| Cache | Redis | Session, rate limiting |
| Queue | BullMQ | Background jobs (reports, reminders) |

---

## 3. REST API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Invalidate session |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List (paginated, filterable) |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Billing / Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invoices` | Create invoice + process sale |
| GET | `/api/invoices` | List invoices |
| GET | `/api/invoices/:id` | Get invoice detail |
| GET | `/api/invoices/:id/pdf` | Download PDF |

### Customers & Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/customers[/:id]` | CRUD operations |
| GET/POST/PUT/DELETE | `/api/vendors[/:id]` | CRUD operations |

### Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard stats |
| GET | `/api/reports/:type` | Generate report (sales, inventory, P&L, GST) |
| GET | `/api/reports/:type/export` | Export PDF/Excel |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/settings/profile` | Admin profile |
| GET/PUT | `/api/settings/gst` | GST config |
| GET/PUT | `/api/settings/notifications` | Notification prefs |
| GET/PUT | `/api/settings/whatsapp` | WhatsApp config |
| POST | `/api/settings/whatsapp/test` | Send test message |

---

## 4. Database Schema (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  password     String
  name         String
  phone        String?
  businessName String?
  role         Role     @default(ADMIN)
  createdAt    DateTime @default(now())
  invoices     Invoice[]
}

model Product {
  id            String   @id @default(cuid())
  name          String
  sku           String   @unique
  category      String
  price         Decimal
  purchasePrice Decimal
  stock         Int
  gstRate       Decimal  @default(18)
  unit          String   @default("Pieces")
  status        Status   @default(IN_STOCK)
  image         String?
  expiryDate    DateTime?
  returns       Returns  @default(RETURNABLE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  invoiceItems  InvoiceItem[]
}

model Customer {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String
  totalPaid Decimal  @default(0)
  pending   Decimal  @default(0)
  invoices  Invoice[]
}

model Invoice {
  id         String        @id @default(cuid())
  number     String        @unique
  customer   Customer?     @relation(fields: [customerId], references: [id])
  customerId String?
  user       User          @relation(fields: [userId], references: [id])
  userId     String
  items      InvoiceItem[]
  subtotal   Decimal
  gstAmount  Decimal
  total      Decimal
  method     PaymentMethod
  status     PaymentStatus @default(COMPLETED)
  createdAt  DateTime      @default(now())
}

model InvoiceItem {
  id        String  @id @default(cuid())
  invoice   Invoice @relation(fields: [invoiceId], references: [id])
  invoiceId String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  price     Decimal
  gst       Decimal
}
```

---

## 5. API Security & Keys

```mermaid
graph TD
    REQ["Client Request"] --> RATE["Rate Limiter (Redis)"]
    RATE --> CORS["CORS Middleware"]
    CORS --> JWT["JWT Verification"]
    JWT --> RBAC["Role-Based Access"]
    RBAC --> HANDLER["Route Handler"]
    HANDLER --> AUDIT["Audit Log"]
```

| Security Layer | Implementation |
|---------------|---------------|
| CORS | Whitelist frontend origin only |
| Rate Limiting | 100 req/min per IP (Redis) |
| Authentication | JWT (access: 15min, refresh: 7d) |
| API Keys | For external integrations (WhatsApp) — stored in env vars |
| Input Validation | Zod schemas on every endpoint |
| HTTPS | TLS termination at load balancer |
| Secrets | `.env` + cloud secrets manager (never in code) |

---

## 6. Cloud Deployment Architecture

```mermaid
graph TD
    subgraph CDN["CDN (CloudFront)"]
        STATIC["React SPA (S3)"]
    end
    subgraph LB["Load Balancer"]
        ALB["AWS ALB / Nginx"]
    end
    subgraph Compute["Compute"]
        ECS1["API Container 1"]
        ECS2["API Container 2"]
        WORKER["Background Worker"]
    end
    subgraph Data["Managed Services"]
        RDS["PostgreSQL (RDS)"]
        EC["Redis (ElastiCache)"]
        SES["Email (SES)"]
        S3B["Files (S3)"]
    end

    CDN --> ALB
    ALB --> ECS1
    ALB --> ECS2
    ECS1 --> RDS
    ECS2 --> RDS
    ECS1 --> EC
    WORKER --> RDS
    WORKER --> SES
    ECS1 --> S3B
```

### Deployment Options

| Platform | Best For | Cost |
|----------|---------|------|
| **Render** | Quick MVP deploy | Free tier available |
| **Railway** | Full-stack with DB | ~$5/mo |
| **AWS (ECS + RDS)** | Production scale | ~$50/mo+ |
| **Vercel + PlanetScale** | Serverless | Free-$20/mo |

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/nexarats
REDIS_URL=redis://host:6379
JWT_SECRET=<random-256-bit>
JWT_REFRESH_SECRET=<random-256-bit>
WHATSAPP_API_KEY=<from-meta-business>
SENDGRID_API_KEY=<from-sendgrid>
AWS_S3_BUCKET=nexarats-files
```

---

## 7. Migration Path (Frontend → Full Stack)

1. **Phase 1**: Add Express backend with JWT auth + PostgreSQL
2. **Phase 2**: Migrate `localStorage` data to API calls
3. **Phase 3**: Add real-time features (WebSocket for stock alerts)
4. **Phase 4**: WhatsApp/Email integrations
5. **Phase 5**: Multi-tenant support + team roles
