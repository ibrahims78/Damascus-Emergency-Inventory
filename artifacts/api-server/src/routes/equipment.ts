import { Router } from "express";
import { db, equipmentTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq, and, ilike, sql, isNotNull } from "drizzle-orm";

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

// POST /api/equipment/bulk-import
router.post(
  "/bulk-import",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "يجب إرسال قائمة تجهيزات صالحة" });
        return;
      }
      if (items.length > 1000) {
        res.status(400).json({ error: "الحد الأقصى للاستيراد 1000 صف في المرة الواحدة" });
        return;
      }

      const VALID_CONDITIONS = new Set(["good", "maintenance", "broken", "consumed", "needs_inspection"]);
      const CONDITION_MAP: Record<string, string> = {
        "جيدة": "good", "جيد": "good",
        "في الصيانة": "maintenance", "صيانة": "maintenance",
        "معطلة": "broken", "معطل": "broken",
        "مستهلكة": "consumed", "مستهلك": "consumed",
        "تحتاج فحص": "needs_inspection", "يحتاج فحص": "needs_inspection",
      };

      const mode = (req.query.mode as string) === "upsert" ? "upsert" : "insert";

      // In upsert mode, pre-fetch existing serial numbers for insert-vs-update tracking
      const existingSerials = new Set<string>();
      if (mode === "upsert") {
        const existing = await db
          .select({ serialNumber: equipmentTable.serialNumber })
          .from(equipmentTable)
          .where(isNotNull(equipmentTable.serialNumber));
        existing.forEach((r) => { if (r.serialNumber) existingSerials.add(r.serialNumber); });
      }

      const results: {
        created: number;
        updated: number;
        errors: { row: number; name: string; error: string }[];
      } = { created: 0, updated: 0, errors: [] };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 2;
        const name = String(item.name ?? "").trim();

        if (!name) {
          results.errors.push({ row: rowNum, name: `صف ${rowNum}`, error: "الاسم مطلوب" });
          continue;
        }

        // Resolve condition: accept Arabic label or English key
        let condition = String(item.condition ?? "good").trim();
        if (!VALID_CONDITIONS.has(condition)) {
          condition = CONDITION_MAP[condition] ?? "good";
        }

        const manufactureYear = item.manufactureYear
          ? parseInt(String(item.manufactureYear), 10)
          : null;
        if (item.manufactureYear && (isNaN(manufactureYear!) || manufactureYear! < 1900 || manufactureYear! > 2100)) {
          results.errors.push({ row: rowNum, name, error: "سنة الصنع غير صالحة" });
          continue;
        }

        const serialNumber = item.serialNumber ? String(item.serialNumber).trim() : null;
        const isUpdate = mode === "upsert" && serialNumber !== null && existingSerials.has(serialNumber);

        const values = {
          name,
          equipmentType: item.equipmentType ? String(item.equipmentType).trim() : null,
          model: item.model ? String(item.model).trim() : null,
          serialNumber,
          condition: condition as "good" | "maintenance" | "broken" | "consumed" | "needs_inspection",
          manufactureYear,
          originCountry: item.originCountry ? String(item.originCountry).trim() : null,
          currentHolder: item.currentHolder ? String(item.currentHolder).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null,
        };

        try {
          if (mode === "upsert" && serialNumber !== null) {
            // Upsert: update all fields when serial number already exists
            await db
              .insert(equipmentTable)
              .values(values)
              .onConflictDoUpdate({
                target: equipmentTable.serialNumber,
                set: {
                  name: values.name,
                  equipmentType: values.equipmentType,
                  model: values.model,
                  condition: values.condition,
                  manufactureYear: values.manufactureYear,
                  originCountry: values.originCountry,
                  currentHolder: values.currentHolder,
                  notes: values.notes,
                },
              });
            if (isUpdate) {
              results.updated++;
            } else {
              results.created++;
            }
          } else {
            // Insert-only mode
            await db.insert(equipmentTable).values(values);
            results.created++;
          }
        } catch (err: unknown) {
          const e = err as { cause?: { code?: string }; code?: string };
          const isDuplicate = e?.cause?.code === "23505" || e?.code === "23505";
          results.errors.push({
            row: rowNum,
            name,
            error: isDuplicate ? "الرقم التسلسلي مستخدم مسبقاً — استخدم وضع «تحديث وإضافة» لتحديثه" : "خطأ في الإدراج",
          });
        }
      }

      res.json(results);
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
