import { Router } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable,
  itemsTable,
  equipmentTable,
  transactionsTable,
  recipientsTable,
  exitReasonsTable,
  usersTable,
  systemSettingsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// GET /api/backup/export — download full data backup as JSON (admin only)
router.get("/export", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const [
      categories,
      items,
      equipment,
      transactions,
      recipients,
      exitReasons,
      users,
      settings,
    ] = await Promise.all([
      db.select().from(categoriesTable),
      db.select().from(itemsTable),
      db.select().from(equipmentTable),
      db.select().from(transactionsTable),
      db.select().from(recipientsTable),
      db.select().from(exitReasonsTable),
      // Exclude password hashes from backup for security — restore requires re-hashing
      db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          fullName: usersTable.fullName,
          role: usersTable.role,
          isActive: usersTable.isActive,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable),
      db.select().from(systemSettingsTable),
    ]);

    const backup = {
      version: "1.0",
      system: "Damascus EMS Warehouse",
      exportedAt: new Date().toISOString(),
      counts: {
        categories: categories.length,
        items: items.length,
        equipment: equipment.length,
        transactions: transactions.length,
        recipients: recipients.length,
        exitReasons: exitReasons.length,
        users: users.length,
      },
      data: {
        categories,
        items,
        equipment,
        transactions,
        recipients,
        exitReasons,
        users,
        settings,
      },
    };

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `ems-warehouse-backup-${dateStr}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.json(backup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/backup/info — get backup metadata (counts of all tables)
router.get("/info", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const { sql } = await import("drizzle-orm");
    const [
      catCount,
      itemCount,
      equipCount,
      txCount,
      recCount,
      userCount,
    ] = await Promise.all([
      db.select({ c: sql<number>`count(*)` }).from(categoriesTable),
      db.select({ c: sql<number>`count(*)` }).from(itemsTable),
      db.select({ c: sql<number>`count(*)` }).from(equipmentTable),
      db.select({ c: sql<number>`count(*)` }).from(transactionsTable),
      db.select({ c: sql<number>`count(*)` }).from(recipientsTable),
      db.select({ c: sql<number>`count(*)` }).from(usersTable),
    ]);

    res.json({
      categories: Number(catCount[0]?.c ?? 0),
      items: Number(itemCount[0]?.c ?? 0),
      equipment: Number(equipCount[0]?.c ?? 0),
      transactions: Number(txCount[0]?.c ?? 0),
      recipients: Number(recCount[0]?.c ?? 0),
      users: Number(userCount[0]?.c ?? 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
