# دليل التشغيل والنشر

## متطلبات التشغيل

- Node.js 20 أو أحدث و`pnpm 9+`.
- PostgreSQL مع `DATABASE_URL`.
- `SESSION_SECRET` محفوظ في Secrets، ولا يوضع في ملفات المشروع.
- تشغيل خدمتي API والواجهة من خلال workflows ريبليت:
  - `artifacts/api-server: API Server`
  - `artifacts/web: web`

## تشغيل بيئة التطوير

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm run typecheck
pnpm run build
```

للتشغيل اليدوي:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/web run dev
```

يجب أن يستمع API على `PORT` (8080 في إعدادات ريبليت الحالية)، وتبقى طلبات
الواجهة نسبية إلى `/api` حتى تعمل من خلال المعاينة أو النشر.

## النشر

1. شغّل `pnpm run typecheck` و`pnpm run build`.
2. شغّل `pnpm --filter @workspace/scripts run phase8:acceptance` بينما API يعمل.
3. راجع إعدادات `DATABASE_URL` و`SESSION_SECRET` في بيئة النشر.
4. نفّذ نشر ريبليت من نقطة تحقق ناجحة.
5. بعد النشر تحقّق من `GET /api/healthz` ومن تسجيل الدخول والتقارير.

لا تعتبر المعاينة المحلية بديلاً عن اعتماد مسؤول المستودع لقواعد الرصيد
والبيانات التشغيلية قبل فتح النظام للمستخدمين.

## النسخ الاحتياطي والاستعادة

النسخ الاحتياطي والاستعادة المعياريان محميان بدور `admin`:

- `GET /api/backup/info` يعرض أعداد السجلات.
- `POST /api/backups/export` مع `{"password":"..."}` ينزّل ملف
  `.dme-sync` مضغوطاً ومشفراً بـ`AES-256-GCM` ومحمياً بـ`HMAC-SHA-256`.
- `POST /api/backups/inspect` يفك الحزمة للتحقق ويعرض الـManifest دون تعديل القاعدة.
- `POST /api/backups/dry-run` مع `mode` يطبق الفحص البنيوي والمنطقي ويصدر
  `previewToken` صالحاً 15 دقيقة.
- `POST /api/backups/restore` يتطلب نفس الحزمة وكلمة المرور و`previewToken` و
  `confirm=true`؛ يدعم `mode: "merge"` و`mode: "full"`.
- `GET /api/backups/:restorePointId/report` يعرض تقرير الاستعادة.
- `POST /api/backups/:restorePointId/rollback` مع `confirm=true` يعيد نقطة ما قبل
  الاستعادة داخل معاملة كاملة.

تستبعد الحزمة كلمات مرور المستخدمين والجلسات والأسرار، ولا تستعيد حسابات المستخدمين؛
تبقى حسابات البيئة الحالية. استخدم كلمة مرور حزمة مستقلة، واحفظها خارج الملف.
لا تعتمد `full` على الإنتاج قبل مراجعة المعاينة واختبار الحزمة في قاعدة اختبار.

يبقى `GET /api/backup/export` و`POST /api/backup/restore` للتوافق مع الصيغة القديمة
فقط؛ لا تستخدمهما لإنشاء حزم جديدة. الصيغة الجديدة هي المرجع التشغيلي.

## التراجع

للتراجع عن إصدار منشور، استخدم Checkpoints/نسخة النشر السابقة في ريبليت،
ثم راجع توافق مخطط قاعدة البيانات. لا تستبدل مخطط PostgreSQL يدوياً ولا تطبق
نسخة احتياطية على الإنتاج دون موافقة مسؤول البيانات؛ الاستعادة عملية merge
بـ`onConflictDoNothing` وليست حذفاً شاملاً.

## مؤشرات الفشل والتدقيق

- فشل الحركة يعيد HTTP بخطأ واضح ويسجل `movement_failed` بعد التراجع.
- نجاح الحركة يسجل `movement_created`.
- تصدير واستعادة النسخة يسجلان `backup_export` و`backup_restore`.
- سجل التدقيق للمدير فقط، وهو للقراءة والتصدير ولا يعدل السجلات السابقة.
- تسجل العمليات الجديدة `backup_package_export` و`backup_package_restore` و
  `backup_restore_rollback` مع بصمة الحزمة والنتيجة دون حفظ كلمة المرور.

## اختبار المرحلة 4–5

```bash
pnpm --filter @workspace/scripts run phase45:backup-recovery
pnpm --filter @workspace/scripts run phase45:db-smoke
```

تختبر الأوامر دورة الحزمة، التحقق من العبث وكلمة المرور الخاطئة والحزمة الناقصة
والحقول الحساسة، ثم الدمج idempotently ورفض الرصيد السالب والتنظيف التلقائي لبيانات
الاختبار.
