# Damascus Emergency Inventory — Android v2.0.8

نسخة Android Offline مبنية من الفرع `main`.

## تفاصيل الإصدار

- **Version name:** `2.0.8`
- **Version code:** `208`
- **Application ID:** `syrian.emergency.inventory`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز

## الإصلاحات

- نقل فك تشفير وضغط حزم `.dme-sync` إلى Web Worker حتى لا يتوقف خيط واجهة Android أثناء فحص النسخة الاحتياطية.
- إصلاح بقاء زر `Dry Run` في حالة التحميل عند استعادة ملفات النسخ الكبيرة أو عند بطء WebView/IndexedDB.
- تحديث أيقونة التطبيق في جميع كثافات Android لاستخدام شعار منظومة الإحالة والإسعاف والطوارئ.

## التحقق

ملف `SHA256SUMS` يثبت سلامة ملف APK بعد نقله أو تنزيله.
