# Damascus Emergency Inventory Desktop — Version 1

هذا الإصدار هو نسخة سطح مكتب من تطبيق **نظام مستودع الإسعاف**. يعيد استخدام نفس واجهة الويب المبنية من المشروع الحالي، ويشغّل خادمًا محليًا داخل Electron لتمرير طلبات `/api` إلى خادم الـAPI نفسه، لذلك تبقى المسارات والميزات وسلوك تسجيل الدخول مطابقًا للتطبيق الأصلي.

## المتطلبات

- Node.js 20 أو أحدث
- pnpm 10 أو أحدث
- خادم API يعمل ويمكن الوصول إليه
- قاعدة البيانات و`SESSION_SECRET` كما هو موضح في إعداد المشروع الأصلي

## تشغيل الإصدار من المصدر

من جذر المستودع:

```bash
cd releases/v1
pnpm install
export DAMASCUS_API_URL=http://127.0.0.1:8080
pnpm run dev
```

في Windows PowerShell:

```powershell
cd releases/v1
pnpm install
$env:DAMASCUS_API_URL = "http://127.0.0.1:8080"
pnpm run dev
```

إذا كان الـAPI منشورًا على خادم آخر، ضع عنوانه في `DAMASCUS_API_URL`. يجب أن يكون العنوان هو أصل الخادم فقط، مثل `https://example.com`، وليس مسار `/api`.

## إنشاء حزمة سطح المكتب

```bash
pnpm run package
```

ينشئ Electron Builder حزمًا حسب نظام التشغيل الذي يتم البناء عليه. لإنشاء مجلد تشغيل غير مثبت أولًا:

```bash
pnpm run package:dir
```

## ملاحظات الإصدار

- رقم الإصدار: `1.0.0`
- المصدر: واجهة `artifacts/web` وواجهة API `artifacts/api-server` من نفس المستودع.
- لا توجد نسخة واجهة منفصلة مكتوبة يدويًا؛ أمر `prepare-web` يبني الواجهة الحالية وينسخها إلى الحزمة.
- لا يحتوي هذا الإصدار على أسرار أو رموز وصول. يتم تمرير عنوان الـAPI من خلال `DAMASCUS_API_URL`.