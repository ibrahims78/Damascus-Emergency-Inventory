# Damascus Emergency Inventory — Android v2.0.0

هذه نسخة Android offline كاملة لتطبيق إدارة مستودع الإسعاف والطوارئ، مبنية من آخر نسخة على الفرع `main`.

## تفاصيل الإصدار

- **Version name:** `2.0.0`
- **Version code:** `200`
- **Application ID:** `syrian.emergency.inventory`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز

## التشغيل

ثبّت ملف `Damascus-Emergency-Inventory-v2.0.0-offline.apk` على جهاز Android. لا يحتاج التطبيق إلى API أو PostgreSQL أو اتصال بخادم خارجي. عند التشغيل الأول أنشئ حساب المدير من شاشة الإعداد، ثم استخدم التطبيق محلياً.

## المطابقة

تم بناء واجهة Android من نفس مصدر واجهة الويب الحالية مع `VITE_OFFLINE_MODE=1`. لذلك ملفات الواجهة والمكونات المرئية هي نفسها، بينما تعمل البيانات محلياً داخل الجهاز عند عدم الاتصال.

## إعادة البناء

من جذر المشروع:

```bash
pnpm install --frozen-lockfile
pnpm run build:android:offline
```

ملف `SHA256SUMS` يثبت سلامة ملف APK بعد نقله أو تنزيله.