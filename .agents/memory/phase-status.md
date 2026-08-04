---
name: Phase completion status
description: Tracks which implementation phases are done and which remain
---

## Phases 1–6 — Complete ✅
## August 2026 Review — 10-gap remediation ✅ Complete

## Second Code Audit — 7 additional bugs fixed ✅ (August 2026)

1. **Negative stock allowed in POST /api/items** — added `currentStock >= 0` and `minStock >= 0` validation
2. **Duplicate username returns 500** — Drizzle wraps pg errors under `err.cause.code`; fixed to check `err?.cause?.code === '23505'`
3. **OUT transaction allowed without recipient/exitReason** — backend now requires both for all OUT transactions
4. **item-form.tsx missing onError toast** — createMutation and updateMutation now show error toast on failure
5. **equipment-form.tsx missing onError toast** — both mutations now show Arabic error toast on failure
6. **audit.tsx CSV export breaks on commas** — fields now wrapped in quotes with double-quote escaping
7. **users.tsx admin can demote own role** — role selector disabled when editing own account; explanatory note shown

## First Code Audit — 7 bugs fixed (August 2026, same session)

1. backup.ts 500 error — usersTable.active → usersTable.isActive
2. XLSX exports named .csv — all 5 filenames changed to .xlsx
3. Missing await on exportXlsx — added await to all 5 calls
4. Duplicate ملاحظات column header in EquipmentTab
5. Hardcoded expiry days in reports.ts — reads expiryAlertDays from settings
6. Hardcoded expiry days in items.ts — reads expiryAlertDays from settings
7. setupCompleted not set after admin creation — auth.ts now sets it

## Seed data
`artifacts/api-server/seed.mjs` seeds: 4 categories, admin user, 8 recipients, 8 exit reasons.
Run with: `cd artifacts/api-server && node seed.mjs`

## Known remaining items (proposed as follow-up tasks)
- Print voucher hardcodes org name (should read from settings)
- No text search in transactions list (only date/type filters)

## Phase 7 (Deploy) — Pending

## Key architectural notes
- ProtectedRoute: useEffect BEFORE early returns (Rules of Hooks)
- equipment-form.tsx uses useToast (shadcn) — rest of app uses sonner toast
- transaction-out-form.tsx also uses useToast — inconsistency but both work
- Drizzle wraps pg unique-constraint errors under err.cause.code (not err.code)
