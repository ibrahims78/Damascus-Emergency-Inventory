import assert from "node:assert/strict";
import postgres from "postgres";
import {
  createInventoryMovement,
  type MovementContext,
  type MovementInput,
} from "../artifacts/api-server/src/lib/inventory-movement-service";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed demo movements");
}

const sql = postgres(process.env.DATABASE_URL, { max: 4 });

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

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function scenarioNote(scenario: string) {
  return `${DEMO_MARKER} — ${scenario}`;
}

async function findScenario(scenario: string): Promise<MovementRow | null> {
  const marker = `%${DEMO_MARKER}%`;
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
): Promise<MovementRow> {
  const existing = await findScenario(scenario);
  if (existing) {
    console.log(`SKIP ${scenario}: ${existing.documentNumber}`);
    return existing;
  }

  const movement = await createInventoryMovement(
    { ...input, notes: scenarioNote(scenario) },
    context,
  );
  const created = movement as MovementRow;
  console.log(`CREATE ${scenario}: ${created.documentNumber}`);
  return created;
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

  assert(Number(item.currentStock) >= 0, "رصيد المادة التجريبية لا يمكن أن يكون سالبًا");
  assert(Number(equipment.quantity) >= 0, "رصيد التجهيز التجريبي لا يمكن أن يكون سالبًا");
  assert.equal(Number(openCustody.outstanding), 0, "يجب إغلاق كل العهد التجريبية");
  assert.equal(String(partialCustody.status), "returned", "يجب إغلاق العهدة ذات الإعادة الجزئية");
  assert(Number(eventCounts.damages) >= 2, "يجب وجود تلف مادة وتلف تجهيز");
  assert(Number(eventCounts.central_returns) >= 2, "يجب وجود مرتجع مادة ومرتجع تجهيز");
  assert(Number(eventCounts.custody_returns) >= 5, "يجب وجود إعادة جزئية وحالات عهد متعددة");

  console.log("\nFINAL DEMO FIXTURE VERIFIED");
  console.log(`Movement counts: ${JSON.stringify(Object.fromEntries(counts))}`);
  console.log(`Demo item stock: ${item.currentStock}`);
  console.log(`Demo bulk equipment quantity: ${equipment.quantity} (${equipment.condition})`);
  console.log(`Open demo custody quantity: ${openCustody.outstanding}`);
  console.log("Coverage: init, in, out/FEFO, adjust up/down, custody partial/full, damage, central return");
}

try {
  await main();
} finally {
  await sql.end({ timeout: 5 });
}