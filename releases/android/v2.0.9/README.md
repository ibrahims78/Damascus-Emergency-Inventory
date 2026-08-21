# Damascus Emergency Inventory — Android v2.0.9

نسخة Android Offline مبنية من الفرع `main` وتتضمن إصلاحات استعادة النسخ الاحتياطية الأخيرة.

## تفاصيل الإصدار

- **Version name:** `2.0.9`
- **Version code:** `209`
- **Application ID:** `syrian.emergency.inventory`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز
- **Icon:** شعار منظومة الإحالة والإسعاف والطوارئ

## الإصلاحات

- معالجة توقف استعادة ملفات `.dme-sync` داخل Android WebView عند تعذر تشغيل Module Web Worker.
- إضافة fallback مباشر عند فشل العامل أو تأخره، لمنع بقاء صفحة الاستعادة في حالة التحميل.
- الإبقاء على فحص الحزمة المشفرة وتحقق كلمة المرور وسلامة البيانات.
- تحديث الإصدار إلى `2.0.9` مع شعار المنظومة كأيقونة للتطبيق.

## التحقق

استخدم ملف `SHA256SUMS` للتحقق من سلامة APK بعد تنزيله أو نقله.
