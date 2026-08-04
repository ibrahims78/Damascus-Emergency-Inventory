import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/categories
router.get("/", requireAuth, async (_req, res) => {
  try {
    const categories = await db.query.categoriesTable.findMany({
      orderBy: (c, { asc }) => [asc(c.name)],
    });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/categories
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, type } = req.body as { name?: string; type?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "اسم التصنيف مطلوب" });
    }
    if (!type || !["consumable", "equipment"].includes(type)) {
      return res.status(400).json({ error: "نوع التصنيف مطلوب (consumable أو equipment)" });
    }
    const [created] = await db
      .insert(categoriesTable)
      .values({ name: name.trim(), type: type as "consumable" | "equipment" })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "هذا التصنيف موجود مسبقاً" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/categories/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type } = req.body as { name?: string; type?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "اسم التصنيف مطلوب" });
    }
    const updateData: Partial<typeof categoriesTable.$inferInsert> = { name: name.trim() };
    if (type && ["consumable", "equipment"].includes(type)) {
      updateData.type = type as "consumable" | "equipment";
    }
    const [updated] = await db
      .update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "التصنيف غير موجود" });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "هذا التصنيف موجود مسبقاً" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "التصنيف غير موجود" });
    res.json({ success: true });
  } catch (err: any) {
    // FK violation — category is in use
    if (err?.code === "23503") {
      return res.status(409).json({ error: "لا يمكن حذف التصنيف لأنه مرتبط بمواد موجودة" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
