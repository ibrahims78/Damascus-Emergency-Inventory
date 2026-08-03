import { Router } from "express";
import { db } from "@workspace/db";
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

export default router;
