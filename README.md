# نظام مستودع الإسعاف والطوارئ — دمشق
### Damascus EMS Warehouse Management System

<div dir="rtl">

نظام إدارة مستودع داخلي لمديرية الإحالة والإسعاف والطوارئ بدمشق، يُتيح تتبع المواد الطبية والتجهيزات، وإصدار سندات الإدخال والإخراج، ولوحة تحكم مع مؤشرات أداء حقيقية، وتقارير متقدمة — بواجهة عربية RTL كاملة.

</div>

---

## ✨ Features

| الميزة | الوصف |
|---|---|
| 📦 **إدارة المواد** | CRUD كامل للمواد الطبية والمستهلكات مع بحث وفلترة |
| 🔧 **إدارة التجهيزات** | تتبع الأجهزة والمعدات مع سجل كامل |
| 📋 **العمليات (الحركات)** | تسجيل إدخال/إخراج + سند A4 قابل للطباعة بالعربية |
| 📊 **لوحة التحكم** | إحصائيات فورية ومخططات حركة المواد |
| 📈 **التقارير** | 7 تبويبات: جرد، حركة، انتهاء صلاحية، أقل من الحد، تجهيزات، الوضع التفصيلي، والعهد المفتوحة |
| 👥 **إدارة المستخدمين** | أدوار ثلاثة (مدير / محاسب / مشاهد) |
| 🔔 **التنبيهات** | جرس تنبيه في الـ Header يتجدد تلقائياً |
| ⚙️ **الإعدادات** | ملف شخصي، تغيير كلمة المرور، إعدادات المنظومة |
| 🖨️ **الطباعة** | سندات إدخال/إخراج بتنسيق A4 RTL جاهزة للطباعة |
| 📤 **التصدير** | تصدير التقارير بصيغة Excel (.xlsx) |

---

## 🏗️ Tech Stack

```
Frontend          Backend           Database          Shared
─────────         ─────────         ─────────         ──────
React 19          Express 5         PostgreSQL        Zod v4
Vite 7            Node.js 20+       Drizzle ORM       TypeScript 5.9
TailwindCSS       Pino (logging)    Drizzle Kit       OpenAPI 3.0
Radix UI          Session auth                        Orval (codegen)
TanStack Query    Zod validation
Recharts
```

**Architecture:** pnpm monorepo · OpenAPI-first · RTL-first

---

## 📁 Project Structure

```
├── artifacts/
│   ├── api-server/          # Express API server (port 8080)
│   │   └── src/
│   │       ├── routes/      # Route handlers (one file per domain)
│   │       └── middlewares/ # Auth, audit logging
│   └── web/                 # React + Vite frontend (port 22333)
│       └── src/
│           ├── pages/       # All application pages
│           └── components/  # UI components & layout
├── lib/
│   ├── db/                  # Drizzle schema (source of truth for DB)
│   ├── api-spec/            # OpenAPI spec (source of truth for API)
│   ├── api-client-react/    # Generated React Query hooks (do not edit)
│   └── api-zod/             # Generated Zod schemas (do not edit)
└── scripts/
    └── import-excel.mjs     # Excel seed import utility
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
#    DATABASE_URL=postgresql://...
#    SESSION_SECRET=<random-secret>

# 3. Push database schema
pnpm --filter @workspace/db run push

# 4. Start services manually
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev
```

### Default Credentials

```
Username: admin
Password: Admin@1234
```

> ⚠️ Change the password immediately after first login.

---

## 🔄 Development Workflow

```bash
# Full typecheck
pnpm run typecheck

# Build all packages
pnpm run build

# After editing lib/api-spec/openapi.yaml — regenerate hooks
pnpm --filter @workspace/api-spec run codegen
tsc --build

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push
```

> **Important:** Always run `tsc --build` before `pnpm run typecheck` — the web package depends on compiled TypeScript libraries.

---

## 🌐 API

The API follows an OpenAPI 3.0 spec located at `lib/api-spec/openapi.yaml`. All client hooks and Zod schemas are auto-generated from this spec via Orval — never edit the generated files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` directly.

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/items` | List items |
| `GET` | `/api/transactions` | List transactions |
| `POST` | `/api/transactions` | Record IN/OUT transaction |
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/reports/stock` | Stock report |
| `GET` | `/api/reports/stock-position` | Reconciled stock position |
| `GET` | `/api/reports/custodies` | Open and overdue custody report |
| `GET` | `/api/alerts` | Active alerts |
| `GET` | `/api/settings` | System settings |

---

## 🔒 Roles & Permissions

| Role | Arabic | Permissions |
|---|---|---|
| `admin` | مدير | Full access including user management |
| `warehouse_manager` | مسؤول مستودع | Items, equipment, transactions, reports |
| `viewer` | مشاهد | Read-only access |

---

## 📦 Seeding Data

To seed initial categories, recipients, exit reasons, and an admin user:

```bash
cd artifacts/api-server
node seed.mjs
```

To import items from an Excel file (عهدة المستودع format):

```bash
node scripts/import-excel.mjs <path-to-file.xlsx>
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Update `lib/api-spec/openapi.yaml` first for any API changes, then run codegen
4. Commit with a descriptive message
5. Open a pull request

---

## 📄 License

Internal use — مديرية الإحالة والإسعاف والطوارئ، دمشق.
