import { Router } from "express";
import { db, recipientsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
