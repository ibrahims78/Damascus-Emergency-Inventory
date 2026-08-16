# Damascus Emergency Inventory — Android v1.0.3

هذه نسخة Android offline كاملة لتطبيق إدارة مستودع الإسعاف والطوارئ.

## تفاصيل الإصدار

- **Version name:** `1.0.3`
- **Version code:** `103`
- **Application ID:** `syrian.emergency.inventory`
- **Min SDK:** `23`
- **Target/compile SDK:** `35`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز

## التشغيل

ثبّت ملف `Damascus-Emergency-Inventory-v1.0.3-offline.apk` على جهاز Android. لا يحتاج التطبيق إلى API أو PostgreSQL أو اتصال بخادم خارجي. عند التشغيل الأول أنشئ حساب المدير من شاشة الإعداد، ثم استخدم التطبيق محلياً.

## التحقق

تم التحقق من:

- نجاح `assembleRelease`
- رقم الحزمة والنسخة عبر Android `aapt`
- توقيع APK عبر `apksigner`
- وجود الواجهة وطبقة offline داخل `assets/public`
- عدم تضمين عنوان API خارجي في حزمة التطبيق

لإعادة بناء الإصدار من جذر المشروع:

```bash
pnpm install --frozen-lockfile
pnpm run build:android:offline
```

ملف `SHA256SUMS` يثبت سلامة ملف APK بعد نقله أو تنزيله.