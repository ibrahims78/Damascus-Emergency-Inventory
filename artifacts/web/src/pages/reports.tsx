import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetStockReport,
  useGetMovementsReport,
  useGetExpiryReport,
  useGetBelowMinReport,
  useGetEquipmentReport,
  type Item,
  type Transaction,
  type Equipment,
} from '@workspace/api-client-react';
import {
  Printer,
  Download,
  RotateCcw,
  PackageSearch,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Stethoscope,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime, formatDate } from '@/lib/utils';

// ─── helpers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportXlsx(filename: string, headers: string[], rows: (string | number)[][]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // RTL column widths
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
  XLSX.writeFile(wb, filename);
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'warning' | 'danger' | 'success';
}) {
  const color =
    accent === 'danger'
      ? 'text-destructive'
      : accent === 'warning'
        ? 'text-warning'
        : accent === 'success'
          ? 'text-success'
          : 'text-foreground';
  return (
    <div className="bg-card border rounded-lg p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={99} className="h-32 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function PrintHeader({ title }: { title: string }) {
  return (
    <div className="hidden print:block mb-6 text-center border-b-2 border-[#1e3a5f] pb-4">
      <div className="text-xs text-muted-foreground">الجمهورية العربية السورية — وزارة الصحة</div>
      <div className="text-lg font-bold text-[#1e3a5f]">منظومة الإسعاف والطوارئ — دمشق</div>
      <div className="text-base font-semibold mt-1">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">
        تاريخ الطباعة: {new Date().toLocaleDateString('ar-SY')}
      </div>
    </div>
  );
}

// ─── condition map ──────────────────────────────────────────────────────────

const conditionMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  good: { label: 'جيدة', variant: 'default' },
  maintenance: { label: 'صيانة', variant: 'secondary' },
  broken: { label: 'معطلة', variant: 'destructive' },
  consumed: { label: 'مستهلكة', variant: 'outline' },
  needs_inspection: { label: 'تحتاج فحص', variant: 'secondary' },
};

// ─── tab 1: stock ───────────────────────────────────────────────────────────

function StockTab() {
  const { data, isLoading } = useGetStockReport();
  const items = data ?? [];

  const totalItems = items.length;
  const totalStock = items.reduce((s, i) => s + i.currentStock, 0);
  const belowMin = items.filter((i) => i.currentStock <= i.minStock).length;

  const handleExport = async () => {
    exportXlsx(
      'جرد-المخزون.csv',
      ['الكود', 'الاسم', 'الرصيد الحالي', 'الحد الأدنى', 'الوحدة', 'تاريخ الانتهاء', 'الموقع'],
      items.map((i: Item) => [
        i.code ?? '',
        i.name,
        String(i.currentStock),
        String(i.minStock),
        i.unit,
        i.expiryDate ? formatDate(i.expiryDate) : '',
        i.location ?? '',
      ]),
    );
  };

  return (
    <>
      <PrintHeader title="تقرير جرد المخزون" />
      <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
        <SummaryCard label="إجمالي الأصناف" value={totalItems} />
        <SummaryCard label="إجمالي الوحدات" value={totalStock.toLocaleString('ar')} />
        <SummaryCard label="أقل من الحد الأدنى" value={belowMin} accent={belowMin > 0 ? 'danger' : 'success'} />
      </div>

      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />
          تصدير Excel
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الكود</TableHead>
              <TableHead className="text-right">اسم المادة</TableHead>
              <TableHead className="text-right">التصنيف</TableHead>
              <TableHead className="text-center">الرصيد الحالي</TableHead>
              <TableHead className="text-center">الحد الأدنى</TableHead>
              <TableHead className="text-right">الوحدة</TableHead>
              <TableHead className="text-center">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right print:hidden">الموقع</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <EmptyState message="لا توجد مواد مسجّلة بعد" />
            ) : (
              items.map((item: Item) => {
                const isBelowMin = item.currentStock <= item.minStock;
                const isNearExpiry =
                  item.expiryDate
                    ? (new Date(item.expiryDate).getTime() - Date.now()) / 86400000 <= 60
                    : false;
                return (
                  <TableRow key={item.id} className={isBelowMin ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.code ?? '—'}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.categoryName ?? '—'}</TableCell>
                    <TableCell className={`text-center font-bold ${isBelowMin ? 'text-destructive' : ''}`}>
                      {item.currentStock.toLocaleString('ar')}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.minStock.toLocaleString('ar')}</TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    <TableCell className={`text-center text-sm ${isNearExpiry ? 'text-warning font-medium' : ''}`}>
                      {item.expiryDate ? formatDate(item.expiryDate) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground print:hidden">{item.location ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      {isBelowMin ? (
                        <Badge variant="destructive" className="text-xs">نقص</Badge>
                      ) : isNearExpiry ? (
                        <Badge className="bg-warning/15 text-warning border-warning/30 border text-xs">قرب انتهاء</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">طبيعي</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── tab 2: movements ───────────────────────────────────────────────────────

function MovementsTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<'all' | 'in' | 'out'>('all');

  const { data, isLoading } = useGetMovementsReport({
    from: from || undefined,
    to: to || undefined,
    type: type === 'all' ? undefined : type,
  });
  const txs = data ?? [];

  const countIn = txs.filter((t) => t.type === 'in').length;
  const countOut = txs.filter((t) => t.type === 'out').length;

  const hasFilters = from !== '' || to !== '' || type !== 'all';

  const handleExport = async () => {
    exportXlsx(
      'حركة-المواد.csv',
      ['رقم السند', 'التاريخ', 'النوع', 'الصنف', 'الكمية', 'الجهة', 'المستخدم'],
      txs.map((t: Transaction) => [
        t.documentNumber ?? '',
        formatDateTime(t.createdAt),
        t.type === 'in' ? 'إدخال' : t.type === 'out' ? 'إخراج' : 'رصيد افتتاحي',
        t.itemType === 'equipment' ? (t.equipmentName ?? '') : (t.itemName ?? ''),
        t.quantity != null ? String(t.quantity) : '—',
        t.recipientName ?? '',
        t.createdByName ?? '',
      ]),
    );
  };

  return (
    <>
      <PrintHeader title="تقرير حركة المواد" />

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 mb-4 print:hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">من تاريخ</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">إلى تاريخ</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">نوع العملية</label>
            <Select value={type} onValueChange={(v) => setType(v as 'all' | 'in' | 'out')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="in">إدخال فقط</SelectItem>
                <SelectItem value="out">إخراج فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            {hasFilters && (
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"
                onClick={() => { setFrom(''); setTo(''); setType('all'); }}>
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة ضبط
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 print:hidden">
        <SummaryCard label="إجمالي العمليات" value={txs.length} />
        <SummaryCard label="عمليات إدخال" value={countIn} accent="success" />
        <SummaryCard label="عمليات إخراج" value={countOut} accent="danger" />
      </div>

      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />طباعة
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />تصدير Excel
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">رقم السند</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-center">النوع</TableHead>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-right">الجهة المستلمة</TableHead>
              <TableHead className="text-right print:hidden">المستخدم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : txs.length === 0 ? (
              <EmptyState message={hasFilters ? 'لا توجد عمليات بهذه الفلاتر' : 'لا توجد عمليات مسجّلة بعد'} />
            ) : (
              txs.map((tx: Transaction) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs">{tx.documentNumber ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                  <TableCell className="text-center">
                    {tx.type === 'in' ? (
                      <Badge className="bg-success/15 text-success border-success/30 border text-xs">إدخال</Badge>
                    ) : tx.type === 'out' ? (
                      <Badge variant="destructive" className="text-xs">إخراج</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">افتتاحي</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {tx.itemType === 'equipment' ? tx.equipmentName : tx.itemName}
                    {tx.itemUnit && <span className="text-muted-foreground text-xs mr-1">({tx.itemUnit})</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {tx.quantity != null ? tx.quantity.toLocaleString('ar') : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{tx.recipientName ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground print:hidden">{tx.createdByName ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── tab 3: expiry ──────────────────────────────────────────────────────────

function ExpiryTab() {
  const { data, isLoading } = useGetExpiryReport();
  const items = data ?? [];

  const expired = items.filter(
    (i) => i.expiryDate && new Date(i.expiryDate) < new Date(),
  ).length;
  const nearExpiry = items.length - expired;

  const handleExport = async () => {
    exportXlsx(
      'قرب-انتهاء-الصلاحية.csv',
      ['الاسم', 'الرصيد', 'الوحدة', 'تاريخ الانتهاء', 'الأيام المتبقية'],
      items.map((i: Item) => {
        const days = i.expiryDate
          ? Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / 86400000)
          : 0;
        return [i.name, String(i.currentStock), i.unit, i.expiryDate ? formatDate(i.expiryDate) : '', String(days)];
      }),
    );
  };

  return (
    <>
      <PrintHeader title="تقرير الأصناف القريبة من انتهاء الصلاحية" />
      <div className="grid grid-cols-2 gap-4 mb-4 print:hidden">
        <SummaryCard label="منتهية الصلاحية" value={expired} accent={expired > 0 ? 'danger' : 'success'} />
        <SummaryCard label="تنتهي خلال 60 يوم" value={nearExpiry} accent={nearExpiry > 0 ? 'warning' : 'success'} />
      </div>

      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />طباعة
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />تصدير Excel
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم المادة</TableHead>
              <TableHead className="text-right">التصنيف</TableHead>
              <TableHead className="text-center">الرصيد</TableHead>
              <TableHead className="text-right">الوحدة</TableHead>
              <TableHead className="text-center">تاريخ الانتهاء</TableHead>
              <TableHead className="text-center">الأيام المتبقية</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <EmptyState message="✅ لا توجد أصناف قريبة من انتهاء الصلاحية" />
            ) : (
              items.map((item: Item) => {
                const days = item.expiryDate
                  ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000)
                  : 0;
                const isExpired = days <= 0;
                return (
                  <TableRow key={item.id} className={isExpired ? 'bg-destructive/5' : 'bg-warning/5'}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.categoryName ?? '—'}</TableCell>
                    <TableCell className="text-center">{item.currentStock.toLocaleString('ar')}</TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {item.expiryDate ? formatDate(item.expiryDate) : '—'}
                    </TableCell>
                    <TableCell className={`text-center font-bold ${isExpired ? 'text-destructive' : 'text-warning'}`}>
                      {isExpired ? `منتهية منذ ${Math.abs(days)} يوم` : `${days} يوم`}
                    </TableCell>
                    <TableCell className="text-center">
                      {isExpired ? (
                        <Badge variant="destructive" className="text-xs">منتهية الصلاحية</Badge>
                      ) : (
                        <Badge className="bg-warning/15 text-warning border-warning/30 border text-xs">قرب الانتهاء</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── tab 4: below-min ───────────────────────────────────────────────────────

function BelowMinTab() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetBelowMinReport();
  const items = data ?? [];

  const critical = items.filter((i) => i.currentStock === 0).length;

  const handleExport = async () => {
    exportXlsx(
      'أقل-من-الحد-الأدنى.csv',
      ['الاسم', 'الرصيد الحالي', 'الحد الأدنى', 'الفرق', 'الوحدة'],
      items.map((i: Item) => [
        i.name,
        String(i.currentStock),
        String(i.minStock),
        String(i.minStock - i.currentStock),
        i.unit,
      ]),
    );
  };

  return (
    <>
      <PrintHeader title="تقرير الأصناف دون الحد الأدنى" />
      <div className="grid grid-cols-2 gap-4 mb-4 print:hidden">
        <SummaryCard label="أصناف تحتاج طلبية" value={items.length} accent={items.length > 0 ? 'warning' : 'success'} />
        <SummaryCard label="نفدت من المستودع (صفر)" value={critical} accent={critical > 0 ? 'danger' : 'success'} />
      </div>

      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />طباعة
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />تصدير Excel
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم المادة</TableHead>
              <TableHead className="text-right">التصنيف</TableHead>
              <TableHead className="text-center">الرصيد الحالي</TableHead>
              <TableHead className="text-center">الحد الأدنى</TableHead>
              <TableHead className="text-center">الفرق المطلوب</TableHead>
              <TableHead className="text-right">الوحدة</TableHead>
              <TableHead className="text-center print:hidden">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <EmptyState message="✅ جميع الأصناف فوق الحد الأدنى" />
            ) : (
              items.map((item: Item) => {
                const gap = item.minStock - item.currentStock;
                const isCritical = item.currentStock === 0;
                return (
                  <TableRow key={item.id} className={isCritical ? 'bg-destructive/5' : 'bg-warning/5'}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.categoryName ?? '—'}</TableCell>
                    <TableCell className={`text-center font-bold ${isCritical ? 'text-destructive' : 'text-warning'}`}>
                      {item.currentStock.toLocaleString('ar')}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.minStock.toLocaleString('ar')}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isCritical ? 'destructive' : 'outline'} className="font-mono">
                        +{gap.toLocaleString('ar')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    <TableCell className="text-center print:hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setLocation('/transactions/in/new')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        إدخال
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── tab 5: equipment ───────────────────────────────────────────────────────

function EquipmentTab() {
  const { data, isLoading } = useGetEquipmentReport();
  const equipment = data ?? [];

  const countByCondition = equipment.reduce<Record<string, number>>((acc, e) => {
    acc[e.condition] = (acc[e.condition] ?? 0) + 1;
    return acc;
  }, {});

  const handleExport = async () => {
    exportXlsx(
      'حالة-التجهيزات.csv',
      ['الاسم', 'الرقم التسلسلي', 'الموديل', 'الحالة', 'الحائز', 'ملاحظات'],
      equipment.map((e: Equipment) => [
        e.name,
        e.serialNumber ?? '',
        e.model ?? '',
        conditionMap[e.condition]?.label ?? e.condition,
        e.currentHolder ?? '',
        e.notes ?? '',
      ]),
    );
  };

  return (
    <>
      <PrintHeader title="تقرير حالة التجهيزات" />

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4 print:hidden">
        <SummaryCard label="إجمالي التجهيزات" value={equipment.length} />
        <SummaryCard label="جيدة" value={countByCondition['good'] ?? 0} accent="success" />
        <SummaryCard label="صيانة" value={countByCondition['maintenance'] ?? 0} accent="warning" />
        <SummaryCard label="معطلة" value={countByCondition['broken'] ?? 0} accent="danger" />
        <SummaryCard label="تحتاج فحص" value={countByCondition['needs_inspection'] ?? 0} accent="warning" />
      </div>

      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />طباعة
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />تصدير Excel
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم التجهيز</TableHead>
              <TableHead className="text-right">الرقم التسلسلي</TableHead>
              <TableHead className="text-right print:hidden">الموديل</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-right">الحائز الحالي</TableHead>
              <TableHead className="text-right print:hidden">ملاحظات</TableHead>
              <TableHead className="text-right print:hidden">ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : equipment.length === 0 ? (
              <EmptyState message="لا توجد تجهيزات مسجّلة بعد" />
            ) : (
              equipment.map((eq: Equipment) => {
                const cond = conditionMap[eq.condition] ?? { label: eq.condition, variant: 'default' as const };
                return (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium">{eq.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{eq.serialNumber ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground print:hidden">{eq.model ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cond.variant} className="text-xs">{cond.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{eq.currentHolder ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground print:hidden max-w-[150px] truncate">
                      {eq.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ─── main page ──────────────────────────────────────────────────────────────

export function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">التقارير</h1>
        <p className="text-sm text-muted-foreground">
          اختر التبويب المطلوب لعرض البيانات أو تصديرها
        </p>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto print:hidden">
          <TabsTrigger value="stock" className="gap-1.5 text-xs py-2">
            <PackageSearch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جرد المخزون</span>
            <span className="sm:hidden">الجرد</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-1.5 text-xs py-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">حركة المواد</span>
            <span className="sm:hidden">الحركة</span>
          </TabsTrigger>
          <TabsTrigger value="expiry" className="gap-1.5 text-xs py-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">انتهاء الصلاحية</span>
            <span className="sm:hidden">الصلاحية</span>
          </TabsTrigger>
          <TabsTrigger value="below-min" className="gap-1.5 text-xs py-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">أقل من الحد</span>
            <span className="sm:hidden">نواقص</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1.5 text-xs py-2">
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">التجهيزات</span>
            <span className="sm:hidden">تجهيزات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-0">
          <StockTab />
        </TabsContent>
        <TabsContent value="movements" className="mt-0">
          <MovementsTab />
        </TabsContent>
        <TabsContent value="expiry" className="mt-0">
          <ExpiryTab />
        </TabsContent>
        <TabsContent value="below-min" className="mt-0">
          <BelowMinTab />
        </TabsContent>
        <TabsContent value="equipment" className="mt-0">
          <EquipmentTab />
        </TabsContent>
      </Tabs>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
        نظام مستودع منظومة الإسعاف والطوارئ — دمشق · طُبع بتاريخ {new Date().toLocaleDateString('ar-SY')}
      </div>
    </div>
  );
}
