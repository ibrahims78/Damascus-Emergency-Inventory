import { Router } from "express";
import { db, exitReasonsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/exit-reasons
router.get("/", requireAuth, async (_req, res) => {
  try {
    const reasons = await db.query.exitReasonsTable.findMany({
      orderBy: (r, { asc }) => [asc(r.name)],
    });
    res.json(reasons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/exit-reasons
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [reason] = await db
      .insert(exitReasonsTable)
      .values({ name, isSystem: false, isActive: true })
      .returning();
    res.status(201).json(reason);
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "السبب مستخدم مسبقاً" }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/exit-reasons/:id/toggle
router.patch("/:id/toggle", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const current = await db.query.exitReasonsTable.findFirst({ where: eq(exitReasonsTable.id, id) });
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    if (current.isSystem) { res.status(400).json({ error: "لا يمكن تعطيل الأسباب الافتراضية للنظام" }); return; }
    const [updated] = await db
      .update(exitReasonsTable)
      .set({ isActive: !current.isActive })
      .where(eq(exitReasonsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
