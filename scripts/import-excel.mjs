#!/usr/bin/env node
/**
 * استيراد بيانات المخزون الأولي من ملف Excel
 * يقرأ ملف عهدة المستودع ويُنشئ سجلات "رصيد افتتاحي" في جدول transactions
 *
 * الاستخدام:
 *   node scripts/import-excel.mjs [مسار الملف]
 *   node scripts/import-excel.mjs attached_assets/عهدة_مستودع_منظومة_الإسعاف_والطوارئ_بدمشق_1785745853642.xlsx
 */

import { readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { read, utils } from "xlsx";
import postgres from "postgres";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── DB Connection ────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

// ─── Config ───────────────────────────────────────────────────────────────────

const EXCEL_PATH =
  process.argv[2] ??
  join(ROOT, "attached_assets", "عهدة_مستودع_منظومة_الإسعاف_والطوارئ_بدمشق_1785745853642.xlsx");

// Column name mappings — Arabic names as they appear in the Excel sheet
// We try multiple common variants in order
const NAME_COLS = ["الاسم", "اسم المادة", "الصنف", "اسم الصنف", "المادة", "البيان", "اسم المستهلك", "الجهاز"];
const QTY_COLS = ["الكمية", "عدد", "العدد", "الرصيد", "الرصيد الحالي", "الكمية الحالية"];
const UNIT_COLS = ["الوحدة", "وحدة القياس", "الوحدة القياسية"];
const CATEGORY_COLS = ["التصنيف", "الفئة", "القسم"]; // exclude "النوع" — ambiguous with item type

// Map sheet name → item type stored in items.item_type
// Must be a valid non-null string per schema
const SHEET_ITEM_TYPE = {
  "المستهلكات الطبية": "consumable",
  "مستهلكات منوعة": "consumable",
  "الثوابت": "fixed",
  "التجهيزات": "equipment",
};
const DEFAULT_ITEM_TYPE = "consumable";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickCol(headers, candidates) {
  const normalized = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
  for (const c of candidates) {
    const found = headers.find(
      (h) => normalized(h).toLowerCase() === normalized(c).toLowerCase()
    );
    if (found !== undefined) return found;
  }
  return null;
}

function toNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[,،]/g, "").trim());
  return isNaN(n) ? null : Math.round(n);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂 قراءة الملف: ${EXCEL_PATH}\n`);

  let fileBuffer;
  try {
    fileBuffer = readFileSync(EXCEL_PATH);
  } catch {
    console.error(`❌ الملف غير موجود: ${EXCEL_PATH}`);
    process.exit(1);
  }

  const workbook = read(fileBuffer, { type: "buffer", cellDates: true });
  const sheetNames = workbook.SheetNames;
  console.log(`📊 الأوراق المتاحة: ${sheetNames.join(", ")}\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Get or create admin user id for the import
  const adminRows = await sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1`;
  const adminId = adminRows[0]?.id ?? null;

  for (const sheetName of sheetNames) {
    const sheetItemType = SHEET_ITEM_TYPE[sheetName] ?? DEFAULT_ITEM_TYPE;
    const sheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      console.log(`⚠️  الورقة "${sheetName}" فارغة — تخطي`);
      continue;
    }

    // The sheet layout: row 0 = sheet title (merged), row 1 = actual headers
    // Use header:1 mode and offset by 2 rows
    const rawRows = utils.sheet_to_json(sheet, { header: 1, defval: null });
    // Find the real header row — first row that has > 1 non-null cell
    const headerRowIdx = rawRows.findIndex(
      (r) => Array.isArray(r) && r.filter((c) => c != null && String(c).trim()).length > 1
    );
    if (headerRowIdx < 0) {
      console.log(`   ⚠️  لم يُعثر على صف رؤوس — تخطي الورقة\n`);
      totalSkipped += rows.length;
      continue;
    }
    const headers = (rawRows[headerRowIdx]).map((c) => (c != null ? String(c).trim() : ""));
    // Re-parse rows using the real header row
    const dataRows = rawRows.slice(headerRowIdx + 1).map((row) => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? null; });
      return obj;
    });

    console.log(`📋 الورقة: "${sheetName}" (${dataRows.length} صف بيانات)`);
    console.log(`   الأعمدة: ${headers.filter(Boolean).join(" | ")}\n`);

    const nameCol = pickCol(headers, NAME_COLS);
    const qtyCol = pickCol(headers, QTY_COLS);
    const unitCol = pickCol(headers, UNIT_COLS);
    const categoryCol = pickCol(headers, CATEGORY_COLS);

    if (!nameCol) {
      console.log(`   ⚠️  لم يُعثر على عمود الاسم — تخطي الورقة\n`);
      totalSkipped += rows.length;
      continue;
    }

    let sheetImported = 0;
    let sheetSkipped = 0;

    for (const row of dataRows) {
      const name = String(row[nameCol] ?? "").trim();
      if (!name || name === "—" || name === "-") {
        sheetSkipped++;
        continue;
      }

      const qty = qtyCol ? toNumber(row[qtyCol]) : null;
      const unit = unitCol ? String(row[unitCol] ?? "").trim() || null : null;
      const categoryName = categoryCol ? String(row[categoryCol] ?? "").trim() || null : null;

      try {
        // Determine category type — equipment sheets get "equipment", others "consumable"
        const categoryType = sheetItemType === "equipment" ? "equipment" : "consumable";

        // Upsert category if present — must supply non-null `type`
        let categoryId = null;
        if (categoryName) {
          const existing = await sql`
            SELECT id FROM categories WHERE name = ${categoryName} LIMIT 1
          `;
          if (existing.length > 0) {
            categoryId = existing[0].id;
          } else {
            const inserted = await sql`
              INSERT INTO categories (name, type)
              VALUES (${categoryName}, ${categoryType})
              ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type
              RETURNING id
            `;
            categoryId = inserted[0]?.id ?? null;
          }
        }

        // Check if this item already has an init transaction — if so, skip entirely (idempotent)
        const existingItem = await sql`
          SELECT id FROM items WHERE name = ${name} AND is_active = true LIMIT 1
        `;

        let itemId;
        if (existingItem.length > 0) {
          itemId = existingItem[0].id;
          // Check if an init transaction already exists for this item
          const existingTx = await sql`
            SELECT id FROM transactions WHERE item_id = ${itemId} AND type = 'init' LIMIT 1
          `;
          if (existingTx.length > 0) {
            console.log(`   ⏭️  ${name} — رصيد افتتاحي موجود مسبقاً، تخطي`);
            sheetSkipped++;
            continue;
          }
          // Item exists but no init tx — only set stock if not already non-zero from other transactions
          const [stockRow] = await sql`SELECT current_stock FROM items WHERE id = ${itemId}`;
          if ((stockRow?.current_stock ?? 0) === 0 && qty !== null && qty > 0) {
            await sql`
              UPDATE items SET
                current_stock = ${qty},
                unit = COALESCE(NULLIF(${unit ?? ""}, ''), unit),
                category_id = COALESCE(${categoryId}, category_id),
                updated_at = NOW()
              WHERE id = ${itemId}
            `;
          }
        } else {
          // Insert new item — must supply non-null item_type and unit
          const inserted = await sql`
            INSERT INTO items (name, unit, item_type, category_id, current_stock, min_stock)
            VALUES (
              ${name},
              ${unit ?? "وحدة"},
              ${sheetItemType},
              ${categoryId},
              ${qty ?? 0},
              0
            )
            RETURNING id
          `;
          itemId = inserted[0]?.id;
        }

        // Insert init transaction only if qty > 0 and no duplicate
        if (qty !== null && qty > 0 && itemId) {
          const year = new Date().getFullYear();
          const countResult = await sql`
            SELECT count(*) FROM transactions WHERE type = 'init'
          `;
          const seq = Number(countResult[0].count) + 1;
          const docNum = `INIT-${year}-${String(seq).padStart(4, "0")}`;

          await sql`
            INSERT INTO transactions
              (type, item_type, item_id, quantity, document_number, notes, created_by)
            VALUES
              ('init', 'item', ${itemId}, ${qty}, ${docNum},
               ${"رصيد افتتاحي — استيراد من ملف Excel"},
               ${adminId})
          `;
        }

        sheetImported++;
        console.log(`   ✅ ${name}${qty !== null ? ` (${qty}${unit ? " " + unit : ""})` : ""}`);
      } catch (err) {
        console.error(`   ❌ خطأ عند معالجة "${name}": ${err.message}`);
        totalErrors++;
      }
    }

    console.log(`\n   📦 الورقة "${sheetName}": ${sheetImported} مستورد، ${sheetSkipped} متخطى\n`);
    totalImported += sheetImported;
    totalSkipped += sheetSkipped;
  }

  await sql.end();

  console.log("─".repeat(50));
  console.log(`\n🎉 اكتمل الاستيراد:`);
  console.log(`   ✅ مستورد بنجاح : ${totalImported}`);
  console.log(`   ⏭️  متخطى        : ${totalSkipped}`);
  console.log(`   ❌ أخطاء        : ${totalErrors}`);
  console.log();
}

main().catch((err) => {
  console.error("خطأ فادح:", err);
  process.exit(1);
});
