import { Router } from "express";
import { db, transactionsTable, itemsTable, equipmentTable, recipientsTable, exitReasonsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { auditLog } from "../middlewares/audit";
import { eq, and, or, ilike, gte, lte, sql } from "drizzle-orm";
import { systemSettingsTable } from "@workspace/db";

const router = Router();

async function generateDocumentNumber(type: "in" | "out" | "init" | "adjust"): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === "in" ? "IN" : type === "out" ? "OUT" : type === "adjust" ? "ADJ" : "INIT";
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(sql`extract(year from ${transactionsTable.createdAt}) = ${year} AND ${transactionsTable.type} = ${type}`);
  const seq = Number(result[0]?.count ?? 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

// GET /api/transactions
router.get("/", requireAuth, async (req, res) => {
  try {
    const {
      type,
      itemType,
      from,
      to,
      search,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (type) conditions.push(eq(transactionsTable.type, type as never));
    if (itemType) conditions.push(eq(transactionsTable.itemType, itemType as never));
    if (from) conditions.push(gte(transactionsTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(transactionsTable.createdAt, new Date(to)));
    if (search) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(transactionsTable.documentNumber, term),
          ilike(itemsTable.name, term),
          ilike(equipmentTable.name, term),
          ilike(transactionsTable.recipientNameSnap, term),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [transactions, totalResult] = await Promise.all([
      db
        .select({
          id: transactionsTable.id,
          type: transactionsTable.type,
          itemType: transactionsTable.itemType,
          itemId: transactionsTable.itemId,
          itemName: itemsTable.name,
          itemUnit: itemsTable.unit,
          equipmentId: transactionsTable.equipmentId,
          equipmentName: equipmentTable.name,
          quantity: transactionsTable.quantity,
          recipientId: transactionsTable.recipientId,
          recipientName: transactionsTable.recipientNameSnap,
          recipientPerson: transactionsTable.recipientPerson,
          exitReasonId: transactionsTable.exitReasonId,
          exitReason: transactionsTable.exitReasonSnap,
          documentNumber: transactionsTable.documentNumber,
          notes: transactionsTable.notes,
          createdByName: usersTable.fullName,
          createdAt: transactionsTable.createdAt,
        })
        .from(transactionsTable)
        .leftJoin(itemsTable, eq(transactionsTable.itemId, itemsTable.id))
        .leftJoin(equipmentTable, eq(transactionsTable.equipmentId, equipmentTable.id))
        .leftJoin(usersTable, eq(transactionsTable.createdBy, usersTable.id))
        .where(where)
        .orderBy(sql`${transactionsTable.createdAt} DESC`)
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(transactionsTable)
        .leftJoin(itemsTable, eq(transactionsTable.itemId, itemsTable.id))
        .leftJoin(equipmentTable, eq(transactionsTable.equipmentId, equipmentTable.id))
        .where(where),
    ]);

    res.json({
      transactions,
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/transactions/in
router.post(
  "/in",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const { itemType, itemId, equipmentId, quantity, supplier, notes } = req.body;
      const user = res.locals.user;

      if (!itemType || (itemType === "item" && !itemId) || (itemType === "equipment" && !equipmentId)) {
        res.status(400).json({ error: "itemType and itemId/equipmentId are required" });
        return;
      }
      if (itemType === "item" && (!quantity || quantity <= 0)) {
        res.status(400).json({ error: "quantity must be positive for item transactions" });
        return;
      }

      const documentNumber = await generateDocumentNumber("in");

      await db.transaction(async (tx) => {
        const [transaction] = await tx
          .insert(transactionsTable)
          .values({
            type: "in",
            itemType,
            itemId: itemId ? parseInt(itemId, 10) : null,
            equipmentId: equipmentId ? parseInt(equipmentId, 10) : null,
            quantity: quantity ? parseInt(quantity, 10) : null,
            documentNumber,
            notes: notes || null,
            createdBy: user.id,
          })
          .returning();

        if (itemType === "item" && itemId && quantity) {
          await tx
            .update(itemsTable)
            .set({
              currentStock: sql`${itemsTable.currentStock} + ${parseInt(quantity, 10)}`,
              updatedAt: new Date(),
            })
            .where(eq(itemsTable.id, parseInt(itemId, 10)));
        }

        await auditLog({ req, action: "in", entityType: "transaction", entityId: transaction.id, details: { documentNumber: transaction.documentNumber, itemType, quantity } });
        res.status(201).json(transaction);
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/transactions/out
router.post(
  "/out",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const {
        itemType,
        itemId,
        equipmentId,
        quantity,
        recipientId,
        recipientPerson,
        exitReasonId,
        notes,
      } = req.body;
      const user = res.locals.user;

      if (!itemType || (itemType === "item" && !itemId) || (itemType === "equipment" && !equipmentId)) {
        res.status(400).json({ error: "itemType and itemId/equipmentId are required" });
        return;
      }
      if (itemType === "item" && (!quantity || quantity <= 0)) {
        res.status(400).json({ error: "quantity must be positive" });
        return;
      }
      if (!recipientId) {
        res.status(400).json({ error: "الجهة المستلمة مطلوبة لعمليات الإخراج" });
        return;
      }
      if (!exitReasonId) {
        res.status(400).json({ error: "سبب الإخراج مطلوب لعمليات الإخراج" });
        return;
      }

      // Validate stock
      if (itemType === "item" && itemId && quantity) {
        const [item] = await db.select({ currentStock: itemsTable.currentStock }).from(itemsTable).where(eq(itemsTable.id, parseInt(itemId, 10)));
        if (!item || item.currentStock < parseInt(quantity, 10)) {
          res.status(400).json({ error: "Insufficient stock" });
          return;
        }
      }

      // Fetch snapshot names
      let recipientNameSnap: string | null = null;
      let exitReasonSnap: string | null = null;
      if (recipientId) {
        const r = await db.query.recipientsTable.findFirst({ where: (r, { eq: eqFn }) => eqFn(r.id, parseInt(recipientId, 10)) });
        recipientNameSnap = r?.name ?? null;
      }
      if (exitReasonId) {
        const er = await db.query.exitReasonsTable.findFirst({ where: (er, { eq: eqFn }) => eqFn(er.id, parseInt(exitReasonId, 10)) });
        exitReasonSnap = er?.name ?? null;
      }

      const documentNumber = await generateDocumentNumber("out");

      await db.transaction(async (tx) => {
        const [transaction] = await tx
          .insert(transactionsTable)
          .values({
            type: "out",
            itemType,
            itemId: itemId ? parseInt(itemId, 10) : null,
            equipmentId: equipmentId ? parseInt(equipmentId, 10) : null,
            quantity: quantity ? parseInt(quantity, 10) : null,
            recipientId: recipientId ? parseInt(recipientId, 10) : null,
            recipientNameSnap,
            recipientPerson: recipientPerson || null,
            exitReasonId: exitReasonId ? parseInt(exitReasonId, 10) : null,
            exitReasonSnap,
            documentNumber,
            notes: notes || null,
            createdBy: user.id,
          })
          .returning();

        if (itemType === "item" && itemId && quantity) {
          await tx
            .update(itemsTable)
            .set({
              currentStock: sql`${itemsTable.currentStock} - ${parseInt(quantity, 10)}`,
              updatedAt: new Date(),
            })
            .where(eq(itemsTable.id, parseInt(itemId, 10)));
        }

        if (itemType === "equipment" && equipmentId) {
          await tx
            .update(equipmentTable)
            .set({ condition: "consumed", updatedAt: new Date() })
            .where(eq(equipmentTable.id, parseInt(equipmentId, 10)));
        }

        await auditLog({ req, action: "out", entityType: "transaction", entityId: transaction.id, details: { documentNumber: transaction.documentNumber, itemType, quantity } });
        res.status(201).json(transaction);
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/transactions/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [transaction] = await db
      .select({
        id: transactionsTable.id,
        type: transactionsTable.type,
        itemType: transactionsTable.itemType,
        itemId: transactionsTable.itemId,
        itemName: itemsTable.name,
        itemUnit: itemsTable.unit,
        equipmentId: transactionsTable.equipmentId,
        equipmentName: equipmentTable.name,
        quantity: transactionsTable.quantity,
        recipientId: transactionsTable.recipientId,
        recipientName: transactionsTable.recipientNameSnap,
        recipientPerson: transactionsTable.recipientPerson,
        exitReasonId: transactionsTable.exitReasonId,
        exitReason: transactionsTable.exitReasonSnap,
        documentNumber: transactionsTable.documentNumber,
        notes: transactionsTable.notes,
        createdByName: usersTable.fullName,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(itemsTable, eq(transactionsTable.itemId, itemsTable.id))
      .leftJoin(equipmentTable, eq(transactionsTable.equipmentId, equipmentTable.id))
      .leftJoin(usersTable, eq(transactionsTable.createdBy, usersTable.id))
      .where(eq(transactionsTable.id, id));

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/transactions/adjust
router.post(
  "/adjust",
  requireAuth,
  requireRole("admin", "warehouse_manager"),
  async (req, res) => {
    try {
      const { itemId, newStock, reason, notes } = req.body;
      const user = res.locals.user;

      if (!itemId) {
        res.status(400).json({ error: "itemId is required" });
        return;
      }
      if (newStock === undefined || newStock === null || newStock === "") {
        res.status(400).json({ error: "newStock is required" });
        return;
      }
      const newStockNum = parseInt(newStock, 10);
      if (isNaN(newStockNum) || newStockNum < 0) {
        res.status(400).json({ error: "newStock must be a non-negative number" });
        return;
      }
      if (!reason || !String(reason).trim()) {
        res.status(400).json({ error: "reason is required" });
        return;
      }

      const itemIdNum = parseInt(itemId, 10);
      const [item] = await db
        .select({ currentStock: itemsTable.currentStock, name: itemsTable.name })
        .from(itemsTable)
        .where(eq(itemsTable.id, itemIdNum));

      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      const previousStock = item.currentStock;
      const delta = newStockNum - previousStock;
      const documentNumber = await generateDocumentNumber("adjust");

      const fullNotes = [
        `تسوية جرد — السبب: ${String(reason).trim()}`,
        `الكمية قبل: ${previousStock}، الكمية بعد: ${newStockNum}، الفرق: ${delta >= 0 ? "+" : ""}${delta}`,
        notes ? `ملاحظات: ${notes}` : null,
      ]
        .filter(Boolean)
        .join(". ");

      await db.transaction(async (tx) => {
        const [transaction] = await tx
          .insert(transactionsTable)
          .values({
            type: "adjust" as never,
            itemType: "item",
            itemId: itemIdNum,
            quantity: delta,
            documentNumber,
            notes: fullNotes,
            createdBy: user.id,
          })
          .returning();

        await tx
          .update(itemsTable)
          .set({ currentStock: newStockNum, updatedAt: new Date() })
          .where(eq(itemsTable.id, itemIdNum));

        await auditLog({
          req,
          action: "adjust",
          entityType: "transaction",
          entityId: transaction.id,
          details: { documentNumber, itemId: itemIdNum, itemName: item.name, previousStock, newStock: newStockNum, delta },
        });

        res.status(201).json(transaction);
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/transactions/:id/print
router.get("/:id/print", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [transaction] = await db
      .select({
        id: transactionsTable.id,
        type: transactionsTable.type,
        itemType: transactionsTable.itemType,
        itemId: transactionsTable.itemId,
        itemName: itemsTable.name,
        itemUnit: itemsTable.unit,
        equipmentId: transactionsTable.equipmentId,
        equipmentName: equipmentTable.name,
        quantity: transactionsTable.quantity,
        recipientId: transactionsTable.recipientId,
        recipientName: transactionsTable.recipientNameSnap,
        recipientPerson: transactionsTable.recipientPerson,
        exitReasonId: transactionsTable.exitReasonId,
        exitReason: transactionsTable.exitReasonSnap,
        documentNumber: transactionsTable.documentNumber,
        notes: transactionsTable.notes,
        createdByName: usersTable.fullName,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(itemsTable, eq(transactionsTable.itemId, itemsTable.id))
      .leftJoin(equipmentTable, eq(transactionsTable.equipmentId, equipmentTable.id))
      .leftJoin(usersTable, eq(transactionsTable.createdBy, usersTable.id))
      .where(eq(transactionsTable.id, id));

    if (!transaction) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    const settings = await db.query.systemSettingsTable.findFirst();
    const organizationName = settings?.orgName ?? "مديرية الاحالة والاسعاف والطوارئ - دمشق";
    res.json({
      transaction,
      organizationName,
      orgSubtitle: settings?.orgSubtitle ?? null,
      printedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
