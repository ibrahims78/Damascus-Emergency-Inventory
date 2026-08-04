/**
 * ينشئ ملف Excel بيانات_اختبار_60_تجهيزة.xlsx
 * يتضمن 60 تجهيزة طبية وهمية واقعية لمنظومة إسعاف دمشق
 * مع حقلَي الكمية والحد الأدنى الجديدَين
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── بيانات التجهيزات ───────────────────────────────────────────────────────
const equipment = [
  // ── أجهزة إنعاش وتنفس ──
  { name: "جهاز صدمة كهربائية خارجي آلي (AED)", type: "جهاز إنعاش", model: "ZOLL AED Plus", serial: "ZL-AED-001", condition: "جيدة", qty: 4, minQty: 2, year: 2021, country: "الولايات المتحدة", holder: "سيارة إسعاف 1", notes: "بطارية مكتملة — صيانة دورية سنوية" },
  { name: "جهاز صدمة كهربائية خارجي آلي (AED)", type: "جهاز إنعاش", model: "ZOLL AED Plus", serial: "ZL-AED-002", condition: "جيدة", qty: 4, minQty: 2, year: 2021, country: "الولايات المتحدة", holder: "سيارة إسعاف 2", notes: "بطارية مكتملة" },
  { name: "جهاز مراقبة وصدمة كهربائية (Monitor/Defib)", type: "جهاز إنعاش", model: "Philips HeartStart MRx", serial: "PH-MRX-2023-01", condition: "جيدة", qty: 2, minQty: 1, year: 2023, country: "هولندا", holder: "غرفة الطوارئ", notes: "يدعم 12 خيوطاً — معايرة كل 6 أشهر" },
  { name: "جهاز تنفس اصطناعي طارئ (BVM)", type: "جهاز تنفس", model: "Ambu SPUR II", serial: null, condition: "جيدة", qty: 12, minQty: 5, year: 2022, country: "الدنمارك", holder: "مخزن الطوارئ", notes: "استخدام للبالغين — للاستخدام مرة واحدة" },
  { name: "جهاز تنفس اصطناعي ميكانيكي (Ventilator)", type: "جهاز تنفس", model: "Mindray SV300", serial: "MR-SV300-0042", condition: "جيدة", qty: 3, minQty: 1, year: 2020, country: "الصين", holder: "وحدة العناية المركزة", notes: "معايرة أخيرة: يناير 2026" },
  { name: "جهاز قياس الأكسجين النبضي (Pulse Oximeter)", type: "جهاز تشخيص", model: "Nonin 9590", serial: null, condition: "جيدة", qty: 15, minQty: 6, year: 2022, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "محمول — يُوزَّع على السيارات" },
  { name: "جهاز شفط إفرازات (Suction Unit)", type: "جهاز تنفس", model: "Laerdal Compact", serial: "LAE-SUC-007", condition: "جيدة", qty: 6, minQty: 3, year: 2021, country: "النرويج", holder: "سيارة إسعاف 3", notes: "يعمل بالبطارية والكهرباء" },

  // ── أجهزة قياس ومراقبة ──
  { name: "جهاز قياس ضغط الدم الرقمي", type: "جهاز قياس", model: "Omron HEM-907", serial: null, condition: "جيدة", qty: 10, minQty: 4, year: 2023, country: "اليابان", holder: "مخزن الطوارئ", notes: "معايرة كل سنة" },
  { name: "جهاز قياس ضغط الدم اليدوي (سفينغومانومتر)", type: "جهاز قياس", model: "Riester Big Ben", serial: null, condition: "جيدة", qty: 8, minQty: 3, year: 2022, country: "ألمانيا", holder: "مخزن الطوارئ", notes: "" },
  { name: "جهاز رسم القلب (ECG) 12 خيط", type: "جهاز تشخيص", model: "Schiller AT-102", serial: "SCH-ECG-2022-03", condition: "جيدة", qty: 2, minQty: 1, year: 2022, country: "سويسرا", holder: "غرفة الطوارئ", notes: "طباعة فورية — ورق حراري" },
  { name: "جهاز قياس السكر في الدم (Glucometer)", type: "جهاز قياس", model: "Accu-Chek Active", serial: null, condition: "جيدة", qty: 8, minQty: 3, year: 2023, country: "ألمانيا", holder: "مخزن الطوارئ", notes: "يستلزم شرائط اختبار — راجع مخزون الشرائط" },
  { name: "جهاز مراقبة المريض متعدد المعاملات", type: "جهاز مراقبة", model: "Mindray iMEC 8", serial: "MR-IMEC-0021", condition: "جيدة", qty: 4, minQty: 2, year: 2021, country: "الصين", holder: "وحدة العناية المركزة", notes: "يقيس: ECG, SpO2, NIBP, Temp, EtCO2" },
  { name: "جهاز مراقبة المريض متعدد المعاملات", type: "جهاز مراقبة", model: "Mindray iMEC 8", serial: "MR-IMEC-0022", condition: "تحتاج فحص", qty: 4, minQty: 2, year: 2021, country: "الصين", holder: "مخزن الصيانة", notes: "شاشة بها خلل طفيف — بانتظار قطعة غيار" },
  { name: "ميزان طبي رقمي", type: "جهاز قياس", model: "Seca 813", serial: "SC-813-0055", condition: "جيدة", qty: 3, minQty: 1, year: 2020, country: "ألمانيا", holder: "غرفة الكشف", notes: "" },
  { name: "مقياس حرارة رقمي بالأذن", type: "جهاز قياس", model: "Braun ThermoScan 7", serial: null, condition: "جيدة", qty: 10, minQty: 4, year: 2023, country: "ألمانيا", holder: "مخزن الطوارئ", notes: "يستلزم غطاء للمسبار — للاستخدام مرة واحدة" },

  // ── أجهزة جراحية ونقل ──
  { name: "نقالة طبية قابلة للطي", type: "معدات نقل", model: "Ferno Model 35", serial: "FER-STR-001", condition: "جيدة", qty: 6, minQty: 3, year: 2020, country: "الولايات المتحدة", holder: "سيارة إسعاف 1", notes: "" },
  { name: "نقالة طبية قابلة للطي", type: "معدات نقل", model: "Ferno Model 35", serial: "FER-STR-002", condition: "جيدة", qty: 6, minQty: 3, year: 2020, country: "الولايات المتحدة", holder: "سيارة إسعاف 2", notes: "" },
  { name: "كرسي نقل مرضى (Wheelchair)", type: "معدات نقل", model: "Drive Medical Cruiser III", serial: null, condition: "جيدة", qty: 8, minQty: 3, year: 2021, country: "الولايات المتحدة", holder: "قسم الاستقبال", notes: "فولاذ مقاوم للصدأ" },
  { name: "جهاز تثبيت العمود الفقري (Spine Board)", type: "معدات نقل", model: "Ferno XF Spineboard", serial: null, condition: "جيدة", qty: 5, minQty: 2, year: 2022, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "مع أحزمة تثبيت 3 نقاط" },
  { name: "طوق عنق طبي (Cervical Collar) — مقاسات متعددة", type: "معدات نقل", model: "Laerdal Stifneck Select", serial: null, condition: "جيدة", qty: 20, minQty: 8, year: 2023, country: "النرويج", holder: "مخزن الطوارئ", notes: "مجموعة من S/M/L/XL" },
  { name: "سرير نقل المرضى الكهربائي", type: "معدات نقل", model: "Stryker Prime Series", serial: "STR-BED-2019-01", condition: "جيدة", qty: 10, minQty: 4, year: 2019, country: "الولايات المتحدة", holder: "أجنحة المرضى", notes: "فحص دوري كل 6 أشهر" },
  { name: "سرير نقل المرضى الكهربائي", type: "معدات نقل", model: "Stryker Prime Series", serial: "STR-BED-2019-02", condition: "في الصيانة", qty: 10, minQty: 4, year: 2019, country: "الولايات المتحدة", holder: "ورشة الصيانة", notes: "صيانة دورية — عودة خلال أسبوع" },

  // ── معدات أكسجين ──
  { name: "أسطوانة أكسجين 10 لتر مع منظم ضغط", type: "معدات أكسجين", model: "Air Liquide Cylinder D", serial: "ALQ-O2-0101", condition: "جيدة", qty: 12, minQty: 5, year: 2022, country: "فرنسا", holder: "سيارة إسعاف 1", notes: "مكتملة الشحن — فحص شهري" },
  { name: "أسطوانة أكسجين 10 لتر مع منظم ضغط", type: "معدات أكسجين", model: "Air Liquide Cylinder D", serial: "ALQ-O2-0102", condition: "جيدة", qty: 12, minQty: 5, year: 2022, country: "فرنسا", holder: "سيارة إسعاف 2", notes: "مكتملة الشحن" },
  { name: "قناع أكسجين مع خرطوم (Non-Rebreather Mask)", type: "معدات أكسجين", model: "Hudson RCI", serial: null, condition: "جيدة", qty: 30, minQty: 10, year: 2024, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "للاستخدام مرة واحدة — بالغون" },
  { name: "منظم تدفق الأكسجين (Flow Regulator)", type: "معدات أكسجين", model: "Medline MDS110102", serial: null, condition: "جيدة", qty: 8, minQty: 3, year: 2021, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "" },
  { name: "جهاز مرطب الأكسجين (Humidifier)", type: "معدات أكسجين", model: "Fisher & Paykel MR310", serial: "FP-HUM-0033", condition: "جيدة", qty: 4, minQty: 2, year: 2020, country: "نيوزيلندا", holder: "وحدة العناية المركزة", notes: "تعقيم أسبوعي" },

  // ── معدات تخدير وعمليات ──
  { name: "جهاز تخدير (Anesthesia Machine)", type: "جهاز تخدير", model: "Drager Perseus A500", serial: "DRG-ANES-0007", condition: "جيدة", qty: 2, minQty: 1, year: 2021, country: "ألمانيا", holder: "غرفة العمليات 1", notes: "معايرة سنوية — آخرها مارس 2026" },
  { name: "جهاز تخدير (Anesthesia Machine)", type: "جهاز تخدير", model: "Drager Fabius GS", serial: "DRG-ANES-0008", condition: "جيدة", qty: 2, minQty: 1, year: 2019, country: "ألمانيا", holder: "غرفة العمليات 2", notes: "" },
  { name: "مضخة حقن وريدي (Infusion Pump)", type: "جهاز علاجي", model: "Baxter Sigma Spectrum", serial: "BAX-INF-0201", condition: "جيدة", qty: 8, minQty: 3, year: 2022, country: "الولايات المتحدة", holder: "أجنحة المرضى", notes: "برمجة جرعات مسبقة مُحدَّثة" },
  { name: "مضخة حقن وريدي (Infusion Pump)", type: "جهاز علاجي", model: "Baxter Sigma Spectrum", serial: "BAX-INF-0202", condition: "معطلة", qty: 8, minQty: 3, year: 2022, country: "الولايات المتحدة", holder: "مخزن الصيانة", notes: "خلل في المحرك — بانتظار قطعة غيار" },
  { name: "مضخة حقن وريدي (Syringe Pump)", type: "جهاز علاجي", model: "Fresenius Kabi Injectomat", serial: "FRK-SYR-0051", condition: "جيدة", qty: 10, minQty: 4, year: 2021, country: "ألمانيا", holder: "وحدة العناية المركزة", notes: "" },

  // ── معدات تشخيص ──
  { name: "جهاز الموجات فوق الصوتية (Ultrasound) محمول", type: "جهاز تشخيص", model: "GE LOGIQ e R8", serial: "GE-US-2020-01", condition: "جيدة", qty: 1, minQty: 1, year: 2020, country: "الولايات المتحدة", holder: "قسم الطوارئ", notes: "تحديث البرنامج v3.2.1 — ضمان حتى 2027" },
  { name: "جهاز الموجات فوق الصوتية (Ultrasound) ثابت", type: "جهاز تشخيص", model: "Mindray DC-70", serial: "MR-US-2022-01", condition: "جيدة", qty: 1, minQty: 1, year: 2022, country: "الصين", holder: "غرفة الأشعة", notes: "" },
  { name: "منظار أذن وعين (Otoscope/Ophthalmoscope)", type: "جهاز تشخيص", model: "Welch Allyn 3.5V", serial: null, condition: "جيدة", qty: 5, minQty: 2, year: 2021, country: "الولايات المتحدة", holder: "غرفة الكشف", notes: "مجموعة شاملة — حقيبة جلدية" },
  { name: "منظار حنجرة (Laryngoscope) مع مجموعة ألسنة", type: "جهاز تشخيص", model: "Welch Allyn MacIntosh Set", serial: null, condition: "جيدة", qty: 6, minQty: 2, year: 2022, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "مقاسات 0-4 — تعقيم بعد كل استخدام" },

  // ── معدات تعقيم وتنظيف ──
  { name: "جهاز تعقيم بالبخار (Autoclave)", type: "جهاز تعقيم", model: "Tuttnauer 2540M", serial: "TUT-AUT-001", condition: "جيدة", qty: 2, minQty: 1, year: 2019, country: "إسرائيل", holder: "وحدة التعقيم المركزية", notes: "صيانة دورية — فلتر مياه شهري" },
  { name: "جهاز تعقيم بالأشعة فوق البنفسجية (UV Sterilizer)", type: "جهاز تعقيم", model: "Philips TUV 30W", serial: null, condition: "جيدة", qty: 5, minQty: 2, year: 2023, country: "هولندا", holder: "الغرف والمكاتب", notes: "لا يُستخدم بوجود البشر" },
  { name: "غسالة معقمة للأدوات (Washer Disinfector)", type: "جهاز تعقيم", model: "Miele PG 8528", serial: "MIE-WD-2020-01", condition: "جيدة", qty: 1, minQty: 1, year: 2020, country: "ألمانيا", holder: "وحدة التعقيم المركزية", notes: "برنامج 93° C — مرخصة للأدوات الجراحية" },

  // ── أثاث وتجهيزات طبية ──
  { name: "طاولة كشف طبية قابلة للتعديل", type: "أثاث طبي", model: "Hausmann 4790", serial: null, condition: "جيدة", qty: 6, minQty: 3, year: 2018, country: "الولايات المتحدة", holder: "غرف الكشف", notes: "" },
  { name: "خزانة أدوية ذات قفل", type: "أثاث طبي", model: "Midmark 7000", serial: null, condition: "جيدة", qty: 4, minQty: 2, year: 2020, country: "الولايات المتحدة", holder: "غرف الطوارئ", notes: "مفتاح احتياطي لدى المدير" },
  { name: "ضوء الفحص الطبي (Examination Light)", type: "أثاث طبي", model: "Luxiflex LED 40000", serial: null, condition: "جيدة", qty: 5, minQty: 2, year: 2021, country: "ألمانيا", holder: "غرف الكشف", notes: "LED — عمر مصباح +50000 ساعة" },
  { name: "حامل محلول وريدي (IV Stand) قابل للتعديل", type: "أثاث طبي", model: "Blickman 8951SC", serial: null, condition: "جيدة", qty: 20, minQty: 8, year: 2022, country: "الولايات المتحدة", holder: "أجنحة المرضى", notes: "5 مشابك — فولاذ مقاوم للصدأ" },
  { name: "مرتبة واقية ضد قرح الفراش", type: "أثاث طبي", model: "Harvest Healthcare Supreme", serial: null, condition: "جيدة", qty: 12, minQty: 5, year: 2022, country: "المملكة المتحدة", holder: "أجنحة المرضى", notes: "ضغط هواء متناوب" },

  // ── معدات إسعافية ──
  { name: "حقيبة إسعاف أولي المتقدمة (Trauma Bag)", type: "معدات إسعافية", model: "Ferno Infinity Trauma", serial: null, condition: "جيدة", qty: 8, minQty: 3, year: 2022, country: "الولايات المتحدة", holder: "سيارات الإسعاف", notes: "تحتوي على: ضمادات، قفازات، مشابك، ملقط" },
  { name: "جبيرة هوائية للأطراف (Pneumatic Splint) — مجموعة", type: "معدات إسعافية", model: "Hartwell Medical Air Splint", serial: null, condition: "جيدة", qty: 6, minQty: 2, year: 2021, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "3 مقاسات — كامل/نصف طول للذراع والساق" },
  { name: "جهاز ضغط على الجرح (Tourniquet) — Combat Application", type: "معدات إسعافية", model: "CAT Gen7", serial: null, condition: "جيدة", qty: 25, minQty: 10, year: 2023, country: "الولايات المتحدة", holder: "سيارات الإسعاف ومخزن الطوارئ", notes: "" },
  { name: "بطانية إسعافية حرارية (Emergency Blanket) فويل", type: "معدات إسعافية", model: "North American Rescue", serial: null, condition: "جيدة", qty: 50, minQty: 20, year: 2024, country: "الولايات المتحدة", holder: "مخزن الطوارئ", notes: "للاستخدام مرة واحدة — مقاوم للرياح والرطوبة" },

  // ── معدات اتصال وحماية ──
  { name: "جهاز لاسلكي محمول (Walkie-Talkie) للميدان", type: "معدات اتصال", model: "Motorola DP4400e", serial: "MOT-VHF-101", condition: "جيدة", qty: 10, minQty: 4, year: 2021, country: "الولايات المتحدة", holder: "سيارات الإسعاف", notes: "شبكة VHF — بطارية 12 ساعة" },
  { name: "جهاز لاسلكي محمول (Walkie-Talkie) للميدان", type: "معدات اتصال", model: "Motorola DP4400e", serial: "MOT-VHF-102", condition: "جيدة", qty: 10, minQty: 4, year: 2021, country: "الولايات المتحدة", holder: "غرفة العمليات", notes: "احتياطي" },
  { name: "خوذة واقية للمسعفين", type: "معدات حماية", model: "MSA V-Gard 500", serial: null, condition: "جيدة", qty: 15, minQty: 6, year: 2022, country: "الولايات المتحدة", holder: "مخزن التجهيزات الشخصية", notes: "درجة EN397 — تفتيش سنوي" },
  { name: "سترة واقية عاكسة للمسعفين", type: "معدات حماية", model: "Portwest HiVis", serial: null, condition: "جيدة", qty: 20, minQty: 8, year: 2023, country: "إيرلندا", holder: "مخزن التجهيزات الشخصية", notes: "فئة 2 — مقاس XL" },
  { name: "مصباح يدوي قوي للميدان", type: "معدات حماية", model: "Streamlight Stinger DS LED", serial: null, condition: "جيدة", qty: 12, minQty: 5, year: 2022, country: "الولايات المتحدة", holder: "سيارات الإسعاف", notes: "يُشحن من ولاعة السيارة" },

  // ── معدات متخصصة ──
  { name: "جهاز قياس ثاني أكسيد الكربون الزفيري (Capnograph)", type: "جهاز تشخيص", model: "Oridion Microstream CO2", serial: "ORI-CAP-0012", condition: "جيدة", qty: 3, minQty: 1, year: 2021, country: "إسرائيل", holder: "سيارة إسعاف 1", notes: "يستلزم خراطيم مخصصة للاستخدام مرة واحدة" },
  { name: "منظار للتنبيب الصعب (Video Laryngoscope)", type: "جهاز تشخيص", model: "McGrath MAC", serial: "MG-VL-0003", condition: "جيدة", qty: 2, minQty: 1, year: 2022, country: "المملكة المتحدة", holder: "غرفة العمليات 1", notes: "شاشة LCD 2.5 بوصة — يستلزم ألسنة معقمة" },
  { name: "جهاز رصد درجة حرارة المريض الأساسية", type: "جهاز قياس", model: "Welch Allyn SureTemp 692", serial: "WA-TEMP-0044", condition: "جيدة", qty: 4, minQty: 2, year: 2020, country: "الولايات المتحدة", holder: "غرف الكشف", notes: "يقيس درجة حرارة المريض خلال 10 ثوانٍ" },
  { name: "مضخة شفط الجرح (Wound VAC)", type: "جهاز علاجي", model: "KCI ActiV.A.C.", serial: "KCI-VAC-0007", condition: "جيدة", qty: 2, minQty: 1, year: 2021, country: "الولايات المتحدة", holder: "وحدة الجراحة", notes: "ضمادات مخصصة — للاستخدام مرة واحدة" },
  { name: "جهاز تسخين السوائل الوريدية (Fluid Warmer)", type: "جهاز علاجي", model: "Smiths Medical Level 1", serial: "SM-FW-0018", condition: "جيدة", qty: 3, minQty: 1, year: 2022, country: "الولايات المتحدة", holder: "غرفة العمليات", notes: "يرفع درجة حرارة المحلول لـ 41° C" },
  { name: "جهاز كسر عظمة القص للإنعاش (LUCAS 3)", type: "جهاز إنعاش", model: "Stryker LUCAS 3", serial: "STR-LUC-0002", condition: "جيدة", qty: 2, minQty: 1, year: 2023, country: "الولايات المتحدة", holder: "سيارة إسعاف 1", notes: "ضغط آلي على القص — يحرر يدي المسعف" },
  { name: "مضخة تصريف الصدر (Chest Drain Pump)", type: "جهاز علاجي", model: "Atrium Ocean 3603", serial: "ATR-CDP-0009", condition: "جيدة", qty: 2, minQty: 1, year: 2022, country: "الولايات المتحدة", holder: "وحدة الجراحة", notes: "استنزاف الهواء والسوائل من التجويف الجنبي" },
];

// ─── بناء الـ Excel ───────────────────────────────────────────────────────────
const headers = [
  'الاسم *',
  'نوع التجهيز',
  'الموديل',
  'الرقم التسلسلي',
  'الحالة',
  'الكمية',
  'الحد الأدنى للكمية',
  'سنة الصنع',
  'بلد المنشأ',
  'الحائز الحالي',
  'ملاحظات',
];

const rows = equipment.map((e) => [
  e.name,
  e.type,
  e.model,
  e.serial ?? '',
  e.condition,
  e.qty,
  e.minQty,
  e.year,
  e.country,
  e.holder,
  e.notes,
]);

const wb = XLSX.utils.book_new();

// ورقة البيانات
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
ws['!cols'] = [
  { wch: 42 }, { wch: 20 }, { wch: 24 }, { wch: 22 },
  { wch: 16 }, { wch: 10 }, { wch: 20 },
  { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 40 },
];
// تثبيت الصف الأول (رأس الجدول)
ws['!freeze'] = { xSplit: 0, ySplit: 1 };

// ورقة إحصائيات
const stats = [
  ['إحصائيات ملف الاختبار'],
  [],
  ['المعلومة', 'القيمة'],
  ['إجمالي التجهيزات', equipment.length],
  ['تجهيزات جيدة', equipment.filter(e => e.condition === 'جيدة').length],
  ['تجهيزات تحتاج فحص', equipment.filter(e => e.condition === 'تحتاج فحص').length],
  ['تجهيزات في الصيانة', equipment.filter(e => e.condition === 'في الصيانة').length],
  ['تجهيزات معطلة', equipment.filter(e => e.condition === 'معطلة').length],
  [],
  ['تجهيزات بكمية ≥ 10 قطعة', equipment.filter(e => e.qty >= 10).length],
  ['تجهيزات بكمية ≤ 3 قطع', equipment.filter(e => e.qty <= 3).length],
  ['تجهيزات بها حد أدنى (تنبيه)', equipment.filter(e => e.minQty > 0).length],
  ['تجهيزات بكمية أقل من الحد الأدنى (نقص!)', equipment.filter(e => e.qty <= e.minQty && e.minQty > 0).length],
  [],
  ['بلدان الصنع الأكثر شيوعاً'],
  ...Object.entries(
    equipment.reduce((acc, e) => { acc[e.country] = (acc[e.country] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).map(([c, n]) => [c, n]),
];
const statsWs = XLSX.utils.aoa_to_sheet(stats);
statsWs['!cols'] = [{ wch: 40 }, { wch: 12 }];

XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
XLSX.utils.book_append_sheet(wb, statsWs, 'إحصائيات');

const outPath = path.join(__dirname, '..', 'بيانات_اختبار_60_تجهيزة.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`✅ تم إنشاء: ${outPath}`);
console.log(`   📦 إجمالي التجهيزات: ${equipment.length}`);
console.log(`   ✅ جيدة: ${equipment.filter(e => e.condition === 'جيدة').length}`);
console.log(`   🔧 صيانة/فحص: ${equipment.filter(e => e.condition === 'في الصيانة' || e.condition === 'تحتاج فحص').length}`);
console.log(`   ❌ معطلة: ${equipment.filter(e => e.condition === 'معطلة').length}`);
