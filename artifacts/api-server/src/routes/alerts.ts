import { Router } from "express";
import { db, itemsTable, equipmentTable, systemSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { eq, and, lte, lt, gt, sql, inArray } from "drizzle-orm";

const router = Router();

// GET /api/alerts
router.get("/", requireAuth, async (_req, res) => {
  try {
    // Read expiry alert window from settings (falls back to 30 days)
    const settings = await db.query.systemSettingsTable.findFirst();
    const expiryAlertDays = settings?.expiryAlertDays ?? 30;

    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + expiryAlertDays);
    const alertDateStr = alertDate.toISOString().split("T")[0];

    const [belowMin, nearExpiry, needsMaintenance, equipmentBelowMin] = await Promise.all([
      // Items below minimum stock — only when minStock > 0 (0 = no threshold configured)
      db
        .select({
          id: itemsTable.id,
          name: itemsTable.name,
          currentStock: itemsTable.currentStock,
          minStock: itemsTable.minStock,
        })
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.isActive, true),
            gt(itemsTable.minStock, 0),
            lte(itemsTable.currentStock, itemsTable.minStock)
          )
        )
        .limit(20),

      // Items near expiry (within expiryAlertDays from settings)
      db
        .select({
          id: itemsTable.id,
          name: itemsTable.name,
          expiryDate: itemsTable.expiryDate,
        })
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.isActive, true),
            sql`${itemsTable.expiryDate} IS NOT NULL AND ${itemsTable.expiryDate} <= ${alertDateStr}`
          )
        )
        .limit(20),

      // Equipment needing maintenance or inspection
      db
        .select({ id: equipmentTable.id, name: equipmentTable.name, condition: equipmentTable.condition })
        .from(equipmentTable)
        .where(inArray(equipmentTable.condition, ["maintenance", "needs_inspection"]))
        .limit(10),

      // Equipment below minimum quantity — only when minQuantity > 0
      db
        .select({
          id: equipmentTable.id,
          name: equipmentTable.name,
          quantity: equipmentTable.quantity,
          minQuantity: equipmentTable.minQuantity,
        })
        .from(equipmentTable)
        .where(
          and(
            gt(equipmentTable.minQuantity, 0),
            lt(equipmentTable.quantity, equipmentTable.minQuantity)
          )
        )
        .limit(10),
    ]);

    const alerts: Array<{
      id: string;
      type: string;
      message: string;
      severity: string;
      itemId?: number | null;
      itemName?: string | null;
    }> = [
      ...belowMin.map((item) => ({
        id: `below-min-${item.id}`,
        type: "below_min",
        message: `${item.name}: الرصيد الحالي (${item.currentStock}) أقل من أو يساوي الحد الأدنى (${item.minStock})`,
        severity: item.currentStock === 0 ? "critical" : "warning",
        itemId: item.id,
        itemName: item.name,
      })),
      ...nearExpiry.map((item) => ({
        id: `near-expiry-${item.id}`,
        type: "near_expiry",
        message: `${item.name}: ينتهي بتاريخ ${item.expiryDate}`,
        severity: "warning",
        itemId: item.id,
        itemName: item.name,
      })),
      ...needsMaintenance.map((eq_) => ({
        id: `equipment-${eq_.id}`,
        type: "equipment_maintenance",
        message: `${eq_.name}: ${eq_.condition === "maintenance" ? "تحت الصيانة" : "يحتاج فحص"}`,
        severity: "warning",
        itemId: null,
        itemName: eq_.name,
      })),
      ...equipmentBelowMin.map((eq_) => ({
        id: `equipment-below-min-${eq_.id}`,
        type: "below_min",
        message: `${eq_.name}: الكمية الحالية (${eq_.quantity}) أقل من الحد الأدنى (${eq_.minQuantity})`,
        severity: eq_.quantity === 0 ? "critical" : "warning",
        itemId: null,
        itemName: eq_.name,
      })),
    ];

    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
