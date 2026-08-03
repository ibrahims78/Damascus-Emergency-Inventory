import { Router } from "express";
import { db, itemsTable, equipmentTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { eq, and, lte, sql, inArray } from "drizzle-orm";

const router = Router();

// GET /api/alerts
router.get("/", requireAuth, async (_req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [belowMin, nearExpiry, needsMaintenance] = await Promise.all([
      // Items below minimum stock
      db
        .select({
          id: itemsTable.id,
          name: itemsTable.name,
          currentStock: itemsTable.currentStock,
          minStock: itemsTable.minStock,
        })
        .from(itemsTable)
        .where(and(eq(itemsTable.isActive, true), lte(itemsTable.currentStock, itemsTable.minStock)))
        .limit(20),

      // Items near expiry
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
            sql`${itemsTable.expiryDate} IS NOT NULL AND ${itemsTable.expiryDate} <= ${thirtyDaysFromNow.toISOString().split("T")[0]}`
          )
        )
        .limit(20),

      // Equipment needing maintenance/inspection
      db
        .select({ id: equipmentTable.id, name: equipmentTable.name, condition: equipmentTable.condition })
        .from(equipmentTable)
        .where(inArray(equipmentTable.condition, ["maintenance", "needs_inspection"]))
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
        severity: "info",
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
