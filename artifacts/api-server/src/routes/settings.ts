import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, systemSettingsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateSettings() {
  let settings = await db.query.systemSettingsTable.findFirst();
  if (!settings) {
    const [created] = await db.insert(systemSettingsTable).values({}).returning();
    settings = created;
  }
  return settings;
}

// GET /api/settings
router.get("/", requireAuth, async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/settings
router.put("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { orgName, orgSubtitle, expiryAlertDays } = req.body;
    const settings = await getOrCreateSettings();
    const [updated] = await db
      .update(systemSettingsTable)
      .set({
        ...(orgName !== undefined && { orgName }),
        ...(orgSubtitle !== undefined && { orgSubtitle }),
        ...(expiryAlertDays !== undefined && { expiryAlertDays: Number(expiryAlertDays) }),
        updatedAt: new Date(),
      })
      .where(eq(systemSettingsTable.id, settings.id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/settings/change-password — authenticated user changes their own password
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const user = res.locals.user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" });
      return;
    }
    // Fetch full user with hash
    const fullUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, user.id),
    });
    if (!fullUser) { res.status(404).json({ error: "User not found" }); return; }
    const valid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
