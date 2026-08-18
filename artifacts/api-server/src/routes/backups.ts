import { Router } from "express";
import { auditLog } from "../middlewares/audit";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  applyRestore,
  consumePreview,
  createFullBackup,
  createPreview,
  createRestorePoint,
  decodePackage,
  getRestorePoint,
  packageBufferToBase64,
  packageSummary,
  rollbackRestorePoint,
  serverRestorePointPassword,
  type RestoreMode,
} from "../lib/backup-service";

const router = Router();

function modeOf(value: unknown): RestoreMode {
  if (value === "full" || value === "merge") return value;
  throw new Error("يجب تحديد نمط الاستعادة full أو merge");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "تعذر معالجة حزمة النسخ";
}

// POST /api/backups/export — creates the canonical encrypted .dme-sync package.
router.post("/export", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (password.length < 8) {
      res.status(400).json({ error: "كلمة مرور الحزمة مطلوبة (8 أحرف على الأقل)" });
      return;
    }
    const buffer = await createFullBackup(password);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="damascus-${date}.dme-sync"`);
    res.send(buffer);
    await auditLog({ req, action: "backup_package_export", entityType: "backup", details: { bytes: buffer.length } });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.post("/inspect", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const pkg = decodePackage(String(req.body?.packageBase64 ?? ""), String(req.body?.password ?? ""));
    res.json(packageSummary(pkg));
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.post("/dry-run", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const mode = modeOf(req.body?.mode);
    const pkg = decodePackage(String(req.body?.packageBase64 ?? ""), String(req.body?.password ?? ""));
    const preview = await createPreview(pkg, mode);
    res.json(preview);
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.post("/restore", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    if (req.body?.confirm !== true) {
      res.status(400).json({ error: "يجب تأكيد الاستعادة بعد المعاينة بإرسال confirm=true" });
      return;
    }
    const mode = modeOf(req.body?.mode);
    const pkg = decodePackage(String(req.body?.packageBase64 ?? ""), String(req.body?.password ?? ""));
    await consumePreview(String(req.body?.previewToken ?? ""), pkg.packageHash, mode);
    const beforeRestore = await createFullBackup(serverRestorePointPassword());
    const userId = Number(req.session.userId);
    const report = await applyRestore(pkg, mode);
    const restorePointId = await createRestorePoint(Number.isInteger(userId) ? userId : null, beforeRestore, report);
    await auditLog({
      req,
      action: "backup_package_restore",
      entityType: "backup",
      details: { restorePointId, mode, packageHash: report.packageHash, counts: report.counts },
    });
    res.json({ ...report, restorePointId });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

router.get("/:restorePointId/report", requireAuth, requireRole("admin"), async (req, res) => {
  const restorePointId = String(req.params.restorePointId);
  const point = await getRestorePoint(restorePointId);
  if (!point) {
    res.status(404).json({ error: "نقطة الاستعادة غير موجودة" });
    return;
  }
  res.json({
    id: point.id,
    packageHash: point.packageHash,
    status: point.status,
    createdBy: point.createdBy,
    createdAt: point.createdAt,
    rolledBackAt: point.rolledBackAt,
    summary: point.summary,
  });
});

router.post("/:restorePointId/rollback", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    if (req.body?.confirm !== true) {
      res.status(400).json({ error: "يجب إرسال confirm=true لتأكيد التراجع" });
      return;
    }
    const restorePointId = String(req.params.restorePointId);
    const report = await rollbackRestorePoint(restorePointId);
    await auditLog({
      req,
      action: "backup_restore_rollback",
      entityType: "backup",
      details: { restorePointId, counts: report.counts },
    });
    res.json({ ...report, restorePointId });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

export default router;