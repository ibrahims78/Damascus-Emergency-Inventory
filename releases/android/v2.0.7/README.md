# Damascus Emergency Inventory — Android v2.0.7

نسخة Android offline مبنية من الفرع `main`.

## تفاصيل الإصدار

- **Version name:** `2.0.7`
- **Version code:** `207`
- **Application ID:** `syrian.emergency.inventory`
- **Build type:** Release
- **Storage:** IndexedDB محلي داخل الجهاز

## الإصلاحات

- إصلاح بقاء زر `Dry Run` في حالة التحميل على بعض إصدارات Android WebView؛ لا تعود استجابة الفحص معلقة بانتظار عملية IndexedDB المساعدة.
- جعل تنظيف معاينة الاستعادة غير حاجب لنتيجة الاستعادة.
- حفظ المعاينة محلياً كنسخة استرداد عند توفر IndexedDB دون تعطيل واجهة المستخدم.
- استخدام شعار منظومة الإحالة والإسعاف والطوارئ كأيقونة Android بدلاً من الأيقونة الافتراضية.

## التحقق

ملف `SHA256SUMS` يثبت سلامة ملف APK بعد نقله أو تنزيله.
