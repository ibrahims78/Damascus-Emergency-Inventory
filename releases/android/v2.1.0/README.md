# Damascus Emergency Inventory — Android v2.1.0

نسخة Android Offline تتضمن الإصلاح الكامل لفحص واستعادة النسخ الاحتياطية المشفرة.

## تفاصيل الإصدار

- **Version name:** `2.1.0`
- **Version code:** `210`
- **Application ID:** `syrian.emergency.inventory`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز
- **Icon:** شعار منظومة الإحالة والإسعاف والطوارئ

## الإصلاحات

- إصلاح استخدام `scrypt-js` بحيث ينتظر Promise المفتاح المشتق بشكل صحيح.
- معالجة توقف Dry Run والاستعادة عند فحص ملفات `.dme-sync`.
- استخدام المسار المباشر في Android WebView وتجنب الاعتماد على Module Worker غير المدعوم باستمرار.
- إضافة fallback عند فشل العامل أو تأخره.
- تحديث الإصدار إلى `2.1.0`.

## التحقق

استخدم ملف `SHA256SUMS` للتحقق من سلامة APK بعد تنزيله أو نقله.
