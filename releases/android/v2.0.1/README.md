# Damascus Emergency Inventory — Android v2.0.1

هذه نسخة Android offline كاملة لتطبيق إدارة مستودع الإسعاف والطوارئ، مبنية من الفرع `main`.

## تفاصيل الإصدار

- **Version name:** `2.0.1`
- **Version code:** `201`
- **Application ID:** `syrian.emergency.inventory`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز

## الإصلاحات

يتضمن هذا الإصدار إصلاح استعادة حزم `.dme-sync` المشفرة بعد الفحص والمعاينة، مع دعم إنشاء جداول المعاينة ونقاط التراجع في قواعد البيانات المحلية القديمة عند الحاجة.

## التشغيل

ثبّت ملف `Damascus-Emergency-Inventory-v2.0.1-offline.apk` على جهاز Android. لا يحتاج التطبيق إلى API أو PostgreSQL أو اتصال بخادم خارجي.

## إعادة البناء

من جذر المشروع:

```bash
pnpm install --frozen-lockfile
pnpm run build:android:offline
```

ملف `SHA256SUMS` يثبت سلامة ملف APK بعد نقله أو تنزيله.