import { Router } from "express";
import { db, exitReasonsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

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
router.post("/", requireAuth, requireRole("admin", "warehouse_manager"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [reason] = await db
      .insert(exitReasonsTable)
      .values({ name })
      .returning();
    res.status(201).json(reason);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
