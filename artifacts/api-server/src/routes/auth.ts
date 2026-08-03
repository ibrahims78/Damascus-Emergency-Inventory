import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/auth/setup-status
router.get("/setup-status", async (_req, res) => {
  try {
    const admin = await db.query.usersTable.findFirst({
      where: (u, { eq }) => eq(u.role, "admin"),
      columns: { id: true },
    });
    res.json({ needsSetup: !admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/setup
router.post("/setup", async (req, res) => {
  try {
    // Only allowed if no admin exists
    const existing = await db.query.usersTable.findFirst({
      where: (u, { eq }) => eq(u.role, "admin"),
      columns: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Admin already exists" });
      return;
    }
    const { username, password, fullName } = req.body as {
      username?: string;
      password?: string;
      fullName?: string;
    };
    if (!username || !password || !fullName) {
      res.status(400).json({ error: "username, password, and fullName are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ username, passwordHash, fullName, role: "admin" })
      .returning();
    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username, fullName: user.fullName, role: user.role });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    const user = await db.query.usersTable.findFirst({
      where: (u, { eq, and }) => and(eq(u.username, username), eq(u.isActive, true)),
    });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.userId = user.id;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = res.locals.user;
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });
});

export default router;
