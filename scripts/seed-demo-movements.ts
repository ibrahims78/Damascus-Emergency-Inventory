import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { read, utils } from "xlsx";
import type {
  MovementContext,
  MovementInput,
} from "../artifacts/api-server/src/lib/inventory-movement-service";

const DRY_RUN = process.argv.includes("--dry-run");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && !DRY_RUN) {
  throw new Error("DATABASE_URL is required to seed demo movements");
}

const sql = postgres(DATABASE_URL ?? "postgres://localhost/unused", { max: 4 });

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const ITEMS_WORKBOOK = "بيانات_اختبار_100_مادة.xlsx";
const EQUIPMENT_WORKBOOK = "بيانات_اختبار_60_تجهيزة.xlsx";
const EXCEL_ITEM_MARKER = "بيانات Excel تجريبية — مواد الاختبار الشامل";
const EXCEL_EQUIPMENT_MARKER = "بيانات Excel تجريبية — تجهيزات الاختبار الشامل";
type CreateInventoryMovement = typeof import("../artifacts/api-server/src/lib/inventory-movement-service").createInventoryMovement;
let createInventoryMovement: CreateInventoryMovement | undefined;

/**
 * This seed is intentionally persistent and deterministic. It creates a
 * small, linked fixture that can be inspected from the UI after every run.
 * Each scenario is identified by its marker in transaction notes, so a
 * partially completed run is resumed instead of duplicated.
 */
const DEMO_MARKER = "بيانات اختبار شامل للحركات — الاختبار النهائي";
const DEMO_ITEM_CODE = "DEMO-FINAL-ITEM-001";
const DEMO_ITEM_NAME = "مادة تجريبية شاملة — شاش إسعافي";
const DEMO_EQUIPMENT_KEY = `${DEMO_MARKER} — تجهيز تجريبي متعدد الوحدات`;
const DEMO_EQUIPMENT_NAME = "تجهيز تجريبي شامل — حقيبة إسعاف";
const DEMO_EQUIPMENT_SERIAL = "DEMO-FINAL-SERIAL-001";
const DEMO_SERIAL_EQUIPMENT_NAME = "تجهيز تجريبي شامل — جهاز مرقم";
const DEMO_RECIPIENT = "جهة تجريبية شاملة — نقطة إسعاف";
const DEMO_REASON = "اختبار شامل لحركات المستودع";

type MovementRow = {
  id: number;
  documentNumber: string;
  type: string;
  itemId: number | null;
  equipmentId: number | null;
  quantity: number | null;
};

type Fixture = {
  itemId: number;
  equipmentId: number;
  serialEquipmentId: number;
  recipientId: number;
  exitReasonId: number;
  context: MovementContext;
};

type ExcelRow = Record<string, unknown>;

type ExcelItemSeed = {
  rowNumber: number;
  code: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
  category: string | null;
  expiryDate: string | null;
  batchNumber: string;
  location: string | null;
  supplier: string | null;
  notes: string | null;
};

type ExcelEquipmentSeed = {
  rowNumber: number;
  name: string;
  equipmentType: string | null;
  model: string | null;
  serialNumber: string | null;
  condition: "good" | "maintenance" | "broken" | "consumed" | "needs_inspection";
  quantity: number;
  minQuantity: number;
  manufactureYear: number | null;
  originCountry: string | null;
  currentHolder: string | null;
  notes: string | null;
};

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function resolveWorkbook(fileName: string) {
  const candidates = [
    resolve(PROJECT_ROOT, fileName),
    resolve(PROJECT_ROOT, "attached_assets", fileName),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error(
      `لم يتم العثور على ملف البيانات الوهمية "${fileName}". ` +
        `المسارات المفحوصة: ${candidates.join(" | ")}`,
    );
  }
  return path;
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s*\*+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pickColumn(headers: string[], candidates: string[]) {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  for (const candidate of candidates) {
    const match = normalized.get(normalizeHeader(candidate));
    if (match) return match;
  }
  return null;
}

function textValue(row: ExcelRow, column: string | null) {
  if (!column) return null;
  const value = String(row[column] ?? "").trim();
  return value && value !== "-" && value !== "—" ? value : null;
}

function numberValue(row: ExcelRow, column: string | null, fallback = 0) {
  if (!column) return fallback;
  const raw = String(row[column] ?? "").replace(/[,،]/g, "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function dateValue(row: ExcelRow, column: string | null) {
  if (!column || row[column] == null || row[column] === "") return null;
  const raw = row[column];
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const excelDate = new Date(excelEpoch.getTime() + raw * 86400000);
    return Number.isNaN(excelDate.getTime()) ? null : excelDate.toISOString().slice(0, 10);
  }
  const parsed = new Date(String(raw).trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function readWorkbookRows(fileName: string, sheetName: string) {
  const path = resolveWorkbook(fileName);
  const workbook = read(readFileSync(path), { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`الملف "${fileName}" لا يحتوي على الورقة المطلوبة "${sheetName}"`);
  }

  const rawRows = utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const headerRowIndex = rawRows.findIndex(
    (row) =>
      Array.isArray(row) &&
      row.filter((value) => value != null && String(value).trim()).length > 1,
  );
  if (headerRowIndex < 0) {
    throw new Error(`لم يتم العثور على صف عناوين في "${fileName}" / "${sheetName}"`);
  }

  const headers = rawRows[headerRowIndex].map((value) => String(value ?? "").trim());
  const rows = rawRows
    .slice(headerRowIndex + 1)
    .filter(
      (row) =>
        Array.isArray(row) &&
        row.some((value) => value != null && String(value).trim()),
    )
    .map((row) => {
      const result: ExcelRow = {};
      headers.forEach((header, index) => {
        if (header) result[header] = row[index] ?? null;
      });
      return result;
    });

  return { path, headers, rows };
}

function parseExcelItems(): ExcelItemSeed[] {
  const { headers, rows } = readWorkbookRows(ITEMS_WORKBOOK, "البيانات");
  const nameColumn = pickColumn(headers, ["الاسم", "اسم المادة", "الصنف", "البيان"]);
  const codeColumn = pickColumn(headers, ["الرمز", "الكود", "الرقم", "رقم المادة"]);
  const quantityColumn = pickColumn(headers, ["الكمية الحالية", "الكمية", "الرصيد"]);
  const minStockColumn = pickColumn(headers, ["الحد الأدنى", "الحد الادنى"]);
  const unitColumn = pickColumn(headers, ["الوحدة", "وحدة القياس"]);
  const categoryColumn = pickColumn(headers, ["التصنيف", "الفئة", "القسم"]);
  const expiryColumn = pickColumn(headers, ["تاريخ الانتهاء", "تاريخ انتهاء الصلاحية"]);
  const batchColumn = pickColumn(headers, ["رقم الدفعة", "الدفعة"]);
  const locationColumn = pickColumn(headers, ["الموقع", "مكان التخزين"]);
  const supplierColumn = pickColumn(headers, ["المورد", "اسم المورد"]);
  const notesColumn = pickColumn(headers, ["ملاحظات", "ملاحظة", "تفاصيل"]);

  if (!nameColumn) throw new Error(`ملف ${ITEMS_WORKBOOK} لا يحتوي على عمود اسم المادة`);

  const items = rows.flatMap((row, index) => {
    const name = textValue(row, nameColumn);
    if (!name) return [];
    const code = textValue(row, codeColumn) ?? `EXCEL-ITEM-${String(index + 1).padStart(3, "0")}`;
    return [
      {
        rowNumber: index + 2,
        code,
        name,
        quantity: numberValue(row, quantityColumn),
        minStock: numberValue(row, minStockColumn),
        unit: textValue(row, unitColumn) ?? "وحدة",
        category: textValue(row, categoryColumn),
        expiryDate: dateValue(row, expiryColumn),
        batchNumber:
          textValue(row, batchColumn) ??
          `EXCEL-BATCH-${code.replace(/[^A-Za-z0-9_-]/g, "-")}`,
        location: textValue(row, locationColumn),
        supplier: textValue(row, supplierColumn),
        notes: textValue(row, notesColumn),
      },
    ];
  });

  const codes = new Set<string>();
  for (const item of items) {
    assert(!codes.has(item.code), `رمز مادة مكرر في ملف Excel: ${item.code}`);
    assert(item.quantity >= 0, `كمية مادة غير صالحة في الصف ${item.rowNumber}`);
    codes.add(item.code);
  }
  return items;
}

function mapEquipmentCondition(value: string | null): ExcelEquipmentSeed["condition"] {
  const normalized = value?.trim() ?? "";
  const map: Record<string, ExcelEquipmentSeed["condition"]> = {
    جيدة: "good",
    جيد: "good",
    "تحت الصيانة": "maintenance",
    صيانة: "maintenance",
    "في الصيانة": "maintenance",
    "بحاجة للصيانة": "maintenance",
    معطل: "broken",
    معطلة: "broken",
    مستهلك: "consumed",
    مستهلكة: "consumed",
    "يحتاج فحص": "needs_inspection",
    "تحتاج فحص": "needs_inspection",
  };
  return map[normalized] ?? "good";
}

function parseExcelEquipment(): ExcelEquipmentSeed[] {
  const { headers, rows } = readWorkbookRows(EQUIPMENT_WORKBOOK, "البيانات");
  const nameColumn = pickColumn(headers, ["الاسم", "اسم التجهيز", "التجهيز", "الجهاز"]);
  const typeColumn = pickColumn(headers, ["نوع التجهيز", "النوع", "الفئة", "التصنيف"]);
  const modelColumn = pickColumn(headers, ["الموديل", "الموديل / الطراز", "الطراز"]);
  const serialColumn = pickColumn(headers, ["الرقم التسلسلي", "الرقم التسلسلي (فريد)", "رقم السيريال", "Serial"]);
  const conditionColumn = pickColumn(headers, ["الحالة", "حالة التجهيز", "الوضع"]);
  const quantityColumn = pickColumn(headers, ["الكمية", "العدد"]);
  const minQuantityColumn = pickColumn(headers, ["الحد الأدنى للكمية", "الحد الأدنى", "الحد الادنى"]);
  const yearColumn = pickColumn(headers, ["سنة الصنع", "سنة التصنيع", "سنة الإنتاج"]);
  const countryColumn = pickColumn(headers, ["بلد المنشأ", "البلد", "المنشأ"]);
  const holderColumn = pickColumn(headers, ["الحائز الحالي", "الحائز", "المستخدم", "المسؤول"]);
  const notesColumn = pickColumn(headers, ["ملاحظات", "ملاحظة", "تفاصيل"]);

  if (!nameColumn) throw new Error(`ملف ${EQUIPMENT_WORKBOOK} لا يحتوي على عمود اسم التجهيز`);

  const equipment = rows.flatMap((row, index) => {
    const name = textValue(row, nameColumn);
    if (!name) return [];
    const quantity = numberValue(row, quantityColumn, 1);
    let serialNumber = textValue(row, serialColumn);
    if (serialNumber && quantity > 1) serialNumber = null;
    return [
      {
        rowNumber: index + 2,
        name,
        equipmentType: textValue(row, typeColumn),
        model: textValue(row, modelColumn),
        serialNumber,
        condition: mapEquipmentCondition(textValue(row, conditionColumn)),
        quantity,
        minQuantity: numberValue(row, minQuantityColumn),
        manufactureYear: numberValue(row, yearColumn, 0) || null,
        originCountry: textValue(row, countryColumn),
        currentHolder: textValue(row, holderColumn),
        notes: textValue(row, notesColumn),
      },
    ];
  });

  const serials = new Set<string>();
  for (const item of equipment) {
    if (!item.serialNumber) continue;
    assert(!serials.has(item.serialNumber), `رقم تسلسلي مكرر في ملف Excel: ${item.serialNumber}`);
    serials.add(item.serialNumber);
  }
  return equipment;
}

function scenarioNote(scenario: string, marker = DEMO_MARKER) {
  return `${marker} — ${scenario}`;
}

async function findScenario(
  scenario: string,
  scenarioMarker = DEMO_MARKER,
): Promise<MovementRow | null> {
  const marker = `%${scenarioMarker}%`;
  const scenarioPart = `%${scenario}%`;
  const [movement] = await sql<MovementRow[]>`
    SELECT id, document_number AS "documentNumber", type,
           item_id AS "itemId", equipment_id AS "equipmentId", quantity
    FROM transactions
    WHERE notes LIKE ${marker} AND notes LIKE ${scenarioPart}
    ORDER BY id
    LIMIT 1
  `;
  return movement ?? null;
}

async function createScenario(
  scenario: string,
  input: MovementInput,
  context: MovementContext,
  scenarioMarker = DEMO_MARKER,
): Promise<MovementRow> {
  const existing = await findScenario(scenario, scenarioMarker);
  if (existing) {
    console.log(`SKIP ${scenario}: ${existing.documentNumber}`);
    return existing;
  }

  createInventoryMovement ??= (
    await import("../artifacts/api-server/src/lib/inventory-movement-service")
  ).createInventoryMovement;
  const movement = await createInventoryMovement(
    { ...input, notes: scenarioNote(scenario, scenarioMarker) },
    context,
  );
  const created = movement as MovementRow;
  console.log(`CREATE ${scenario}: ${created.documentNumber}`);
  return created;
}

async function ensureExcelItem(item: ExcelItemSeed) {
  const itemMarker = `${EXCEL_ITEM_MARKER} — ${item.code}`;
  const itemNotes = `${itemMarker}${item.notes ? ` — ${item.notes}` : ""}`;
  const [existing] = await sql`
    SELECT id, notes
    FROM items
    WHERE code = ${item.code}
    LIMIT 1
  `;
  if (existing && !String(existing.notes ?? "").includes(EXCEL_ITEM_MARKER)) {
    throw new Error(
      `رمز المادة ${item.code} موجود مسبقاً خارج بيانات الاختبار. ` +
        "لن يتم تعديل سجل غير تجريبي تلقائياً.",
    );
  }

  let categoryId: number | null = null;
  if (item.category) {
    const [category] = await sql`
      INSERT INTO categories (name, type)
      VALUES (${item.category}, 'consumable')
      ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type
      RETURNING id
    `;
    categoryId = category ? Number(category.id) : null;
  }

  if (existing) {
    await sql`
      UPDATE items
      SET name = ${item.name},
          category_id = ${categoryId},
          item_type = 'consumable',
          unit = ${item.unit},
          min_stock = ${item.minStock},
          location = ${item.location},
          supplier = ${item.supplier},
           notes = ${itemNotes},
          is_active = true,
          updated_at = now()
      WHERE id = ${existing.id}
    `;
    return Number(existing.id);
  }

  const [created] = await sql`
    INSERT INTO items (
      code, name, category_id, item_type, unit, current_stock, min_stock,
      expiry_date, batch_number, location, supplier, notes, is_active
    )
    VALUES (
      ${item.code}, ${item.name}, ${categoryId}, 'consumable', ${item.unit}, 0,
      ${item.minStock}, ${item.expiryDate}, ${item.batchNumber}, ${item.location},
       ${item.supplier}, ${itemNotes}, true
    )
    RETURNING id
  `;
  return Number(created.id);
}

async function seedExcelItems(context: MovementContext) {
  const items = parseExcelItems();
  let initialMovements = 0;

  for (const item of items) {
    const itemId = await ensureExcelItem(item);
    if (item.quantity <= 0) continue;

    await createScenario(
      `excel item inbound — ${item.code}`,
      {
        kind: "in",
        itemType: "item",
        itemId,
        quantity: item.quantity,
        deliveryNoteNumber: `EXCEL-IN-${item.code}`,
        deliveryNoteDate: isoDate(),
        documentDate: isoDate(),
        supplySource: "central_warehouses",
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ?? undefined,
      },
      context,
      EXCEL_ITEM_MARKER,
    );
    initialMovements++;
  }

  console.log(
    `Excel items seeded: ${items.length} materials, ${initialMovements} opening movements`,
  );
  return items.length;
}

function excelEquipmentMarker(item: ExcelEquipmentSeed, index: number) {
  const identity =
    item.serialNumber ??
    `${String(index + 1).padStart(3, "0")}-${item.name}-${item.model ?? "no-model"}`;
  return `${EXCEL_EQUIPMENT_MARKER} — ${identity}`;
}

async function seedExcelEquipment() {
  const equipment = parseExcelEquipment();

  for (const [index, item] of equipment.entries()) {
    const marker = excelEquipmentMarker(item, index);
    const equipmentNotes = `${marker}${item.notes ? ` — ${item.notes}` : ""}`;
    const [existingByMarker] = await sql`
      SELECT id
      FROM equipment
      WHERE notes LIKE ${`${marker}%`}
      LIMIT 1
    `;
    const [existingBySerial] = item.serialNumber
      ? await sql`
          SELECT id, notes
          FROM equipment
          WHERE serial_number = ${item.serialNumber}
          LIMIT 1
        `
      : [];

    if (
      existingBySerial &&
      !String(existingBySerial.notes ?? "").includes(EXCEL_EQUIPMENT_MARKER)
    ) {
      throw new Error(
        `الرقم التسلسلي ${item.serialNumber} موجود خارج بيانات الاختبار. ` +
          "لن يتم تعديل سجل غير تجريبي تلقائياً.",
      );
    }
    if (existingByMarker || existingBySerial) continue;

    await sql`
      INSERT INTO equipment (
        name, equipment_type, model, serial_number, condition,
        manufacture_year, origin_country, current_holder, notes,
        quantity, min_quantity
      )
      VALUES (
        ${item.name}, ${item.equipmentType}, ${item.model}, ${item.serialNumber},
        ${item.condition}, ${item.manufactureYear}, ${item.originCountry},
        ${item.currentHolder}, ${equipmentNotes},
        ${item.quantity}, ${item.minQuantity}
      )
    `;
  }

  console.log(`Excel equipment seeded: ${equipment.length} equipment rows`);
  return equipment.length;
}

function dryRunExcelCatalog() {
  const items = parseExcelItems();
  const equipment = parseExcelEquipment();
  const serialEquipment = equipment.filter((item) => item.serialNumber).length;
  const itemBatches = items.filter((item) => item.batchNumber).length;
  console.log("Excel demo catalog dry run passed.");
  console.log(`Items: ${items.length} (with batches: ${itemBatches})`);
  console.log(
    `Equipment: ${equipment.length} (serial-numbered: ${serialEquipment})`,
  );
}

async function ensureItem() {
  const [existing] = await sql`
    SELECT id
    FROM items
    WHERE code = ${DEMO_ITEM_CODE}
    LIMIT 1
  `;
  if (existing) {
    await sql`
      UPDATE items
      SET is_active = true,
          notes = ${DEMO_MARKER},
          updated_at = now()
      WHERE id = ${existing.id}
    `;
    return Number(existing.id);
  }

  const [item] = await sql`
    INSERT INTO items (
      code, name, item_type, unit, current_stock, min_stock,
      location, supplier, notes, is_active
    )
    VALUES (
      ${DEMO_ITEM_CODE},
      ${DEMO_ITEM_NAME},
      'item',
      'علبة',
      0,
      5,
      'رف الاختبار النهائي',
      'مورد تجريبي',
      ${DEMO_MARKER},
      true
    )
    RETURNING id
  `;
  return Number(item.id);
}

async function ensureBulkEquipment() {
  const [existing] = await sql`
    SELECT id
    FROM equipment
    WHERE notes LIKE ${`%${DEMO_EQUIPMENT_KEY}%`}
    ORDER BY id
    LIMIT 1
  `;
  if (existing) return Number(existing.id);

  const [equipment] = await sql`
    INSERT INTO equipment (
      name, equipment_type, model, serial_number, condition,
      manufacture_year, origin_country, notes, quantity, min_quantity
    )
    VALUES (
      ${DEMO_EQUIPMENT_NAME},
      'معدات إسعافية',
      'DEMO-FINAL-BULK-01',
      NULL,
      'good',
      2026,
      'بيانات تجريبية',
      ${DEMO_EQUIPMENT_KEY},
      0,
      1
    )
    RETURNING id
  `;
  return Number(equipment.id);
}

async function ensureSerialEquipment() {
  const [existing] = await sql`
    SELECT id
    FROM equipment
    WHERE serial_number = ${DEMO_EQUIPMENT_SERIAL}
    LIMIT 1
  `;
  if (existing) return Number(existing.id);

  const [equipment] = await sql`
    INSERT INTO equipment (
      name, equipment_type, model, serial_number, condition,
      manufacture_year, origin_country, notes, quantity, min_quantity
    )
    VALUES (
      ${DEMO_SERIAL_EQUIPMENT_NAME},
      'أجهزة إسعافية',
      'DEMO-FINAL-SERIAL-01',
      ${DEMO_EQUIPMENT_SERIAL},
      'good',
      2026,
      'بيانات تجريبية',
      ${DEMO_MARKER},
      0,
      0
    )
    RETURNING id
  `;
  return Number(equipment.id);
}

async function ensureRecipient() {
  const [recipient] = await sql`
    INSERT INTO recipients (name, notes, is_active)
    VALUES (${DEMO_RECIPIENT}, ${DEMO_MARKER}, true)
    ON CONFLICT (name) DO UPDATE
      SET is_active = true
    RETURNING id
  `;
  return Number(recipient.id);
}

async function ensureExitReason() {
  const [reason] = await sql`
    INSERT INTO exit_reasons (name, is_system, is_active)
    VALUES (${DEMO_REASON}, false, true)
    ON CONFLICT (name) DO UPDATE
      SET is_active = true
    RETURNING id
  `;
  return Number(reason.id);
}

async function ensureLegacyInit(itemId: number, userId: number) {
  const documentNumber = "DEMO-FINAL-INIT-001";
  const [existing] = await sql`
    SELECT id
    FROM transactions
    WHERE document_number = ${documentNumber}
    LIMIT 1
  `;
  if (existing) {
    console.log(`SKIP legacy init: ${documentNumber}`);
    return;
  }

  const [legacyItem] = await sql`
    INSERT INTO items (
      code, name, item_type, unit, current_stock, min_stock,
      location, notes, is_active
    )
    VALUES (
      'DEMO-FINAL-LEGACY-001',
      'مادة تجريبية — رصيد افتتاحي مستورد',
      'item',
      'قطعة',
      12,
      2,
      'سجل تاريخي',
      ${scenarioNote("init — سجل تاريخي")},
      true
    )
    ON CONFLICT (code) DO UPDATE SET is_active = true
    RETURNING id
  `;
  const legacyItemId = Number(legacyItem.id);

  await sql`
    INSERT INTO transactions (
      type, item_type, item_id, quantity, document_number,
      document_date, is_historical_incomplete, notes, created_by
    )
    VALUES (
      'init',
      'item',
      ${legacyItemId},
      12,
      ${documentNumber},
      ${isoDate(-30)},
      true,
      ${scenarioNote("init — سجل تاريخي")},
      ${userId}
    )
  `;
  console.log(`CREATE legacy init: ${documentNumber}`);
}

async function findCustodyForMovement(movementId: number) {
  const [custody] = await sql`
    SELECT id, quantity, returned_quantity, status
    FROM personal_custodies
    WHERE source_transaction_id = ${movementId}
    LIMIT 1
  `;
  if (!custody) {
    throw new Error(`لم يتم العثور على سجل العهدة للحركة ${movementId}`);
  }
  return {
    id: Number(custody.id),
    quantity: Number(custody.quantity),
    returnedQuantity: Number(custody.returned_quantity),
    status: String(custody.status),
  };
}

async function main() {
  const today = isoDate();
  const contextUser = await sql`
    SELECT id, full_name AS "fullName"
    FROM users
    WHERE role = 'admin' AND is_active = true
    ORDER BY id
    LIMIT 1
  `;
  if (!contextUser[0]) {
    throw new Error("لا يوجد مستخدم admin نشط لتسجيل الحركات التجريبية");
  }

  const context: MovementContext = {
    userId: Number(contextUser[0].id),
    userName: String(contextUser[0].fullName),
    ipAddress: "127.0.0.1",
  };
  await seedExcelItems(context);
  await seedExcelEquipment();

  const fixture: Fixture = {
    itemId: await ensureItem(),
    equipmentId: await ensureBulkEquipment(),
    serialEquipmentId: await ensureSerialEquipment(),
    recipientId: await ensureRecipient(),
    exitReasonId: await ensureExitReason(),
    context,
  };

  await ensureLegacyInit(fixture.itemId, fixture.context.userId);

  // Consumable lifecycle: multiple batches, FEFO output, damage, central
  // return, and both positive and negative inventory adjustments.
  await createScenario(
    "item inbound — near expiry batch",
    {
      kind: "in",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 20,
      deliveryNoteNumber: "DEMO-FINAL-IN-NEAR-001",
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
      batchNumber: "DEMO-FINAL-BATCH-NEAR",
      expiryDate: isoDate(30),
    },
    context,
  );
  await createScenario(
    "item inbound — far expiry batch",
    {
      kind: "in",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 15,
      deliveryNoteNumber: "DEMO-FINAL-IN-FAR-001",
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
      batchNumber: "DEMO-FINAL-BATCH-FAR",
      expiryDate: isoDate(180),
    },
    context,
  );
  await createScenario(
    "item inbound — expired batch excluded by FEFO",
    {
      kind: "in",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 4,
      deliveryNoteNumber: "DEMO-FINAL-IN-EXPIRED-001",
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
      batchNumber: "DEMO-FINAL-BATCH-EXPIRED",
      expiryDate: isoDate(-30),
    },
    context,
  );
  await createScenario(
    "item inbound — no expiry batch",
    {
      kind: "in",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 6,
      deliveryNoteNumber: "DEMO-FINAL-IN-NOEXP-001",
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
      batchNumber: "DEMO-FINAL-BATCH-NOEXP",
    },
    context,
  );

  const itemOut = await createScenario(
    "item outbound — FEFO across batches",
    {
      kind: "out",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 12,
      recipientId: fixture.recipientId,
      recipientPerson: "مسعف تجريبي — تسليم مواد",
      exitReasonId: fixture.exitReasonId,
      internalDeliveryNoteNumber: "DEMO-FINAL-OUT-001",
      internalDeliveryNoteDate: today,
      documentDate: today,
      deliveryDestination: "ambulance_point",
    },
    context,
  );
  const allocations = await sql`
    SELECT batch_number_snap AS "batchNumberSnap"
    FROM transaction_batch_allocations
    WHERE transaction_id = ${itemOut.id}
    ORDER BY id
  `;
  assert(
    allocations.length >= 1 &&
      allocations.every((row) => row.batchNumberSnap !== "DEMO-FINAL-BATCH-EXPIRED"),
    "FEFO يجب ألا يخصص الدفعة المنتهية",
  );
  await createScenario(
    "item outbound — administrative delivery across batches",
    {
      kind: "out",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 4,
      recipientId: fixture.recipientId,
      recipientPerson: "موظف تجريبي — تسليم إداري",
      exitReasonId: fixture.exitReasonId,
      internalDeliveryNoteNumber: "DEMO-FINAL-OUT-ADMIN-001",
      internalDeliveryNoteDate: today,
      documentDate: today,
      deliveryDestination: "administrative_building",
    },
    context,
  );

  await createScenario(
    "item damage — expiry or handling loss",
    {
      kind: "damage",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 2,
      reason: "تلف مادة تجريبية أثناء التخزين",
      damageDate: today,
      documentDate: today,
    },
    context,
  );
  await createScenario(
    "item central return — damaged stock",
    {
      kind: "central_return",
      itemType: "item",
      itemId: fixture.itemId,
      quantity: 3,
      returnCondition: "damaged",
      reason: "إرجاع مادة تجريبية إلى المستودع المركزي",
      documentDate: today,
    },
    context,
  );

  const [itemBeforeAdjust] = await sql`
    SELECT current_stock AS "currentStock"
    FROM items
    WHERE id = ${fixture.itemId}
  `;
  const stockBeforeAdjust = Number(itemBeforeAdjust.currentStock);
  await createScenario(
    "item adjustment — positive stock correction",
    {
      kind: "adjust",
      itemId: fixture.itemId,
      newStock: stockBeforeAdjust + 4,
      reason: "مطابقة جرد تجريبي — زيادة",
    },
    context,
  );
  const [itemAfterPositiveAdjust] = await sql`
    SELECT current_stock AS "currentStock"
    FROM items
    WHERE id = ${fixture.itemId}
  `;
  await createScenario(
    "item adjustment — negative stock correction",
    {
      kind: "adjust",
      itemId: fixture.itemId,
      newStock: Math.max(0, Number(itemAfterPositiveAdjust.currentStock) - 2),
      reason: "مطابقة جرد تجريبي — نقص",
    },
    context,
  );

  // Equipment lifecycle: inbound, multiple custody records, partial and
  // complete good return, non-good return states, damage, and central return.
  await createScenario(
    "equipment inbound — bulk fixture",
    {
      kind: "in",
      itemType: "equipment",
      equipmentId: fixture.equipmentId,
      quantity: 8,
      deliveryNoteNumber: "DEMO-FINAL-EQ-IN-001",
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
    },
    context,
  );

  const custodyPartial = await createScenario(
    "equipment custody out — partial return fixture",
    {
      kind: "custody_out",
      itemType: "equipment",
      equipmentId: fixture.equipmentId,
      quantity: 2,
      recipientId: fixture.recipientId,
      holderName: "مسعف تجريبي — عهدة جزئية",
      custodyNoteNumber: "DEMO-FINAL-CUST-PARTIAL-001",
      custodyDate: today,
      custodyLocation: "نقطة إسعاف الاختبار",
    },
    context,
  );
  const partialCustody = await findCustodyForMovement(custodyPartial.id);
  await createScenario(
    "equipment custody return — partial good",
    {
      kind: "custody_return",
      custodyId: partialCustody.id,
      quantity: 1,
      returnCondition: "good",
      returnedToLocation: "رف الاختبار النهائي",
      documentDate: today,
      inspectionNotes: "إعادة جزئية سليمة",
    },
    context,
  );
  await createScenario(
    "equipment custody return — complete good",
    {
      kind: "custody_return",
      custodyId: partialCustody.id,
      quantity: 1,
      returnCondition: "good",
      returnedToLocation: "رف الاختبار النهائي",
      documentDate: today,
      inspectionNotes: "إغلاق العهدة بعد إعادة كامل الكمية",
    },
    context,
  );

  const nonGoodCustodies = [
    {
      key: "damaged",
      holder: "مسعف تجريبي — عهدة تالفة",
      note: "DEMO-FINAL-CUST-DAMAGED-001",
      returnCondition: "damaged" as const,
    },
    {
      key: "maintenance",
      holder: "مسعف تجريبي — عهدة صيانة",
      note: "DEMO-FINAL-CUST-MAINTENANCE-001",
      returnCondition: "needs_maintenance" as const,
    },
    {
      key: "missing",
      holder: "مسعف تجريبي — عهدة مفقودة",
      note: "DEMO-FINAL-CUST-MISSING-001",
      returnCondition: "missing" as const,
    },
  ];
  for (const fixtureCase of nonGoodCustodies) {
    const custodyOut = await createScenario(
      `equipment custody out — ${fixtureCase.key} return`,
      {
        kind: "custody_out",
        itemType: "equipment",
        equipmentId: fixture.equipmentId,
        quantity: 1,
        recipientId: fixture.recipientId,
        holderName: fixtureCase.holder,
        custodyNoteNumber: fixtureCase.note,
        custodyDate: today,
        custodyLocation: "نقطة إسعاف الاختبار",
      },
      context,
    );
    const custody = await findCustodyForMovement(custodyOut.id);
    await createScenario(
      `equipment custody return — ${fixtureCase.key}`,
      {
        kind: "custody_return",
        custodyId: custody.id,
        quantity: 1,
        returnCondition: fixtureCase.returnCondition,
        returnedToLocation: "قسم الفحص والصيانة",
        documentDate: today,
        inspectionNotes: `اختبار حالة الإعادة: ${fixtureCase.key}`,
      },
      context,
    );
  }

  await createScenario(
    "equipment damage — available unit",
    {
      kind: "damage",
      itemType: "equipment",
      equipmentId: fixture.equipmentId,
      quantity: 1,
      reason: "تلف تجهيز تجريبي أثناء الاستخدام",
      damageDate: today,
      documentDate: today,
    },
    context,
  );
  await createScenario(
    "equipment central return — available unit",
    {
      kind: "central_return",
      itemType: "equipment",
      equipmentId: fixture.equipmentId,
      quantity: 1,
      returnCondition: "damaged",
      reason: "إرجاع تجهيز تجريبي إلى المستودع المركزي",
      documentDate: today,
    },
    context,
  );

  // Serial-numbered equipment exercises the one-unit custody rule.
  await createScenario(
    "serial equipment inbound",
    {
      kind: "in",
      itemType: "equipment",
      equipmentId: fixture.serialEquipmentId,
      quantity: 1,
      deliveryNoteNumber: "DEMO-FINAL-SERIAL-IN-001",
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
    },
    context,
  );
  const serialCustody = await createScenario(
    "serial equipment custody out and return",
    {
      kind: "custody_out",
      itemType: "equipment",
      equipmentId: fixture.serialEquipmentId,
      quantity: 1,
      recipientId: fixture.recipientId,
      holderName: "مسعف تجريبي — جهاز مرقم",
      custodyNoteNumber: "DEMO-FINAL-SERIAL-CUST-001",
      custodyDate: today,
      custodyLocation: "سيارة إسعاف الاختبار",
    },
    context,
  );
  const serialCustodyRecord = await findCustodyForMovement(serialCustody.id);
  await createScenario(
    "serial equipment custody return",
    {
      kind: "custody_return",
      custodyId: serialCustodyRecord.id,
      quantity: 1,
      returnCondition: "good",
      returnedToLocation: "رف الأجهزة المرقمة",
      documentDate: today,
      inspectionNotes: "مطابقة الرقم التسلسلي بعد الإعادة",
    },
    context,
  );

  await verifyFixture(fixture);
}

async function verifyFixture(fixture: Fixture) {
  const marker = `%${DEMO_MARKER}%`;
  const movementCounts = await sql`
    SELECT type, count(*)::int AS count
    FROM transactions
    WHERE notes LIKE ${marker}
    GROUP BY type
    ORDER BY type
  `;
  const counts = new Map(movementCounts.map((row) => [String(row.type), Number(row.count)]));
  const requiredTypes = [
    "in",
    "out",
    "adjust",
    "custody_out",
    "custody_return",
    "damage",
    "central_return",
  ];
  for (const type of requiredTypes) {
    assert((counts.get(type) ?? 0) > 0, `لم يتم إنشاء حركة تجريبية من النوع ${type}`);
  }

  const [item] = await sql`
    SELECT current_stock AS "currentStock"
    FROM items
    WHERE id = ${fixture.itemId}
  `;
  const [equipment] = await sql`
    SELECT quantity, condition
    FROM equipment
    WHERE id = ${fixture.equipmentId}
  `;
  const [openCustody] = await sql`
    SELECT COALESCE(SUM(quantity - returned_quantity), 0)::int AS outstanding
    FROM personal_custodies
    WHERE equipment_id = ${fixture.equipmentId}
  `;
  const [partialCustody] = await sql`
    SELECT status
    FROM personal_custodies
    WHERE delivery_note_number = 'DEMO-FINAL-CUST-PARTIAL-001'
    LIMIT 1
  `;
  const [eventCounts] = await sql`
    SELECT
      (SELECT count(*) FROM damage_records WHERE notes LIKE ${marker})::int AS damages,
      (SELECT count(*) FROM central_returns WHERE notes LIKE ${marker})::int AS central_returns,
      (
        SELECT count(*)
        FROM custody_returns cr
        INNER JOIN transactions t ON t.id = cr.transaction_id
        WHERE t.notes LIKE ${marker}
      )::int AS custody_returns
  `;
  const demoBatches = await sql`
    SELECT batch_number AS "batchNumber", remaining_quantity AS "remainingQuantity"
    FROM inventory_batches
    WHERE item_id = ${fixture.itemId}
      AND (
        batch_number LIKE 'DEMO-FINAL-BATCH-%'
      )
    ORDER BY id
  `;
  const outboundAllocations = await sql`
    SELECT
      substring(t.notes from char_length(${DEMO_MARKER}) + 4) AS scenario,
      a.quantity,
      a.batch_number_snap AS "batchNumberSnap",
      a.expiry_date_snap AS "expiryDateSnap"
    FROM transaction_batch_allocations a
    INNER JOIN transactions t ON t.id = a.transaction_id
    WHERE t.notes LIKE ${marker}
      AND t.type = 'out'
    ORDER BY t.id, a.id
  `;
  const custodyStatuses = await sql`
    SELECT
      delivery_note_number AS "deliveryNoteNumber",
      status,
      returned_quantity AS "returnedQuantity"
    FROM personal_custodies
    WHERE equipment_id = ${fixture.equipmentId}
      AND delivery_note_number LIKE 'DEMO-FINAL-CUST-%'
    ORDER BY id
  `;
  const [serialEquipment] = await sql`
    SELECT quantity, condition
    FROM equipment
    WHERE id = ${fixture.serialEquipmentId}
  `;

  assert(Number(item.currentStock) >= 0, "رصيد المادة التجريبية لا يمكن أن يكون سالبًا");
  assert(Number(equipment.quantity) >= 0, "رصيد التجهيز التجريبي لا يمكن أن يكون سالبًا");
  assert.equal(Number(item.currentStock), 26, "رصيد المادة النهائي يجب أن يطابق دفتر الحركات");
  assert.equal(Number(equipment.quantity), 3, "رصيد التجهيز النهائي يجب أن يطابق دفتر الحركات");
  assert.equal(Number(openCustody.outstanding), 0, "يجب إغلاق كل العهد التجريبية");
  assert.equal(String(partialCustody.status), "returned", "يجب إغلاق العهدة ذات الإعادة الجزئية");
  assert.deepEqual(
    Object.fromEntries(movementCounts.map((row) => [String(row.type), Number(row.count)])),
    {
      adjust: 2,
      central_return: 2,
      custody_out: 5,
      custody_return: 6,
      damage: 2,
      in: 6,
      init: 1,
      out: 2,
    },
    "يجب أن يطابق عدد كل نوع من الحركات fixture المتوقع",
  );
  assert.deepEqual(
    demoBatches.map((row) => [row.batchNumber, Number(row.remainingQuantity)]),
    [
      ["DEMO-FINAL-BATCH-NEAR", 0],
      ["DEMO-FINAL-BATCH-FAR", 14],
      ["DEMO-FINAL-BATCH-EXPIRED", 4],
      ["DEMO-FINAL-BATCH-NOEXP", 6],
    ],
    "أرصدة الدفعات يجب أن تطابق FEFO والتلف والمرتجع والتسليم الإداري",
  );
  assert.deepEqual(
    outboundAllocations.map((row) => [
      row.scenario,
      Number(row.quantity),
      row.batchNumberSnap,
      row.expiryDateSnap ? new Date(row.expiryDateSnap).toISOString().slice(0, 10) : null,
    ]),
    [
      ["item outbound — FEFO across batches", 12, "DEMO-FINAL-BATCH-NEAR", isoDate(30)],
      ["item outbound — administrative delivery across batches", 4, "DEMO-FINAL-BATCH-NEAR", isoDate(30)],
    ],
    "تخصيصات الخروج يجب أن تكون FEFO وألا تستخدم الدفعة المنتهية",
  );
  assert.deepEqual(
    custodyStatuses.map((row) => [
      row.deliveryNoteNumber,
      row.status,
      Number(row.returnedQuantity),
    ]),
    [
      ["DEMO-FINAL-CUST-PARTIAL-001", "returned", 2],
      ["DEMO-FINAL-CUST-DAMAGED-001", "damaged", 1],
      ["DEMO-FINAL-CUST-MAINTENANCE-001", "closed", 1],
      ["DEMO-FINAL-CUST-MISSING-001", "closed", 1],
    ],
    "حالات العهد يجب أن تعكس الاستلام الجيد والتالف والصيانة والمفقود",
  );
  assert.deepEqual(
    [Number(serialEquipment.quantity), String(serialEquipment.condition)],
    [1, "good"],
    "الجهاز المرقم يجب أن يعود كاملاً وبحالة سليمة",
  );
  assert.equal(Number(eventCounts.damages), 2, "يجب وجود تلف مادة وتلف تجهيز");
  assert.equal(Number(eventCounts.central_returns), 2, "يجب وجود مرتجع مادة ومرتجع تجهيز");
  assert.equal(Number(eventCounts.custody_returns), 6, "يجب وجود كل عمليات استلام العهد");

  console.log("\nFINAL DEMO FIXTURE VERIFIED");
  console.log(`Movement counts: ${JSON.stringify(Object.fromEntries(counts))}`);
  console.log(`Demo item stock: ${item.currentStock}`);
  console.log(`Demo bulk equipment quantity: ${equipment.quantity} (${equipment.condition})`);
  console.log(`Open demo custody quantity: ${openCustody.outstanding}`);
  console.log("Coverage: init, in/no-expiry, out/FEFO, admin delivery, adjust up/down, custody partial/full, damage, central return");
}

if (DRY_RUN) {
  try {
    dryRunExcelCatalog();
  } finally {
    await sql.end({ timeout: 5 });
  }
} else {
  try {
    await main();
  } finally {
    await sql.end({ timeout: 5 });
  }
}