import { Router } from "express";
import { db, recipientsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/recipients
router.get("/", requireAuth, async (_req, res) => {
  try {
    const recipients = await db.query.recipientsTable.findMany({
      orderBy: (r, { asc }) => [asc(r.name)],
    });
    res.json(recipients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/recipients
router.post("/", requireAuth, requireRole("admin", "warehouse_manager"), async (req, res) => {
  try {
    const { name, notes } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [recipient] = await db
      .insert(recipientsTable)
      .values({ name, notes: notes || null })
      .returning();
    res.status(201).json(recipient);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "اسم الجهة مستخدم مسبقاً" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/recipients/:id
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, notes } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [updated] = await db
      .update(recipientsTable)
      .set({ name, notes: notes || null })
      .where(eq(recipientsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "اسم الجهة مستخدم مسبقاً" }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/recipients/:id/toggle
router.patch("/:id/toggle", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const current = await db.query.recipientsTable.findFirst({ where: eq(recipientsTable.id, id) });
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    const [updated] = await db
      .update(recipientsTable)
      .set({ isActive: !current.isActive })
      .where(eq(recipientsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
