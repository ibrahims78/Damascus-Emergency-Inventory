export function PlanDocument() {
  return (
    <div className="min-h-screen bg-gray-50 font-['Cairo'] text-right" dir="rtl">

      {/* Document Header */}
      <div className="bg-[#0D2137] text-white px-12 py-8 print:py-6">
        <div className="max-w-5xl mx-auto flex items-start justify-between">
          <div className="flex-1">
            <div className="text-xs text-[#12B5CC] mb-1 tracking-widest uppercase">وثيقة داخلية — سري</div>
            <h1 className="text-3xl font-bold mb-1">منظومة الإحالة والإسعاف والطوارئ بدمشق</h1>
            <h2 className="text-lg text-[#12B5CC] font-semibold mb-4">خطة عمل نظام إدارة المخازن والمستودعات</h2>
            <div className="flex gap-6 text-xs text-gray-300">
              <span>الإصدار: 1.0</span>
              <span>التاريخ: 3 آب 2026</span>
              <span>المُعدّ: إبراهيم الصيداوي</span>
              <span>📞 0933706403</span>
            </div>
          </div>
          <img src="/__mockup/images/logo.jpeg" alt="شعار المنظومة" className="w-24 h-24 rounded-xl border-2 border-[#12B5CC] object-cover ml-6" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-12 py-8">

        {/* Executive Summary */}
        <div className="bg-[#e8f7fa] border-r-4 border-[#0A8FA0] rounded-lg p-6 mb-8">
          <h3 className="text-[#0D2137] font-bold text-lg mb-2">الملخص التنفيذي</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            نظام رقمي متكامل لإدارة مستودعات منظومة الإحالة والإسعاف والطوارئ بدمشق، يهدف إلى استبدال نظام Excel الحالي بمنصة احترافية آمنة تُتيح تتبع المخزون بدقة عالية عبر أربع فئات رئيسية (الثوابت، المستهلكات الطبية، المستهلكات المنوعة، التجهيزات). يشمل النظام إدارة المستخدمين، التنبيهات الذكية، التقارير الشاملة، سجل التدقيق الكامل، والنسخ الاحتياطي التلقائي — كل ذلك بواجهة عربية احترافية تدعم الوضع الليلي والنهاري.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">1. نظرة عامة على النظام</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-[#0D2137] mb-3 text-sm">أهداف النظام الاستراتيجية</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {["توحيد إدارة المخازن الأربع في منصة واحدة متكاملة","رفع دقة الأرصدة وتقليل الهدر في المواد الطبية الحرجة","تسريع الوصول إلى المعلومات وتعزيز اتخاذ القرار","حماية البيانات عبر سجل تدقيق كامل ونسخ احتياطي يومي","توفير تقارير شاملة قابلة للتصفية والتصدير"].map((g, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#0A8FA0] mt-0.5">✓</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#0D2137] mb-3 text-sm">معلومات المستودع والمستخدمون</h4>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {[
                  ["نطاق النظام", "مستودع مركزي واحد — دمشق"],
                  ["إجمالي الأصناف", "~200 صنف عبر الفئات الأربع"],
                  ["عدد المستخدمين", "3 مستخدمين"],
                  ["أدوار المستخدمين", "مدير النظام | أمين المستودع | مراقب"],
                  ["آلية الدخول", "اسم مستخدم + كلمة مرور"],
                  ["بيئة التشغيل", "Windows — جهاز مكتبي مستقل"],
                  ["التوسّع المستقبلي", "دعم نقل المواد بين مستودعات"],
                ].map(([k, v], i) => (
                  <div key={i} className={`flex justify-between px-4 py-2 text-xs ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold text-[#0D2137]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Roles & Permissions */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">2. أدوار المستخدمين وصلاحياتهم</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-[#0D2137] text-white">
                <tr>
                  {["الدور","إضافة مادة","تعديل","حذف","إخراج","التقارير","إدارة مستخدمين","الإعدادات"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-center font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["مدير النظام", "✓","✓","✓","✓","✓","✓","✓"],
                  ["أمين المستودع", "✓","✓","—","✓","✓","—","—"],
                  ["مراقب", "—","—","—","—","✓","—","—"],
                ].map(([role, ...perms], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-3 font-bold text-[#0D2137]">{role}</td>
                    {perms.map((p, j) => (
                      <td key={j} className={`px-3 py-3 text-center font-bold ${p === "✓" ? "text-[#10B981]" : "text-gray-300"}`}>{p}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">* جميع العمليات تُسجَّل مباشرة بدون موافقة مسبقة — تسجيل الدخول: اسم مستخدم + كلمة مرور</p>
        </section>

        {/* Section 3 — Inventory Categories */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">3. فئات المخزون وحقول البيانات</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: "الثوابت", color: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-800",
                fields: ["م — الرقم التسلسلي","المادة — اسم الصنف","النوع","الوحدة","الإدخال — الكمية الواردة","الإخراج — الكمية الصادرة","الرصيد — الحالي","المستلم — اسم الجهة"]
              },
              {
                title: "المستهلكات الطبية", color: "bg-teal-50 border-teal-200", badge: "bg-teal-100 text-teal-800",
                fields: ["م — الرقم التسلسلي","المادة — اسم الصنف","النوع","الوحدة","الإدخال","الإخراج","الرصيد","تاريخ الصلاحية ⚠️ (تنبيه قابل للضبط)"]
              },
              {
                title: "مستهلكات منوعة", color: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800",
                fields: ["م — الرقم التسلسلي","المادة — اسم الصنف","الإدخال","الإخراج","الرصيد"]
              },
              {
                title: "التجهيزات", color: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-800",
                fields: ["م — الرقم التسلسلي","الجهاز — الاسم","النوع","الموديل","الرقم التسلسلي","الحالة الفنية","سنة الصنع","بلد المنشأ","الإدخال","الإخراج","المستلم"]
              },
            ].map((cat, i) => (
              <div key={i} className={`rounded-lg border p-4 ${cat.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${cat.badge}`}>{cat.title}</span>
                </div>
                <ul className="space-y-1">
                  {cat.fields.map((f, j) => (
                    <li key={j} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5">›</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 — Operations */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">4. آلية عمليات الإدخال والإخراج</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-sm text-[#0D2137] mb-3">طريقة الإدخال</h4>
              <div className="space-y-2">
                {[
                  { icon: "⌨️", title: "إدخال يدوي", desc: "الطريقة الأساسية — يُدخل الموظف الكمية من لوحة المفاتيح" },
                  { icon: "📊", title: "استيراد من Excel", desc: "دعم رفع ملفات Excel لإدخال كميات كبيرة دفعةً واحدة" },
                ].map((m, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3 items-start">
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <div className="font-semibold text-xs text-[#0D2137]">{m.title}</div>
                      <div className="text-xs text-gray-500">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#0D2137] mb-3">بيانات الإخراج الإلزامية</h4>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {[
                  "اسم المستلم",
                  "الجهة / الوحدة المستلِمة",
                  "رقم وثيقة / سند الإخراج",
                  "تاريخ الإخراج",
                  "سبب الإخراج",
                ].map((f, i) => (
                  <div key={i} className={`flex items-center gap-2 px-4 py-2 text-xs ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                    <span className="w-2 h-2 rounded-full bg-[#0A8FA0] flex-shrink-0" />
                    <span className="text-gray-700">{f}</span>
                    <span className="mr-auto text-[#10B981] font-bold text-xs">إلزامي</span>
                  </div>
                ))}
                <div className={`flex items-center gap-2 px-4 py-2 text-xs bg-gray-50`}>
                  <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                  <span className="text-gray-500">ملاحظات إضافية</span>
                  <span className="mr-auto text-gray-400 text-xs">اختياري</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">النظام رقمي بالكامل — الطباعة متاحة عند الطلب فقط</p>
            </div>
          </div>
        </section>

        {/* Section 5 — Alerts */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">5. نظام التنبيهات الذكية</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: "⏰", color: "border-amber-300 bg-amber-50", title: "تنبيه انتهاء الصلاحية",
                items: ["يُطبَّق على المستهلكات الطبية فقط","مدة التنبيه المسبق قابلة للضبط في الإعدادات","ألوان في الجدول: أخضر / أصفر / أحمر","يظهر في لوحة المعلومات الرئيسية"]
              },
              {
                icon: "📉", color: "border-red-300 bg-red-50", title: "تنبيه الحد الأدنى للمخزون",
                items: ["حد أدنى مخصص لكل صنف على حدة","يُحدَّد من صفحة إدارة المخزون","تنبيه فوري عند الوصول للحد","إدراج في تقرير المخزون المنخفض"]
              },
              {
                icon: "🔒", color: "border-blue-300 bg-blue-50", title: "سجل التدقيق الكامل",
                items: ["تسجيل كل عملية إدخال وإخراج","تسجيل كل تعديل على بيانات الأصناف","ربط كل عملية باسم المستخدم والتاريخ","لا يمكن حذف سجلات التدقيق"]
              },
            ].map((a, i) => (
              <div key={i} className={`rounded-lg border-2 p-4 ${a.color}`}>
                <div className="text-2xl mb-2">{a.icon}</div>
                <h4 className="font-bold text-sm text-[#0D2137] mb-3">{a.title}</h4>
                <ul className="space-y-1.5">
                  {a.items.map((item, j) => (
                    <li key={j} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5 flex-shrink-0">›</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6 — Reports */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">6. التقارير والتصدير</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-sm text-[#0D2137] mb-3">التقارير المطلوبة (7 تقارير)</h4>
              <div className="space-y-1.5">
                {[
                  ["تقرير الحالة الراهنة للمخزون","الأرصدة الحالية لجميع الأصناف"],
                  ["سجل حركة المواد","إدخال / إخراج خلال فترة زمنية محددة"],
                  ["تقرير انتهاء الصلاحية","المواد المنتهية أو القريبة من الانتهاء"],
                  ["تقرير المخزون المنخفض","الأصناف دون الحد الأدنى المحدد"],
                  ["تقرير مستلمي المواد","من استلم ماذا وبأي كميات"],
                  ["تقرير حالة التجهيزات","الأجهزة الجيدة / المعطلة / تحت الصيانة"],
                  ["الملخص الشهري الشامل","نظرة عامة كاملة على شهر محدد"],
                ].map(([title, desc], i) => (
                  <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded px-3 py-2">
                    <span className="text-[#0A8FA0] font-bold text-xs mt-0.5">0{i + 1}</span>
                    <div>
                      <div className="font-semibold text-xs text-[#0D2137]">{title}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#0D2137] mb-3">خصائص التقارير</h4>
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="font-semibold text-xs text-[#0D2137] mb-2">التصفية بالتواريخ — إلزامي</div>
                  <p className="text-xs text-gray-600">كل تقرير قابل للتصفية بتحديد نطاق تاريخ (من — إلى) مع خيارات سريعة: اليوم، هذا الأسبوع، هذا الشهر، فترة مخصصة</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="font-semibold text-xs text-[#0D2137] mb-2">صيغ التصدير</div>
                  <div className="flex gap-2 mt-1">
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">Excel (.xlsx)</span>
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded font-semibold">طباعة مباشرة</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="font-semibold text-xs text-[#0D2137] mb-2">تقارير مخصصة (متقدم)</div>
                  <p className="text-xs text-gray-600">إمكانية بناء تقرير مخصص بين تاريخين مع اختيار الفئة والأعمدة المطلوبة</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — Backup */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">7. النسخ الاحتياطي والأمان</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h4 className="font-bold text-sm text-[#0D2137] mb-3">النسخ الاحتياطي</h4>
              <div className="space-y-2">
                {[
                  ["التكرار", "يومي تلقائي في وقت محدد قابل للضبط"],
                  ["الموقع", "على نفس الجهاز / الشبكة الداخلية"],
                  ["النسخ اليدوي", "متاح عند الطلب في أي وقت"],
                  ["الاسترجاع", "استعادة من ملف نسخة سابقة"],
                  ["سجل النسخ", "عرض آخر 30 نسخة مع التاريخ والحجم"],
                ].map(([k, v], i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-500 w-24 flex-shrink-0">{k}</span>
                    <span className="text-[#0D2137] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h4 className="font-bold text-sm text-[#0D2137] mb-3">الأمان وسجل التدقيق</h4>
              <div className="space-y-2">
                {[
                  ["المصادقة", "اسم مستخدم + كلمة مرور مشفرة"],
                  ["سجل التدقيق", "كل عملية مربوطة بالمستخدم والتاريخ"],
                  ["التعديلات", "تسجيل القيمة قبل وبعد أي تعديل"],
                  ["الحذف", "كل حذف مسجل ولا يمكن إخفاؤه"],
                  ["الجلسة", "انتهاء تلقائي بعد فترة خمول"],
                ].map(([k, v], i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-500 w-24 flex-shrink-0">{k}</span>
                    <span className="text-[#0D2137] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 8 — Modules */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">8. الوحدات الوظيفية الرئيسية (8 وحدات)</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { num: "01", icon: "📦", title: "إدارة المخزون", desc: "4 فئات — إدخال/إخراج/رصيد" },
              { num: "02", icon: "📊", title: "لوحة الإحصائيات", desc: "رسوم بيانية وتحليلات" },
              { num: "03", icon: "🔔", title: "نظام التنبيهات", desc: "صلاحية + حد أدنى" },
              { num: "04", icon: "🔍", title: "البحث المتقدم", desc: "بفلاتر متعددة وتواريخ" },
              { num: "05", icon: "👥", title: "إدارة المستخدمين", desc: "3 أدوار وصلاحيات" },
              { num: "06", icon: "⚙️", title: "الإعدادات", desc: "تخصيص + نسخ احتياطي" },
              { num: "07", icon: "📋", title: "سجل التدقيق", desc: "كل عملية موثقة" },
              { num: "08", icon: "📄", title: "التقارير والتصدير", desc: "7 تقارير + Excel + طباعة" },
            ].map((m, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-xs text-[#0A8FA0] font-bold mb-1">{m.num}</div>
                <div className="text-xl mb-1">{m.icon}</div>
                <div className="font-bold text-xs text-[#0D2137] mb-1">{m.title}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 9 — Technical Specs */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">9. المواصفات التقنية والبيئة التشغيلية</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { title: "بيئة التشغيل", items: ["نظام Windows — سطح مكتب مستقل","لا يحتاج إنترنت — شبكة داخلية","قاعدة بيانات محلية محمية","واجهة ويب تعمل عبر المتصفح"] },
              { title: "الأجهزة المدعومة", items: ["حاسوب مكتبي (الاستخدام الأساسي)","هاتف ذكي (عرض واستعلام)","واجهة متجاوبة تتكيف مع الشاشات","وضع ليلي ونهاري قابل للتبديل"] },
              { title: "خصائص الواجهة", items: ["دعم كامل للغة العربية RTL","شريط جانبي قابل للطي","اسم المصمم ورقم الإصدار في الواجهة","خط Cairo العربي الاحترافي"] },
            ].map((col, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-sm text-[#0D2137] mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="text-[#0A8FA0] flex-shrink-0">›</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 10 — Roadmap */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">10. خارطة الطريق — 3 مراحل تطوير</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                phase: "المرحلة الأولى", sub: "الأساسية", color: "bg-[#0D2137] text-white", badgeColor: "bg-[#12B5CC]",
                items: ["إدارة المخزون — الفئات الأربع","تسجيل الدخول والمستخدمون","عمليات الإدخال والإخراج الأساسية","لوحة المعلومات الرئيسية","التنبيهات الأساسية (صلاحية + حد أدنى)","البحث البسيط عن الأصناف"]
              },
              {
                phase: "المرحلة الثانية", sub: "المتقدمة", color: "bg-[#0A8FA0] text-white", badgeColor: "bg-white text-[#0A8FA0]",
                items: ["التقارير الكاملة (7 تقارير)","التصدير إلى Excel والطباعة","البحث المتقدم بفلاتر متعددة","سجل التدقيق الكامل","استيراد البيانات من Excel","الملخص الشهري والإحصائيات"]
              },
              {
                phase: "المرحلة الثالثة", sub: "الاحترافية", color: "bg-[#10B981] text-white", badgeColor: "bg-white text-[#10B981]",
                items: ["النسخ الاحتياطي التلقائي اليومي","واجهة الإعدادات الكاملة","دعم الهاتف المحمول (تصميم متجاوب)","وضع ليلي / نهاري","دعم متعدد المستودعات (مستقبلي)","تقارير مخصصة متقدمة"]
              },
            ].map((p, i) => (
              <div key={i} className={`rounded-lg p-5 ${p.color}`}>
                <div className={`inline-block text-xs font-bold px-2 py-1 rounded-full mb-3 ${p.badgeColor}`}>{p.sub}</div>
                <h4 className="font-bold mb-3">{p.phase}</h4>
                <ul className="space-y-1.5">
                  {p.items.map((item, j) => (
                    <li key={j} className="text-xs opacity-90 flex items-start gap-1.5">
                      <span className="opacity-70 flex-shrink-0">›</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Section 11 — Professional Suggestions */}
        <section className="mb-8">
          <h3 className="text-[#0A8FA0] font-bold text-xl border-b-2 border-[#0A8FA0] pb-2 mb-5">11. المقترحات الاحترافية الإضافية</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "📲", title: "دعم الباركود / QR", desc: "مسح الأصناف بكاميرا الهاتف لتسجيل الحركة بدلاً من الكتابة اليدوية — يقلل الأخطاء بشكل كبير" },
              { icon: "📧", title: "تقارير مجدولة", desc: "إرسال الملخص اليومي/الأسبوعي تلقائياً على البريد الإلكتروني للمدير" },
              { icon: "🏷️", title: "ربط الأصناف بالموردين", desc: "إضافة بيانات المورد لكل صنف لتسهيل إعادة الطلب وتتبع مصادر التوريد" },
              { icon: "🔄", title: "نسخ احتياطي مزدوج", desc: "إضافة قرص USB أو مشاركة شبكية كنسخ احتياطي ثانٍ لضمان عدم فقدان البيانات" },
              { icon: "📱", title: "تطبيق هاتف للاستعلام", desc: "واجهة مبسطة للهاتف تتيح البحث وعرض الأرصدة دون إجراء عمليات" },
              { icon: "🖨️", title: "قالب سند إخراج احترافي", desc: "سند إخراج بشعار المنظومة جاهز للطباعة مع جميع البيانات المطلوبة" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-3">
                <div className="text-2xl flex-shrink-0">{s.icon}</div>
                <div>
                  <div className="font-bold text-xs text-[#0D2137] mb-1">{s.title}</div>
                  <div className="text-xs text-gray-500">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6 mt-8">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <img src="/__mockup/images/logo.jpeg" alt="logo" className="w-8 h-8 rounded object-cover" />
              <span>منظومة الإحالة والإسعاف والطوارئ بدمشق © 2026</span>
            </div>
            <div className="flex gap-4">
              <span>المُعدّ: إبراهيم الصيداوي</span>
              <span>📞 0933706403</span>
              <span className="bg-[#0A8FA0] text-white px-2 py-0.5 rounded font-bold">v1.0</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
