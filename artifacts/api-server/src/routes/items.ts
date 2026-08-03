import { Router } from "express";
import { db, itemsTable, categoriesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { auditLog } from "../middlewares/audit";
import { eq, and, ilike, lte, sql } from "drizzle-orm";

const router = Router();

// GET /api/items
router.get("/", requireAuth, async (req, res) => {
  try {
    const {
      categoryId,
      search,
      belowMin,
      nearExpiry,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(itemsTable.isActive, true)];

    if (categoryId) conditions.push(eq(itemsTable.categoryId, parseInt(categoryId, 10)));
    if (search) conditions.push(ilike(itemsTable.name, `%${search}%`));
    if (belowMin === "true")
      conditions.push(lte(itemsTable.currentStock, itemsTable.minStock));
    if (nearExpiry === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      conditions.push(
        sql`${itemsTable.expiryDate} IS NOT NULL AND ${itemsTable.expiryDate} <= ${thirtyDaysFromNow.toISOString().split("T")[0]}`
      );
    }

    const where = and(...conditions);

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: itemsTable.id,
          code: itemsTable.code,
          name: itemsTable.name,
          categoryId: itemsTable.categoryId,
          categoryName: categoriesTable.name,
          itemType: itemsTable.itemType,
          unit: itemsTable.unit,
          currentStock: itemsTable.currentStock,
          minStock: itemsTable.minStock,
          expiryDate: itemsTable.expiryDate,
          batchNumber: itemsTable.batchNumber,
          location: itemsTable.location,
          supplier: itemsTable.supplier,
          notes: itemsTable.notes,
          isActive: itemsTable.isActive,
          createdAt: itemsTable.createdAt,
          updatedAt: itemsTable.updatedAt,
        })
        .from(itemsTable)
        .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(itemsTable.name)
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(itemsTable)
        .where(where),
    ]);

    res.json({
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/items
router.post(
  "/",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const {
        code,
        name,
        categoryId,
        itemType,
        unit,
        currentStock = 0,
        minStock = 0,
        expiryDate,
        batchNumber,
        location,
        supplier,
        notes,
      } = req.body;
      if (!name || !itemType || !unit) {
        res.status(400).json({ error: "name, itemType, and unit are required" });
        return;
      }
      const [item] = await db
        .insert(itemsTable)
        .values({
          code: code || null,
          name,
          categoryId: categoryId ? parseInt(categoryId, 10) : null,
          itemType,
          unit,
          currentStock: parseInt(currentStock, 10),
          minStock: parseInt(minStock, 10),
          expiryDate: expiryDate || null,
          batchNumber: batchNumber || null,
          location: location || null,
          supplier: supplier || null,
          notes: notes || null,
        })
        .returning();
      await auditLog({ req, action: "create", entityType: "item", entityId: item.id, details: { name: item.name, itemType: item.itemType } });
      res.status(201).json(item);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/items/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [item] = await db
      .select({
        id: itemsTable.id,
        code: itemsTable.code,
        name: itemsTable.name,
        categoryId: itemsTable.categoryId,
        categoryName: categoriesTable.name,
        itemType: itemsTable.itemType,
        unit: itemsTable.unit,
        currentStock: itemsTable.currentStock,
        minStock: itemsTable.minStock,
        expiryDate: itemsTable.expiryDate,
        batchNumber: itemsTable.batchNumber,
        location: itemsTable.location,
        supplier: itemsTable.supplier,
        notes: itemsTable.notes,
        isActive: itemsTable.isActive,
        createdAt: itemsTable.createdAt,
        updatedAt: itemsTable.updatedAt,
      })
      .from(itemsTable)
      .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
      .where(and(eq(itemsTable.id, id), eq(itemsTable.isActive, true)));

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/items/:id
router.put(
  "/:id",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const {
        code,
        name,
        categoryId,
        itemType,
        unit,
        minStock,
        expiryDate,
        batchNumber,
        location,
        supplier,
        notes,
      } = req.body;

      const updates: Partial<typeof itemsTable.$inferInsert> = {};
      if (code !== undefined) updates.code = code || null;
      if (name !== undefined) updates.name = name;
      if (categoryId !== undefined)
        updates.categoryId = categoryId ? parseInt(categoryId, 10) : null;
      if (itemType !== undefined) updates.itemType = itemType;
      if (unit !== undefined) updates.unit = unit;
      if (minStock !== undefined) updates.minStock = parseInt(minStock, 10);
      if (expiryDate !== undefined) updates.expiryDate = expiryDate || null;
      if (batchNumber !== undefined) updates.batchNumber = batchNumber || null;
      if (location !== undefined) updates.location = location || null;
      if (supplier !== undefined) updates.supplier = supplier || null;
      if (notes !== undefined) updates.notes = notes || null;

      const [item] = await db
        .update(itemsTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(itemsTable.id, id))
        .returning();

      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      await auditLog({ req, action: "update", entityType: "item", entityId: item.id, details: { name: item.name } });
      res.json(item);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /api/items/:id (soft delete)
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      await db
        .update(itemsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(itemsTable.id, id));
      await auditLog({ req, action: "delete", entityType: "item", entityId: id, details: {} });
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
