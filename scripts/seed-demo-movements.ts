import postgres from "postgres";
import { createInventoryMovement } from "../artifacts/api-server/src/lib/inventory-movement-service";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed demo movements");
}

const sql = postgres(process.env.DATABASE_URL, { max: 4 });
const DEMO_ITEM_CODE = "DEMO-ITEM-001";
const DEMO_ITEM_NAME = "مادة تجريبية — شاش إسعافي";
const DEMO_EQUIPMENT_SERIAL = "DEMO-EQUIPMENT-001";
const DEMO_EQUIPMENT_NAME = "تجهيز تجريبي — جهاز إسعاف";
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
    SELECT id, document_number, type, item_id, equipment_id, quantity
    FROM transactions
    WHERE notes LIKE ${`${DEMO_MARKER}%`}
    ORDER BY id
  `;
  const hasItemType = (type: string) =>
    existing.some((movement) => movement.item_id !== null && movement.type === type);
  const hasEquipmentType = (type: string) =>
    existing.some((movement) => movement.equipment_id !== null && movement.type === type);

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

  const [equipment] = await sql`
    INSERT INTO equipment (
      name, equipment_type, model, serial_number, condition,
      manufacture_year, origin_country, notes, quantity, min_quantity
    )
    VALUES (
      ${DEMO_EQUIPMENT_NAME},
      'معدات إسعافية',
      'DEMO-RESCUE-01',
      ${DEMO_EQUIPMENT_SERIAL},
      'good',
      2026,
      'بيانات تجريبية',
      ${DEMO_MARKER},
      0,
      1
    )
    ON CONFLICT (serial_number) DO UPDATE
      SET notes = COALESCE(equipment.notes, EXCLUDED.notes)
    RETURNING id
  `;

  const context = {
    userId: Number(admin.id),
    userName: String(admin.full_name),
    ipAddress: "127.0.0.1",
  };

  let inbound: { documentNumber: string } | null = null;
  let outbound: { documentNumber: string } | null = null;
  if (!hasItemType("in")) {
    inbound = await createInventoryMovement(
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

    outbound = await createInventoryMovement(
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
  }

  let equipmentInbound: { documentNumber: string } | null = null;
  let equipmentCustody: { documentNumber: string } | null = null;
  let equipmentCustodyReturn: { documentNumber: string } | null = null;
  let equipmentDamage: { documentNumber: string } | null = null;
  let equipmentCentralReturn: { documentNumber: string } | null = null;
  if (!hasEquipmentType("in")) {
    equipmentInbound = await createInventoryMovement(
      {
        kind: "in",
        itemType: "equipment",
        equipmentId: Number(equipment.id),
        quantity: 3,
        deliveryNoteNumber: `DEMO-EQ-IN-${today}`,
        deliveryNoteDate: today,
        documentDate: today,
        supplySource: "central_warehouses",
        notes: `${DEMO_MARKER} — إدخال تجهيزات للاختبار`,
      },
      context,
    );
  }

  if (!hasEquipmentType("custody_out")) {
    equipmentCustody = await createInventoryMovement(
      {
        kind: "custody_out",
        itemType: "equipment",
        equipmentId: Number(equipment.id),
        quantity: 1,
        recipientId: Number(recipient.id),
        holderName: "مسعف تجريبي",
        custodyNoteNumber: `DEMO-CUST-${today}`,
        custodyDate: today,
        custodyLocation: "نقطة إسعاف تجريبية",
        notes: `${DEMO_MARKER} — تسليم تجهيز للاختبار`,
      },
      context,
    );
  }

  if (!hasEquipmentType("custody_return")) {
    const [demoCustody] = await sql`
      SELECT id
      FROM personal_custodies
      WHERE equipment_id = ${equipment.id}
      ORDER BY id
      LIMIT 1
    `;
    if (!demoCustody) {
      throw new Error("لا توجد عهدة تجريبية لإضافة حركة الإعادة");
    }
    equipmentCustodyReturn = await createInventoryMovement(
      {
        kind: "custody_return",
        custodyId: Number(demoCustody.id),
        quantity: 1,
        returnCondition: "good",
        returnedToLocation: "رف التجارب",
        documentDate: today,
        inspectionNotes: `${DEMO_MARKER} — فحص إعادة العهدة`,
        notes: `${DEMO_MARKER} — إعادة عهدة للاختبار`,
      },
      context,
    );
  }

  if (!hasEquipmentType("damage")) {
    equipmentDamage = await createInventoryMovement(
      {
        kind: "damage",
        itemType: "equipment",
        equipmentId: Number(equipment.id),
        quantity: 1,
        reason: "تلف تجهيز تجريبي أثناء الاختبار",
        damageDate: today,
        notes: `${DEMO_MARKER} — تسجيل تلف تجهيز`,
      },
      context,
    );
  }

  if (!hasEquipmentType("central_return")) {
    equipmentCentralReturn = await createInventoryMovement(
      {
        kind: "central_return",
        itemType: "equipment",
        equipmentId: Number(equipment.id),
        quantity: 1,
        returnCondition: "damaged",
        reason: "إرجاع تجهيز تجريبي إلى المستودع المركزي",
        documentDate: today,
        notes: `${DEMO_MARKER} — مرتجع مركزي لتجهيز`,
      },
      context,
    );
  }

  let itemAdjustment: { documentNumber: string } | null = null;
  if (!hasItemType("adjust")) {
    itemAdjustment = await createInventoryMovement(
      {
        kind: "adjust",
        itemId: Number(item.id),
        newStock: 20,
        reason: "مطابقة جرد تجريبي",
        notes: `${DEMO_MARKER} — تسوية جرد للمادة`,
      },
      context,
    );
  }

  const [stock] = await sql`
    SELECT current_stock
    FROM items
    WHERE id = ${item.id}
  `;

  console.log("Persistent demo movements created successfully.");
  console.log(`Item: ${DEMO_ITEM_NAME} (${DEMO_ITEM_CODE})`);
  if (inbound && outbound) {
    console.log(`Inbound: ${inbound.documentNumber} — 25 علبة`);
    console.log(`Outbound: ${outbound.documentNumber} — 7 علب`);
  } else {
    console.log("Item movements already existed; no duplicate item movements were created.");
  }
  console.log(`Current stock: ${stock.current_stock} علبة`);
  console.log(`Equipment: ${DEMO_EQUIPMENT_NAME} (${DEMO_EQUIPMENT_SERIAL})`);
  if (equipmentInbound && equipmentCustody) {
    console.log(`Equipment inbound: ${equipmentInbound.documentNumber} — 3 وحدات`);
    console.log(`Equipment custody: ${equipmentCustody.documentNumber} — وحدة واحدة`);
  } else {
    console.log("Equipment movements already existed; no duplicate equipment movements were created.");
  }
  if (equipmentCustodyReturn) {
    console.log(`Equipment custody return: ${equipmentCustodyReturn.documentNumber} — وحدة واحدة`);
  }
  if (equipmentDamage) {
    console.log(`Equipment damage: ${equipmentDamage.documentNumber} — وحدة واحدة`);
  }
  if (equipmentCentralReturn) {
    console.log(`Equipment central return: ${equipmentCentralReturn.documentNumber} — وحدة واحدة`);
  }
  if (itemAdjustment) {
    console.log(`Item adjustment: ${itemAdjustment.documentNumber} — الرصيد الجديد 20 علبة`);
  }
}

try {
  await main();
} finally {
  await sql.end({ timeout: 5 });
}