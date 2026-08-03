import { Router } from "express";
import { db, equipmentTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq, and, ilike, sql } from "drizzle-orm";

const router = Router();

// GET /api/equipment
router.get("/", requireAuth, async (req, res) => {
  try {
    const {
      condition,
      search,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (condition) conditions.push(eq(equipmentTable.condition, condition as never));
    if (search) conditions.push(ilike(equipmentTable.name, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [equipment, totalResult] = await Promise.all([
      db.query.equipmentTable.findMany({
        where,
        orderBy: (e, { desc }) => [desc(e.createdAt)],
        limit: limitNum,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(equipmentTable)
        .where(where),
    ]);

    res.json({
      equipment,
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/equipment
router.post(
  "/",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const {
        name,
        equipmentType,
        model,
        serialNumber,
        condition = "good",
        manufactureYear,
        originCountry,
        currentHolder,
        notes,
      } = req.body;
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      const [eq_] = await db
        .insert(equipmentTable)
        .values({
          name,
          equipmentType: equipmentType || null,
          model: model || null,
          serialNumber: serialNumber || null,
          condition,
          manufactureYear: manufactureYear ? parseInt(manufactureYear, 10) : null,
          originCountry: originCountry || null,
          currentHolder: currentHolder || null,
          notes: notes || null,
        })
        .returning();
      res.status(201).json(eq_);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/equipment/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const item = await db.query.equipmentTable.findFirst({
      where: (e, { eq: eqFn }) => eqFn(e.id, id),
    });
    if (!item) {
      res.status(404).json({ error: "Equipment not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/equipment/:id
router.put(
  "/:id",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const {
        name,
        equipmentType,
        model,
        serialNumber,
        condition,
        manufactureYear,
        originCountry,
        currentHolder,
        notes,
      } = req.body;

      const updates: Partial<typeof equipmentTable.$inferInsert> = {};
      if (name !== undefined) updates.name = name;
      if (equipmentType !== undefined) updates.equipmentType = equipmentType || null;
      if (model !== undefined) updates.model = model || null;
      if (serialNumber !== undefined) updates.serialNumber = serialNumber || null;
      if (condition !== undefined) updates.condition = condition;
      if (manufactureYear !== undefined)
        updates.manufactureYear = manufactureYear ? parseInt(manufactureYear, 10) : null;
      if (originCountry !== undefined) updates.originCountry = originCountry || null;
      if (currentHolder !== undefined) updates.currentHolder = currentHolder || null;
      if (notes !== undefined) updates.notes = notes || null;

      const [eq_] = await db
        .update(equipmentTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(equipmentTable.id, id))
        .returning();

      if (!eq_) {
        res.status(404).json({ error: "Equipment not found" });
        return;
      }
      res.json(eq_);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
