import { Router } from "express";
import { db, itemsTable, equipmentTable, transactionsTable, categoriesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { eq, and, lte, gte, sql } from "drizzle-orm";

const router = Router();

// GET /api/reports/stock
router.get("/stock", requireAuth, async (_req, res) => {
  try {
    const items = await db
      .select({
        id: itemsTable.id,
        code: itemsTable.code,
        name: itemsTable.name,
        categoryName: categoriesTable.name,
        itemType: itemsTable.itemType,
        unit: itemsTable.unit,
        currentStock: itemsTable.currentStock,
        minStock: itemsTable.minStock,
        expiryDate: itemsTable.expiryDate,
        batchNumber: itemsTable.batchNumber,
        location: itemsTable.location,
        supplier: itemsTable.supplier,
        updatedAt: itemsTable.updatedAt,
      })
      .from(itemsTable)
      .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
      .where(eq(itemsTable.isActive, true))
      .orderBy(itemsTable.name);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/reports/movements
router.get("/movements", requireAuth, async (req, res) => {
  try {
    const { from, to, type } = req.query as Record<string, string>;
    const conditions = [];
    if (from) conditions.push(gte(transactionsTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(transactionsTable.createdAt, new Date(to)));
    if (type) conditions.push(eq(transactionsTable.type, type as never));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const transactions = await db
      .select({
        id: transactionsTable.id,
        type: transactionsTable.type,
        itemType: transactionsTable.itemType,
        itemName: itemsTable.name,
        itemUnit: itemsTable.unit,
        equipmentName: equipmentTable.name,
        quantity: transactionsTable.quantity,
        recipientName: transactionsTable.recipientNameSnap,
        recipientPerson: transactionsTable.recipientPerson,
        exitReason: transactionsTable.exitReasonSnap,
        documentNumber: transactionsTable.documentNumber,
        notes: transactionsTable.notes,
        createdByName: usersTable.fullName,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(itemsTable, eq(transactionsTable.itemId, itemsTable.id))
      .leftJoin(equipmentTable, eq(transactionsTable.equipmentId, equipmentTable.id))
      .leftJoin(usersTable, eq(transactionsTable.createdBy, usersTable.id))
      .where(where)
      .orderBy(sql`${transactionsTable.createdAt} DESC`);
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/reports/expiry
router.get("/expiry", requireAuth, async (_req, res) => {
  try {
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const items = await db
      .select({
        id: itemsTable.id,
        code: itemsTable.code,
        name: itemsTable.name,
        categoryName: categoriesTable.name,
        unit: itemsTable.unit,
        currentStock: itemsTable.currentStock,
        expiryDate: itemsTable.expiryDate,
        batchNumber: itemsTable.batchNumber,
        location: itemsTable.location,
        supplier: itemsTable.supplier,
      })
      .from(itemsTable)
      .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(itemsTable.isActive, true),
          sql`${itemsTable.expiryDate} IS NOT NULL AND ${itemsTable.expiryDate} <= ${sixtyDaysFromNow.toISOString().split("T")[0]}`
        )
      )
      .orderBy(itemsTable.expiryDate);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/reports/below-min
router.get("/below-min", requireAuth, async (_req, res) => {
  try {
    const items = await db
      .select({
        id: itemsTable.id,
        code: itemsTable.code,
        name: itemsTable.name,
        categoryName: categoriesTable.name,
        itemType: itemsTable.itemType,
        unit: itemsTable.unit,
        currentStock: itemsTable.currentStock,
        minStock: itemsTable.minStock,
        location: itemsTable.location,
        supplier: itemsTable.supplier,
      })
      .from(itemsTable)
      .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(itemsTable.isActive, true),
          lte(itemsTable.currentStock, itemsTable.minStock)
        )
      )
      .orderBy(itemsTable.currentStock);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/reports/equipment
router.get("/equipment", requireAuth, async (_req, res) => {
  try {
    const equipment = await db.query.equipmentTable.findMany({
      orderBy: (e, { asc }) => [asc(e.name)],
    });
    res.json(equipment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
