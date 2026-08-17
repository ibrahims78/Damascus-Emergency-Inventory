import postgres from "postgres";
import { createInventoryMovement } from "../artifacts/api-server/src/lib/inventory-movement-service";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed demo movements");
}

const sql = postgres(process.env.DATABASE_URL, { max: 4 });
const DEMO_ITEM_CODE = "DEMO-ITEM-001";
const DEMO_ITEM_NAME = "مادة تجريبية — شاش إسعافي";
const DEMO_RECIPIENT = "جهة تجريبية — نقطة إسعاف";
const DEMO_REASON = "تجربة تشغيل النظام";
const DEMO_MARKER = "بيانات تجريبية دائمة للعرض";

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const today = isoDate();
  const expiryDate = isoDate(365);

  const [admin] = await sql`
    SELECT id, full_name
    FROM users
    WHERE role = 'admin' AND is_active = true
    ORDER BY id
    LIMIT 1
  `;
  if (!admin) {
    throw new Error("لا يوجد مستخدم admin نشط لتسجيل الحركة التجريبية");
  }

  const existing = await sql`
    SELECT id, document_number, type, item_id, quantity
    FROM transactions
    WHERE notes LIKE ${`${DEMO_MARKER}%`}
    ORDER BY id
  `;
  if (existing.length > 0) {
    console.log("Demo movements already exist; no duplicate movements were created.");
    for (const movement of existing) {
      console.log(
        `${movement.type}: ${movement.document_number} — item ${movement.item_id} — quantity ${movement.quantity}`,
      );
    }
    return;
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
      'رف التجارب',
      'مورد تجريبي',
      ${DEMO_MARKER},
      true
    )
    ON CONFLICT (code) DO UPDATE
      SET is_active = true
    RETURNING id
  `;

  const [recipient] = await sql`
    INSERT INTO recipients (name, notes, is_active)
    VALUES (${DEMO_RECIPIENT}, ${DEMO_MARKER}, true)
    ON CONFLICT (name) DO UPDATE
      SET is_active = true
    RETURNING id
  `;

  const [reason] = await sql`
    INSERT INTO exit_reasons (name, is_system, is_active)
    VALUES (${DEMO_REASON}, false, true)
    ON CONFLICT (name) DO UPDATE
      SET is_active = true
    RETURNING id
  `;

  const context = {
    userId: Number(admin.id),
    userName: String(admin.full_name),
    ipAddress: "127.0.0.1",
  };

  const inbound = await createInventoryMovement(
    {
      kind: "in",
      itemType: "item",
      itemId: Number(item.id),
      quantity: 25,
      deliveryNoteNumber: `DEMO-IN-${today}`,
      deliveryNoteDate: today,
      documentDate: today,
      supplySource: "central_warehouses",
      batchNumber: `DEMO-BATCH-${today}`,
      expiryDate,
      notes: `${DEMO_MARKER} — إدخال دفعة أولى`,
    },
    context,
  );

  const outbound = await createInventoryMovement(
    {
      kind: "out",
      itemType: "item",
      itemId: Number(item.id),
      quantity: 7,
      recipientId: Number(recipient.id),
      recipientPerson: "مسعف تجريبي",
      exitReasonId: Number(reason.id),
      internalDeliveryNoteNumber: `DEMO-OUT-${today}`,
      internalDeliveryNoteDate: today,
      documentDate: today,
      deliveryDestination: "ambulance_point",
      notes: `${DEMO_MARKER} — إخراج للتجربة`,
    },
    context,
  );

  const [stock] = await sql`
    SELECT current_stock
    FROM items
    WHERE id = ${item.id}
  `;

  console.log("Persistent demo movements created successfully.");
  console.log(`Item: ${DEMO_ITEM_NAME} (${DEMO_ITEM_CODE})`);
  console.log(`Inbound: ${inbound.documentNumber} — 25 علبة`);
  console.log(`Outbound: ${outbound.documentNumber} — 7 علب`);
  console.log(`Current stock: ${stock.current_stock} علبة`);
}

try {
  await main();
} finally {
  await sql.end({ timeout: 5 });
}