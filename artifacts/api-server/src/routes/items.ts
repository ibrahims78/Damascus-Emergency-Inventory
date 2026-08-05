import { Router } from "express";
import { db, itemsTable, categoriesTable, systemSettingsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { auditLog } from "../middlewares/audit";
import { runAlertWorker } from "../lib/alert-worker";
import { eq, and, ilike, lte, sql, isNotNull } from "drizzle-orm";

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
      const settings = await db.query.systemSettingsTable.findFirst();
      const alertDays = settings?.expiryAlertDays ?? 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + alertDays);
      conditions.push(
        sql`${itemsTable.expiryDate} IS NOT NULL AND ${itemsTable.expiryDate} <= ${cutoffDate.toISOString().split("T")[0]}`
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
      const parsedStock = parseInt(currentStock, 10);
      const parsedMinStock = parseInt(minStock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        res.status(400).json({ error: "currentStock must be a non-negative number" });
        return;
      }
      if (isNaN(parsedMinStock) || parsedMinStock < 0) {
        res.status(400).json({ error: "minStock must be a non-negative number" });
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
          currentStock: parsedStock,
          minStock: parsedMinStock,
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

// POST /api/items/bulk-import
router.post(
  "/bulk-import",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "يجب إرسال قائمة مواد صالحة" });
        return;
      }
      if (items.length > 1000) {
        res.status(400).json({ error: "الحد الأقصى للاستيراد 1000 صف في المرة الواحدة" });
        return;
      }

      // Fetch all categories for name→id resolution
      const allCategories = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable);
      const categoryMap = new Map(
        allCategories.map((c) => [c.name.trim().toLowerCase(), c.id])
      );

      const mode = (req.query.mode as string) === "upsert" ? "upsert" : "insert";

      // In upsert mode, pre-fetch existing codes (one query) for insert-vs-update tracking
      const existingCodes = new Set<string>();
      if (mode === "upsert") {
        const existing = await db
          .select({ code: itemsTable.code })
          .from(itemsTable)
          .where(isNotNull(itemsTable.code));
        existing.forEach((r) => { if (r.code) existingCodes.add(r.code); });
      }

      const results: {
        created: number;
        updated: number;
        errors: { row: number; name: string; error: string }[];
      } = { created: 0, updated: 0, errors: [] };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 2; // Excel row (header = row 1)
        const name = String(item.name ?? "").trim();
        const unit = String(item.unit ?? "").trim();

        if (!name) {
          results.errors.push({ row: rowNum, name: `صف ${rowNum}`, error: "الاسم مطلوب" });
          continue;
        }
        if (!unit) {
          results.errors.push({ row: rowNum, name, error: "الوحدة مطلوبة" });
          continue;
        }

        // Resolve category name → id
        let categoryId: number | null = null;
        if (item.categoryName) {
          const resolved = categoryMap.get(String(item.categoryName).trim().toLowerCase());
          if (resolved !== undefined) categoryId = resolved;
        }

        const currentStock = parseInt(String(item.currentStock ?? 0), 10);
        const minStock = parseInt(String(item.minStock ?? 0), 10);

        if (isNaN(currentStock) || currentStock < 0) {
          results.errors.push({ row: rowNum, name, error: "الكمية الحالية يجب أن تكون رقماً موجباً" });
          continue;
        }
        if (isNaN(minStock) || minStock < 0) {
          results.errors.push({ row: rowNum, name, error: "الحد الأدنى يجب أن يكون رقماً موجباً" });
          continue;
        }

        const code = item.code ? String(item.code).trim() : null;
        const isUpdate = mode === "upsert" && code !== null && existingCodes.has(code);

        const values = {
          code,
          name,
          categoryId,
          itemType: "item" as const,
          unit,
          currentStock,
          minStock,
          expiryDate: item.expiryDate ? String(item.expiryDate).trim() : null,
          batchNumber: item.batchNumber ? String(item.batchNumber).trim() : null,
          location: item.location ? String(item.location).trim() : null,
          supplier: item.supplier ? String(item.supplier).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null,
        };

        try {
          if (mode === "upsert" && code !== null) {
            // Upsert: update all fields when code already exists
            const [saved] = await db
              .insert(itemsTable)
              .values(values)
              .onConflictDoUpdate({
                target: itemsTable.code,
                set: {
                  name: values.name,
                  categoryId: values.categoryId,
                  unit: values.unit,
                  currentStock: values.currentStock,
                  minStock: values.minStock,
                  expiryDate: values.expiryDate,
                  batchNumber: values.batchNumber,
                  location: values.location,
                  supplier: values.supplier,
                  notes: values.notes,
                },
              })
              .returning();
            if (isUpdate) {
              results.updated++;
              await auditLog({
                req, action: "update", entityType: "item", entityId: saved.id,
                details: { name: saved.name, source: "bulk-import-upsert" },
              });
            } else {
              results.created++;
              await auditLog({
                req, action: "create", entityType: "item", entityId: saved.id,
                details: { name: saved.name, source: "bulk-import" },
              });
            }
          } else {
            // Insert-only mode
            const [created] = await db.insert(itemsTable).values(values).returning();
            results.created++;
            await auditLog({
              req, action: "create", entityType: "item", entityId: created.id,
              details: { name: created.name, source: "bulk-import" },
            });
          }
        } catch (err: unknown) {
          const e = err as { cause?: { code?: string }; code?: string };
          const isDuplicate = e?.cause?.code === "23505" || e?.code === "23505";
          results.errors.push({
            row: rowNum,
            name,
            error: isDuplicate ? "الرمز مستخدم مسبقاً — استخدم وضع «تحديث وإضافة» لتحديثه" : "خطأ في الإدراج",
          });
        }
      }

      res.json(results);
      // Trigger worker after import so new alerts reflect imported data immediately
      runAlertWorker();
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
      runAlertWorker(); // re-evaluate: expiry date / minStock may have changed
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
      runAlertWorker(); // item deactivated — auto-resolve its alerts
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
