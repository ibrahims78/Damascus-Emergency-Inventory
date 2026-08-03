import { Router } from "express";
import { db, itemsTable, equipmentTable, transactionsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { eq, lte, and, sql } from "drizzle-orm";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", requireAuth, async (_req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date().toISOString().split("T")[0];

    const [
      totalItemsResult,
      belowMinResult,
      nearExpiryResult,
      totalEquipmentResult,
      lastTransactionResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(itemsTable).where(eq(itemsTable.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(itemsTable).where(and(eq(itemsTable.isActive, true), lte(itemsTable.currentStock, itemsTable.minStock))),
      db.select({ count: sql<number>`count(*)` }).from(itemsTable).where(
        and(
          eq(itemsTable.isActive, true),
          sql`${itemsTable.expiryDate} IS NOT NULL AND ${itemsTable.expiryDate} <= ${thirtyDaysFromNow.toISOString().split("T")[0]}`
        )
      ),
      db.select({ count: sql<number>`count(*)` }).from(equipmentTable),
      db
        .select({
          id: transactionsTable.id,
          type: transactionsTable.type,
          itemName: itemsTable.name,
          equipmentName: equipmentTable.name,
          createdAt: transactionsTable.createdAt,
          createdByName: usersTable.fullName,
        })
        .from(transactionsTable)
        .leftJoin(itemsTable, eq(transactionsTable.itemId, itemsTable.id))
        .leftJoin(equipmentTable, eq(transactionsTable.equipmentId, equipmentTable.id))
        .leftJoin(usersTable, eq(transactionsTable.createdBy, usersTable.id))
        .orderBy(sql`${transactionsTable.createdAt} DESC`)
        .limit(1),
    ]);

    const last = lastTransactionResult[0];
    res.json({
      totalItems: Number(totalItemsResult[0]?.count ?? 0),
      belowMinCount: Number(belowMinResult[0]?.count ?? 0),
      nearExpiryCount: Number(nearExpiryResult[0]?.count ?? 0),
      totalEquipment: Number(totalEquipmentResult[0]?.count ?? 0),
      lastTransactionId: last?.id ?? null,
      lastTransactionType: last?.type ?? null,
      lastTransactionItemName: last?.itemName ?? last?.equipmentName ?? null,
      lastTransactionAt: last?.createdAt ?? null,
      lastTransactionBy: last?.createdByName ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/charts
router.get("/charts", requireAuth, async (_req, res) => {
  try {
    const [topConsumed, stockByCategory] = await Promise.all([
      // Top consumed items (by out transactions in last 90 days)
      db.execute(sql`
        SELECT i.name, SUM(t.quantity) as quantity
        FROM transactions t
        JOIN items i ON t.item_id = i.id
        WHERE t.type = 'out' AND t.item_type = 'item'
          AND t.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY i.name
        ORDER BY quantity DESC
        LIMIT 10
      `),
      // Stock count grouped by category
      db.execute(sql`
        SELECT COALESCE(c.name, 'غير مصنف') as "categoryName", COUNT(i.id) as count
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.is_active = true
        GROUP BY c.name
        ORDER BY count DESC
      `),
    ]);

    res.json({
      topConsumed: (topConsumed.rows as Array<{ name: string; quantity: string }>).map((r) => ({
        name: r.name,
        quantity: Number(r.quantity),
      })),
      stockByCategory: (stockByCategory.rows as Array<{ categoryName: string; count: string }>).map((r) => ({
        categoryName: r.categoryName,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
