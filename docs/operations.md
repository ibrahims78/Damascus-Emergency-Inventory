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

النسخ الاحتياطي الكامل محمي بدور `admin`:

- `GET /api/backup/info` يعرض أعداد السجلات.
- `GET /api/backup/export` ينزّل JSON يحتوي على نسخة البيانات.
- `POST /api/backup/restore` يستعيد البيانات بشكل ذري عند إرسال
  `{"version":"2.0","confirm":true,"data":{...}}`.

تُستبعد كلمات مرور المستخدمين من النسخة الاحتياطية؛ لذلك لا تستعيد العملية
حسابات المستخدمين، بل تبقي حسابات البيئة الحالية. احتفظ بالنسخة خارج مساحة
العمل، واختبر استعادتها في قاعدة اختبار قبل استخدامها على الإنتاج.

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
