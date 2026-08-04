/**
 * Fills and enriches both test Excel files for comprehensive app testing.
 * Run: node scripts/fix-test-data.mjs
 *
 * Today = 2026-08-04
 * Expiry scenarios:
 *   EXPIRED         → before 2026-08-04
 *   VERY NEAR (≤7d) → 2026-08-05 … 2026-08-11
 *   NEAR (8–30d)    → 2026-08-12 … 2026-09-03
 *   FUTURE          → after 2026-09-03
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const XLSX = require(path.join(__dirname, '../node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx/xlsx.js'));

// ─────────────────────────────────────────────────────────────────────────────
// ITEMS FILE
// ─────────────────────────────────────────────────────────────────────────────
const itemsWb = XLSX.readFile('./attached_assets/بيانات_اختبار_100_مادة.xlsx');
const itemsWsName = itemsWb.SheetNames[0];
const itemsData = XLSX.utils.sheet_to_json(itemsWb.Sheets[itemsWsName], { defval: '' });

// Map by رمز for clean targeting
const byCode = {};
itemsData.forEach((r, i) => { byCode[r['الرمز']] = i; });
const it = (code) => itemsData[byCode[code]]; // helper

// ── 1. QUANTITIES — vary naturally + low-stock triggers ──────────────────────
// Normal spread for all items first (overrides the flat 20)
const naturalQty = [
  // ثوابت (TH-001..010) — equipment, quantity is unit count
  18, 9, 14, 11, 16, 20, 8, 12, 15, 7,
  // مستهلكات طبية (MT-001..035)
  3,  18, 17, 20, 2,  15, 22, 25, 14, 12,
  4,  19, 8,  16, 23, 11, 20, 17, 1,  24,
  5,  18, 12, 0,  16, 1,  20, 22, 0,  13,
  17, 9,  11, 20, 6,
  // مستهلكات منوعة (MM-001..030)
  2,  24, 20, 18, 0,  15, 22, 0,  16, 12,
  1,  9,  3,  20, 17, 11, 23, 18, 0,  14,
  5,  20, 16, 1,  8,  22, 18, 15, 12, 0,
  // تجهيزات (TJ-001..025)
  1,  16, 18, 14, 20, 9,  3,  0,  11, 15,
  7,  20, 2,  17, 13, 8,  22, 19, 16, 12,
  5,  14, 18, 11, 20,
];
naturalQty.forEach((qty, i) => {
  itemsData[i]['الكمية الحالية'] = qty;
});

// ── 2. EXPIRY DATES — strategic scenarios ────────────────────────────────────
// EXPIRED (before 2026-08-04)
it('MT-008')['تاريخ الانتهاء'] = '2026-06-15';   // أنبوب تنفس أكسجين — انتهى
it('MT-012')['تاريخ الانتهاء'] = '2026-05-20';   // خيط جراحي — انتهى منذ شهرين
it('MT-024')['تاريخ الانتهاء'] = '2026-07-01';   // شريط قياس جلوكوز — انتهى الشهر الماضي
it('MT-029')['تاريخ الانتهاء'] = '2026-08-02';   // كيس دم — انتهى قبل يومين
it('MM-003')['تاريخ الانتهاء'] = '2026-04-30';   // مطهر بيتادين — انتهى منذ 3 أشهر
it('MM-012')['تاريخ الانتهاء'] = '2026-07-20';   // محلول رينغر — انتهى
it('MM-018')['تاريخ الانتهاء'] = '2026-07-31';   // سائل تعقيم — انتهى الأسبوع الماضي
it('MT-017')['تاريخ الانتهاء'] = '2026-06-30';   // طقم تعقيم جراحي — انتهى

// VERY NEAR (≤7 days: 2026-08-05 to 2026-08-11)
it('MT-001')['تاريخ الانتهاء'] = '2026-08-06';   // شاش طبي — بعد يومين!
it('MM-011')['تاريخ الانتهاء'] = '2026-08-08';   // محلول ملحي — بعد 4 أيام
it('MT-019')['تاريخ الانتهاء'] = '2026-08-10';   // جهاز ضخ محاليل — بعد 6 أيام
it('MM-002')['تاريخ الانتهاء'] = '2026-08-07';   // كحول إيثيلي — بعد 3 أيام
it('MT-035')['تاريخ الانتهاء'] = '2026-08-09';   // لسان الاضطرار — بعد 5 أيام

// NEAR EXPIRY (8–30 days: 2026-08-12 to 2026-09-03)
it('MT-013')['تاريخ الانتهاء'] = '2026-08-20';   // لاصق طبي — 16 يوم
it('MM-004')['تاريخ الانتهاء'] = '2026-08-25';   // مطهر يد هيدروجيل — 21 يوم
it('MT-023')['تاريخ الانتهاء'] = '2026-09-01';   // قثطار وريدي — 28 يوم
it('MM-001')['تاريخ الانتهاء'] = '2026-08-15';   // صابون مطهر كلورهيكسيدين — 11 يوم
it('MT-032')['تاريخ الانتهاء'] = '2026-08-22';   // قناع CPR — 18 يوم
it('MM-015')['تاريخ الانتهاء'] = '2026-08-30';   // مناديل معقمة — 26 يوم

// ── 3. NOTES — fill missing 6 ────────────────────────────────────────────────
const notesFill = {
  'MT-005': 'حقن وريدي — التحقق من التاريخ قبل الاستخدام',
  'MT-015': 'للبالغين فقط — يُحفظ بعيداً عن الرطوبة',
  'MM-005': 'يُحفظ بعيداً عن الضوء المباشر والحرارة',
  'MM-022': 'للعناية بالجلد — خالٍ من العطور',
  'TJ-005': 'بطارية وكهرباء — يُشحن بعد كل استخدام',
  'TJ-009': 'للبالغين مع قناع أوجه كامل',
};
Object.entries(notesFill).forEach(([code, note]) => {
  if (it(code)) it(code)['ملاحظات'] = note;
});

// ── 4. Write items file ──────────────────────────────────────────────────────
const newItemsWs = XLSX.utils.json_to_sheet(itemsData, {
  header: ['الرمز','الاسم *','الوحدة *','التصنيف','الكمية الحالية','الحد الأدنى','تاريخ الانتهاء','رقم الدفعة','الموقع','المورد','ملاحظات'],
});
newItemsWs['!cols'] = [
  {wch:12},{wch:32},{wch:12},{wch:20},{wch:16},{wch:14},{wch:16},{wch:16},{wch:22},{wch:28},{wch:36},
];
// Keep instructions sheet as-is
const newItemsWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newItemsWb, newItemsWs, 'البيانات');
if (itemsWb.SheetNames[1]) {
  XLSX.utils.book_append_sheet(newItemsWb, itemsWb.Sheets[itemsWb.SheetNames[1]], itemsWb.SheetNames[1]);
}
XLSX.writeFile(newItemsWb, './بيانات_اختبار_100_مادة.xlsx');
console.log('✅ Items file written — 100 rows');

// Summary
const expired   = itemsData.filter(r => r['تاريخ الانتهاء'] && r['تاريخ الانتهاء'] < '2026-08-04').length;
const veryNear  = itemsData.filter(r => r['تاريخ الانتهاء'] >= '2026-08-04' && r['تاريخ الانتهاء'] <= '2026-08-11').length;
const near      = itemsData.filter(r => r['تاريخ الانتهاء'] >= '2026-08-12' && r['تاريخ الانتهاء'] <= '2026-09-03').length;
const lowStock  = itemsData.filter(r => Number(r['الكمية الحالية']) < Number(r['الحد الأدنى'])).length;
const zeroStock = itemsData.filter(r => Number(r['الكمية الحالية']) === 0).length;
console.log(`   Expired: ${expired} | Very near (≤7d): ${veryNear} | Near (8-30d): ${near}`);
console.log(`   Low stock (below min): ${lowStock} | Zero stock: ${zeroStock}`);

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT FILE
// ─────────────────────────────────────────────────────────────────────────────
const eqWb = XLSX.readFile('./attached_assets/بيانات_اختبار_60_تجهيزة.xlsx');
const eqWsName = eqWb.SheetNames[0];
const eqData = XLSX.utils.sheet_to_json(eqWb.Sheets[eqWsName], { defval: '' });

// ── Fill all 36 empty notes ──────────────────────────────────────────────────
// index → note (0-based, matching the output we read earlier)
const eqNotes = {
  1:  'وحدتان احتياطيتان — بطارية مشحونة بالكامل',
  5:  'طراز مخصص للنقل في سيارات الإسعاف',
  6:  'قوة شفط 300 ملم/زئبق — فلتر بكتيري مدمج',
  7:  'وحدة احتياطية جاهزة للتشغيل الفوري',
  9:  'مجموعة ريشات 3 مقاسات (صغير/متوسط/كبير)',
  10: 'مجموعة ريشات بديلة مرفقة',
  11: 'للبالغين — صمام إيجابي-سلبي مزدوج',
  12: 'للأطفال — حجم 450 مل',
  16: 'شاشة 12 بوصة — بطارية 8 ساعات',
  18: 'بطارية مشحونة — سُجّل في سجل الصيانة',
  19: 'مزود بذاكرة لآخر 60 قراءة',
  20: 'مع سوار قياس للمريض المضطجع',
  21: 'شاشة رقمية كبيرة — صوت إنذار',
  22: 'نتائج خلال 5 ثوانٍ — دقة ±2%',
  25: 'ميزان حرارة مزدوج أذن/جبهة',
  26: 'ذاكرة 100 قراءة — خيار البلوتوث',
  28: 'مع 4 أحزمة ثبيت قابلة للغسيل',
  30: 'قابل للطي في 3 ثوانٍ — خفيف الوزن',
  31: 'يُستخدم للطوابق الضيقة والأدراج',
  33: 'مقاس 76×40 سم — مع مقابض جانبية',
  36: 'مقاومة للماء — تحمل 40 لتر',
  37: 'بكل مستلزمات الإنعاش الأساسية',
  39: 'دقة ±2% — إنذار انتهاء الكيس',
  41: 'مع حساسات ECG، SpO2، NIBP جاهزة',
  42: 'نموذج قياسي يُغطي الرقبة والظهر العلوي',
  43: 'موديل للأطفال — مقاسات 00 إلى 2',
  44: 'سماعة طبية أمراض داخلية — معدنية ثقيلة',
  46: 'شاحن USB مرفق — وزن 98 غرام',
  48: 'جبائر SAM قابلة لإعادة التشكيل عدة مرات',
  49: 'مزود بمصباح LED و3 أوضاع إضاءة',
  50: 'مكبر + شريط LED أصفر للتحذير',
  52: 'بطارية تدوم 18 ساعة — شبكة UHF مشفرة',
  54: 'جهاز مستهلك — يلزم إصدار أمر إتلاف',
  55: 'محلول هيدروجيل ملطف — بدون كحول',
  56: 'درجة حرارة تعمل من 10 إلى 45 مئوية',
  57: 'رأس قابل للدوران 360 درجة',
};
Object.entries(eqNotes).forEach(([idx, note]) => {
  eqData[Number(idx)]['ملاحظات'] = note;
});

// ── Rename column headers to match the ImportEquipmentTab template ────────────
// File uses: النوع, الحالة *, المستخدم الحالي
// Template expects: نوع التجهيز, الحالة, الحائز الحالي
// We'll output with the template's headers so the file can be imported directly.
const renamedEqData = eqData.map(r => ({
  'الاسم *':        r['الاسم *'],
  'نوع التجهيز':    r['النوع'],
  'الموديل':        r['الموديل'],
  'الرقم التسلسلي': r['الرقم التسلسلي'],
  'الحالة':         r['الحالة *'],
  'سنة الصنع':      r['سنة الصنع'],
  'بلد المنشأ':     r['بلد المنشأ'],
  'الحائز الحالي':  r['المستخدم الحالي'],
  'ملاحظات':        r['ملاحظات'],
}));

// ── Verify all 5 conditions present ─────────────────────────────────────────
const condCount = {};
renamedEqData.forEach(r => { const c = r['الحالة']; condCount[c] = (condCount[c]||0)+1; });
console.log('\nEquipment condition distribution:', condCount);

// ── Write equipment file ─────────────────────────────────────────────────────
const newEqWs = XLSX.utils.json_to_sheet(renamedEqData, {
  header: ['الاسم *','نوع التجهيز','الموديل','الرقم التسلسلي','الحالة','سنة الصنع','بلد المنشأ','الحائز الحالي','ملاحظات'],
});
newEqWs['!cols'] = [
  {wch:36},{wch:22},{wch:24},{wch:20},{wch:16},{wch:12},{wch:18},{wch:26},{wch:44},
];

// Instructions sheet
const instrRows = [
  ['تعليمات الاستخدام — نموذج استيراد التجهيزات'],
  [],
  ['العمود','الوصف','مطلوب؟','ملاحظات'],
  ['الاسم *','اسم التجهيز أو الجهاز','نعم',''],
  ['نوع التجهيز','تصنيف التجهيز','لا','مثال: جهاز طوارئ، جهاز مراقبة، أثاث طبي'],
  ['الموديل','رقم الموديل أو الطراز','لا',''],
  ['الرقم التسلسلي','الرقم التسلسلي الفريد','لا','يجب أن يكون فريداً إذا أُدخل'],
  ['الحالة','حالة التجهيز الحالية','لا','القيم المقبولة: جيدة — في الصيانة — معطلة — مستهلكة — تحتاج فحص'],
  ['سنة الصنع','السنة الميلادية للتصنيع','لا','رقم بين 1900 و2100'],
  ['بلد المنشأ','بلد التصنيع','لا',''],
  ['الحائز الحالي','القسم أو الشخص المسؤول','لا',''],
  ['ملاحظات','أي ملاحظات إضافية','لا',''],
  [],
  ['توزيع بيانات الاختبار (60 تجهيزة):'],
  ['الحالة','العدد','الغرض من الاختبار'],
  ['جيدة',           String(condCount['جيدة']||0),          'الحالة الطبيعية — الأغلبية'],
  ['في الصيانة',     String(condCount['في الصيانة']||0),    'اختبار تتبع الأجهزة خارج الخدمة مؤقتاً'],
  ['تحتاج فحص',      String(condCount['تحتاج فحص']||0),     'اختبار التنبيهات والتحذيرات'],
  ['معطلة',          String(condCount['معطلة']||0),          'اختبار الأجهزة خارج الخدمة نهائياً'],
  ['مستهلكة',        String(condCount['مستهلكة']||0),        'اختبار إتلاف/شطب الأجهزة'],
];
const instrWs = XLSX.utils.aoa_to_sheet(instrRows);
instrWs['!cols'] = [{wch:18},{wch:10},{wch:40}];

const newEqWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newEqWb, newEqWs, 'البيانات');
XLSX.utils.book_append_sheet(newEqWb, instrWs, 'التعليمات');
XLSX.writeFile(newEqWb, './بيانات_اختبار_60_تجهيزة.xlsx');
console.log(`✅ Equipment file written — ${renamedEqData.length} rows`);
console.log('\nDone. Both files ready in the workspace root.');
