import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGetCurrentUser } from '@workspace/api-client-react';
import {
  Settings2,
  KeyRound,
  Building2,
  Save,
  User as UserIcon,
  DatabaseBackup,
  Download,
  Ruler,
  Plus,
  X,
  CheckCircle2,
  Tag,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Upload,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SystemSettings {
  id: number;
  orgName: string;
  orgSubtitle?: string | null;
  expiryAlertDays: number;
  unitsList?: string | null;
  setupCompleted: boolean;
  updatedAt: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch('/api/settings', { credentials: 'include' });
  if (!res.ok) throw new Error('فشل جلب الإعدادات');
  return res.json() as Promise<SystemSettings>;
}

async function saveSettings(
  data: Partial<Pick<SystemSettings, 'orgName' | 'orgSubtitle' | 'expiryAlertDays' | 'unitsList'>>,
): Promise<SystemSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'فشل حفظ الإعدادات');
  }
  return res.json() as Promise<SystemSettings>;
}

async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await fetch('/api/settings/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'فشل تغيير كلمة المرور');
  }
}

const DEFAULT_UNITS = [
  'قطعة', 'علبة', 'لتر', 'مل', 'كيس', 'زجاجة', 'برميل',
  'رول', 'كرتون', 'طرد', 'حبة', 'زوج', 'مجموعة', 'جرام', 'كيلوغرام',
];

// ─── Settings Page ────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { data: currentUser } = useGetCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">إعدادات المنظومة والملف الشخصي</p>
      </div>

      <Tabs defaultValue="profile" dir="rtl">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2">
            <UserIcon className="h-4 w-4" />الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <KeyRound className="h-4 w-4" />كلمة المرور
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="org" className="gap-2">
              <Building2 className="h-4 w-4" />إعدادات المنظومة
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />التصنيفات
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="units" className="gap-2">
              <Ruler className="h-4 w-4" />وحدات القياس
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="backup" className="gap-2">
              <DatabaseBackup className="h-4 w-4" />النسخ الاحتياطي
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="import" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />استيراد Excel
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={currentUser} />
        </TabsContent>

        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="org">
            <OrgTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="units">
            <UnitsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="backup">
            <BackupTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="import">
            <ImportTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({
  user,
}: {
  user?: { fullName?: string; username?: string; role?: string } | null;
}) {
  const roleLabel: Record<string, string> = {
    admin: 'مدير نظام',
    warehouse_manager: 'أمين مستودع',
    viewer: 'مراقب',
  };

  return (
    <div className="bg-card border rounded-lg p-6 space-y-5">
      <h2 className="font-semibold text-lg">معلومات الحساب</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">الاسم الكامل</Label>
          <p className="font-medium">{user?.fullName || '—'}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">اسم المستخدم</Label>
          <p className="font-mono font-medium">{user?.username || '—'}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">الدور</Label>
          <Badge variant="secondary">{roleLabel[user?.role ?? ''] || user?.role || '—'}</Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground border-t pt-4">
        لتعديل الاسم أو الدور، تواصل مع مدير النظام.
      </p>
    </div>
  );
}

// ─── Password Tab ─────────────────────────────────────────────────────────────

function PasswordTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrent(''); setNext(''); setConfirm('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!current || !next || !confirm) { toast.error('يرجى تعبئة جميع الحقول'); return; }
    if (next.length < 8) { toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (next !== confirm) { toast.error('كلمتا المرور غير متطابقتين'); return; }
    mutation.mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <div className="bg-card border rounded-lg p-6 space-y-5 max-w-sm">
      <h2 className="font-semibold text-lg">تغيير كلمة المرور</h2>
      <div className="space-y-1.5">
        <Label htmlFor="cur">كلمة المرور الحالية</Label>
        <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nxt">كلمة المرور الجديدة</Label>
        <Input id="nxt" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cnf">تأكيد كلمة المرور</Label>
        <Input id="cnf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2 w-full">
        <Save className="h-4 w-4" />
        {mutation.isPending ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
      </Button>
    </div>
  );
}

// ─── Org Tab ──────────────────────────────────────────────────────────────────

function OrgTab() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const [orgName, setOrgName]         = useState('');
  const [orgSubtitle, setOrgSubtitle] = useState('');
  const [expiryAlertDays, setDays]    = useState('30');

  useEffect(() => {
    if (settings) {
      setOrgName(settings.orgName);
      setOrgSubtitle(settings.orgSubtitle ?? '');
      setDays(String(settings.expiryAlertDays));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('تم حفظ الإعدادات');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="bg-card border rounded-lg p-6 space-y-5">
      <h2 className="font-semibold text-lg">إعدادات المنظومة</h2>

      <div className="space-y-1.5">
        <Label htmlFor="orgName">اسم المنظومة <span className="text-destructive">*</span></Label>
        <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)}
          placeholder="مديرية الاحالة والإسعاف والطوارئ - دمشق" />
        <p className="text-xs text-muted-foreground">يظهر في رأس سندات الإدخال والإخراج</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="orgSubtitle">العنوان الفرعي (اختياري)</Label>
        <Input id="orgSubtitle" value={orgSubtitle} onChange={(e) => setOrgSubtitle(e.target.value)}
          placeholder="مثال: مستودع مواد الإسعاف" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expiryDays">
          أيام التنبيه قبل انتهاء الصلاحية <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-3">
          <Input id="expiryDays" type="number" min={1} max={365} value={expiryAlertDays}
            onChange={(e) => setDays(e.target.value)} className="w-28" dir="ltr" />
          <span className="text-sm text-muted-foreground">يوماً</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => mutation.mutate({ orgName, orgSubtitle, expiryAlertDays: Number(expiryAlertDays) })}
          disabled={mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}

// ─── Units Tab ────────────────────────────────────────────────────────────────

function UnitsTab() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const [units, setUnits] = useState<string[]>(DEFAULT_UNITS);
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    if (settings?.unitsList) {
      try {
        const parsed = JSON.parse(settings.unitsList);
        if (Array.isArray(parsed) && parsed.length > 0) setUnits(parsed);
      } catch { /* keep defaults */ }
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (u: string[]) => saveSettings({ unitsList: JSON.stringify(u) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('تم حفظ وحدات القياس');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addUnit = () => {
    const trimmed = newUnit.trim();
    if (!trimmed) return;
    if (units.includes(trimmed)) { toast.error('الوحدة موجودة مسبقاً'); return; }
    const updated = [...units, trimmed];
    setUnits(updated);
    setNewUnit('');
    mutation.mutate(updated);
  };

  const removeUnit = (u: string) => {
    const updated = units.filter((x) => x !== u);
    setUnits(updated);
    mutation.mutate(updated);
  };

  return (
    <div className="bg-card border rounded-lg p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-lg">وحدات القياس</h2>
        <p className="text-sm text-muted-foreground mt-1">
          الوحدات المتاحة عند إضافة مواد جديدة
        </p>
      </div>

      {/* Add new unit */}
      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="أضف وحدة جديدة..."
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addUnit()}
        />
        <Button onClick={addUnit} className="gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" />
          إضافة
        </Button>
      </div>

      {/* Units list */}
      <div className="flex flex-wrap gap-2">
        {units.map((u) => (
          <span
            key={u}
            className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium"
          >
            {u}
            <button
              onClick={() => removeUnit(u)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title={`حذف ${u}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {units.length} وحدة مسجّلة — التغييرات تُحفظ فوراً
      </p>
    </div>
  );
}

// ─── Backup Tab ───────────────────────────────────────────────────────────────

function BackupTab() {
  const [downloading, setDownloading] = useState(false);

  const { data: info, isLoading: infoLoading, refetch } = useQuery({
    queryKey: ['backup-info'],
    queryFn: async () => {
      const res = await fetch('/api/backup/info', { credentials: 'include' });
      if (!res.ok) throw new Error('فشل جلب معلومات قاعدة البيانات');
      return res.json() as Promise<Record<string, number>>;
    },
  });

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/backup/export', { credentials: 'include' });
      if (!res.ok) throw new Error('فشل تصدير البيانات');
      const blob = await res.blob();
      const dateStr = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ems-warehouse-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setDownloading(false);
    }
  };

  const infoRows: [string, string][] = info
    ? [
        ['التصنيفات',        String(info.categories ?? 0)],
        ['المواد والمستهلكات', String(info.items ?? 0)],
        ['التجهيزات',         String(info.equipment ?? 0)],
        ['العمليات (إدخال/إخراج)', String(info.transactions ?? 0)],
        ['الجهات المستلمة',   String(info.recipients ?? 0)],
        ['المستخدمون',        String(info.users ?? 0)],
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stats card */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg">محتويات قاعدة البيانات</h2>
        {infoLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {infoRows.map(([label, value]) => (
              <div key={label} className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{Number(value).toLocaleString('ar')}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export card */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">تصدير نسخة احتياطية</h3>
            <p className="text-sm text-muted-foreground mt-1">
              يُصدَّر ملف JSON يحتوي على جميع بيانات المستودع (المواد، التجهيزات، العمليات، المستخدمون).
              احفظه في مكان آمن وقم بتحديثه بانتظام.
            </p>
          </div>
        </div>
        <Button onClick={handleExport} disabled={downloading} className="gap-2">
          <Download className="h-4 w-4" />
          {downloading ? 'جاري التصدير...' : 'تصدير نسخة احتياطية الآن'}
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-muted/30 border border-dashed rounded-lg p-5 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm font-medium">توصيات النسخ الاحتياطي</p>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 pr-6 list-disc">
          <li>قم بتصدير نسخة احتياطية أسبوعياً على الأقل</li>
          <li>احفظ الملف على قرص خارجي أو مشاركة شبكية</li>
          <li>للاستعادة من نسخة احتياطية، تواصل مع مسؤول النظام التقني</li>
          <li>الملف المُصدَّر بصيغة JSON — لا يحتوي على كلمات مرور</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  type: 'consumable' | 'equipment';
}

function CategoriesTab() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'consumable' | 'equipment'>('consumable');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories-settings'],
    queryFn: async () => {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (!res.ok) throw new Error('فشل جلب التصنيفات');
      return res.json();
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories-settings'] });
    qc.invalidateQueries({ queryKey: ['listCategories'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; throw new Error(e.error || 'خطأ'); }
      return res.json();
    },
    onSuccess: () => { invalidate(); setNewName(''); toast.success('تم إضافة التصنيف'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; throw new Error(e.error || 'خطأ'); }
      return res.json();
    },
    onSuccess: () => { invalidate(); setEditId(null); toast.success('تم تعديل التصنيف'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; throw new Error(e.error || 'خطأ'); }
    },
    onSuccess: () => { invalidate(); toast.success('تم حذف التصنيف'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const typeLabel = { consumable: 'مستهلكات', equipment: 'تجهيزات' };
  const consumable = categories.filter((c) => c.type === 'consumable');
  const equipment  = categories.filter((c) => c.type === 'equipment');

  return (
    <div className="space-y-6">
      {/* Add new */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg">إضافة تصنيف جديد</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 flex-1 min-w-[180px]">
            <Label htmlFor="cat-name-s">اسم التصنيف</Label>
            <Input
              id="cat-name-s"
              placeholder="مثال: مستهلكات طبية، أدوية..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMutation.mutate({ name: newName.trim(), type: newType })}
            />
          </div>
          <div className="space-y-1.5 w-40">
            <Label>النوع</Label>
            <Select value={newType} onValueChange={(v) => setNewType(v as 'consumable' | 'equipment')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consumable">مستهلكات (مواد)</SelectItem>
                <SelectItem value="equipment">تجهيزات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => newName.trim() && createMutation.mutate({ name: newName.trim(), type: newType })}
            disabled={!newName.trim() || createMutation.isPending}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-card border rounded-lg divide-y">
        <div className="px-5 py-3 bg-muted/40 flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            التصنيفات المسجّلة ({categories.length})
          </span>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            لا توجد تصنيفات بعد — أضف واحداً من الأعلى
          </div>
        ) : (
          [
            { label: 'مستهلكات (مواد)', items: consumable },
            { label: 'تجهيزات', items: equipment },
          ].map(({ label, items }) =>
            items.length === 0 ? null : (
              <div key={label}>
                <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                  {label}
                </div>
                {items.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    {editId === cat.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateMutation.mutate({ id: cat.id, name: editName });
                            if (e.key === 'Escape') setEditId(null);
                          }}
                        />
                        <Button size="sm" className="h-8 gap-1" onClick={() => updateMutation.mutate({ id: cat.id, name: editName })} disabled={updateMutation.isPending}>
                          <Save className="w-3.5 h-3.5" />حفظ
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-sm">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{typeLabel[cat.type]}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="تعديل" onClick={() => { setEditId(cat.id); setEditName(cat.name); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="حذف"
                          onClick={() => {
                            if (confirm(`حذف تصنيف "${cat.name}"؟`)) deleteMutation.mutate(cat.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

interface ImportRow {
  [key: string]: string | number | undefined;
}

interface ImportResult {
  created: number;
  errors: { row: number; name: string; error: string }[];
}

function ImportTab() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState('');
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery<{ categories: { id: number; name: string; type: string }[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json() as Promise<{ categories: { id: number; name: string; type: string }[] }>;
    },
  });

  const categories = categoriesData?.categories ?? [];

  const handleExportTemplate = async () => {
    const XLSX = await import('xlsx');

    // Sheet 1: Data headers only — user fills in
    const dataHeaders = [
      'الرمز', 'الاسم *', 'الوحدة *', 'التصنيف',
      'الكمية الحالية', 'الحد الأدنى',
      'تاريخ الانتهاء', 'رقم الدفعة', 'الموقع', 'المورد', 'ملاحظات',
    ];
    const dataWs = XLSX.utils.aoa_to_sheet([dataHeaders]);
    dataWs['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 22 },
      { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
      { wch: 16 }, { wch: 22 }, { wch: 26 },
    ];

    // Sheet 2: Instructions
    const catList = categories.length
      ? categories.map((c) => c.name).join(' — ')
      : 'أضف التصنيفات أولاً من تبويب التصنيفات';
    const instrRows = [
      ['تعليمات الاستخدام — نموذج استيراد المواد'],
      [],
      ['العمود', 'الوصف', 'مطلوب؟', 'ملاحظات'],
      ['الرمز', 'رمز أو كود المادة', 'لا', 'يجب أن يكون فريداً إذا أُدخل'],
      ['الاسم *', 'اسم المادة', 'نعم', ''],
      ['الوحدة *', 'وحدة القياس (مثال: قطعة، رول، لتر)', 'نعم', ''],
      ['التصنيف', 'اسم التصنيف كما هو في النظام', 'لا', catList],
      ['الكمية الحالية', 'الكمية المتوفرة حالياً', 'لا', 'رقم صحيح ≥ 0 — افتراضي: 0'],
      ['الحد الأدنى', 'الحد الأدنى لإطلاق تنبيه النقص', 'لا', 'رقم صحيح ≥ 0 — افتراضي: 0'],
      ['تاريخ الانتهاء', 'تاريخ انتهاء الصلاحية', 'لا', 'الصيغة: YYYY-MM-DD مثال: 2026-12-31'],
      ['رقم الدفعة', 'رقم دفعة الإنتاج', 'لا', ''],
      ['الموقع', 'موقع التخزين داخل المستودع', 'لا', ''],
      ['المورد', 'اسم المورد أو الشركة', 'لا', ''],
      ['ملاحظات', 'أي ملاحظات إضافية', 'لا', ''],
      [],
      ['مثال على صف بيانات:'],
      ['MED-001', 'شاش طبي معقم', 'رول', categories[0]?.name ?? '', '50', '10', '2026-12-31', 'B-2024', 'رف A3', 'شركة الأدوية الوطنية', ''],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instrRows);
    instrWs['!cols'] = [
      { wch: 20 }, { wch: 36 }, { wch: 10 }, { wch: 55 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, 'البيانات');
    XLSX.utils.book_append_sheet(wb, instrWs, 'التعليمات');
    XLSX.writeFile(wb, 'نموذج_استيراد_المواد.xlsx');
    toast.success('تم تحميل النموذج بنجاح');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setResult(null);
    setFileName(file.name);
    setRows([]);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });

      // Prefer "البيانات" sheet, otherwise first sheet
      const sheetName = wb.SheetNames.includes('البيانات')
        ? 'البيانات'
        : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: '' });

      if (data.length === 0) {
        setParseError('لم يتم العثور على بيانات في الملف — تأكد من تعبئة ورقة "البيانات"');
        return;
      }
      setRows(data);
    } catch {
      setParseError('فشل قراءة الملف — تأكد أنه ملف Excel صالح (.xlsx أو .xls)');
    }
    e.target.value = '';
  };

  const getName = (r: ImportRow) =>
    String(r['الاسم *'] ?? r['الاسم'] ?? '').trim();
  const getUnit = (r: ImportRow) =>
    String(r['الوحدة *'] ?? r['الوحدة'] ?? '').trim();

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);

    const payload = rows.map((r) => ({
      code: String(r['الرمز'] ?? '').trim() || null,
      name: getName(r),
      unit: getUnit(r),
      categoryName: String(r['التصنيف'] ?? '').trim() || null,
      currentStock: r['الكمية الحالية'] ?? 0,
      minStock: r['الحد الأدنى'] ?? 0,
      expiryDate: String(r['تاريخ الانتهاء'] ?? '').trim() || null,
      batchNumber: String(r['رقم الدفعة'] ?? '').trim() || null,
      location: String(r['الموقع'] ?? '').trim() || null,
      supplier: String(r['المورد'] ?? '').trim() || null,
      notes: String(r['ملاحظات'] ?? '').trim() || null,
    }));

    try {
      const res = await fetch('/api/items/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (data.created > 0) {
        toast.success(`تم استيراد ${data.created} مادة بنجاح`);
        void queryClient.invalidateQueries({ queryKey: ['items'] });
        setRows([]);
        setFileName('');
      } else {
        toast.error('لم يتم استيراد أي مادة — راجع الأخطاء أدناه');
      }
    } catch {
      toast.error('حدث خطأ أثناء الاستيراد');
    } finally {
      setImporting(false);
    }
  };

  const previewCols: { label: string; get: (r: ImportRow) => string }[] = [
    { label: 'الاسم', get: (r) => getName(r) || '—' },
    { label: 'الوحدة', get: (r) => getUnit(r) || '—' },
    { label: 'التصنيف', get: (r) => String(r['التصنيف'] ?? '') || '—' },
    { label: 'الكمية', get: (r) => String(r['الكمية الحالية'] ?? 0) },
    { label: 'الحد الأدنى', get: (r) => String(r['الحد الأدنى'] ?? 0) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">استيراد المواد من Excel</h3>
        <p className="text-sm text-muted-foreground mt-1">
          حمّل النموذج الفارغ، أدخل بيانات المواد، ثم استوردها للنظام دفعةً واحدة.
        </p>
      </div>

      {/* Step 1 — Download template */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">١</span>
          <span className="font-medium text-sm">حمّل النموذج الفارغ</span>
        </div>
        <p className="text-xs text-muted-foreground">
          ملف Excel جاهز بأعمدة المواد وورقة تعليمات مفصّلة.
          الحقلان المطلوبان هما <strong>الاسم</strong> و<strong>الوحدة</strong> فقط.
        </p>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleExportTemplate()}>
          <Download className="h-4 w-4" />
          تحميل نموذج Excel
        </Button>
      </div>

      {/* Step 2 — Upload file */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">٢</span>
          <span className="font-medium text-sm">ارفع الملف المعبأ</span>
        </div>
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors">
          <div className="flex flex-col items-center gap-1 pointer-events-none">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {fileName ? fileName : 'اضغط لاختيار ملف Excel'}
            </span>
            {!fileName && <span className="text-xs text-muted-foreground">.xlsx أو .xls</span>}
          </div>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={(e) => void handleFileChange(e)}
          />
        </label>
        {parseError && <p className="text-sm text-destructive">{parseError}</p>}
        {rows.length > 0 && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            تم قراءة <strong>{rows.length}</strong> صف من الملف
          </p>
        )}
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-medium">معاينة البيانات</span>
            <span className="text-xs text-muted-foreground">
              {rows.length > 5 ? `أول 5 صفوف من ${rows.length}` : `${rows.length} صف`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  {previewCols.map((c) => (
                    <th key={c.label} className="px-3 py-2 text-right font-medium text-muted-foreground">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                    {previewCols.map((c) => (
                      <td key={c.label} className="px-3 py-2">{c.get(r)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3 — Import */}
      {rows.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">٣</span>
            <span className="font-medium text-sm">ابدأ الاستيراد</span>
          </div>
          <Button onClick={() => void handleImport()} disabled={importing} className="gap-2">
            {importing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileSpreadsheet className="h-4 w-4" />}
            {importing ? 'جارٍ الاستيراد…' : `استيراد ${rows.length} مادة`}
          </Button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={`rounded-lg border p-4 space-y-2 ${
          result.created > 0
            ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900'
            : 'border-destructive/30 bg-destructive/5'
        }`}>
          <div className="flex items-center gap-2">
            {result.created > 0
              ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              : <X className="h-5 w-5 text-destructive" />}
            <span className="font-medium text-sm">
              {result.created > 0
                ? `تم استيراد ${result.created} مادة بنجاح`
                : 'لم يتم استيراد أي مادة'}
            </span>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                الأخطاء ({result.errors.length} صف):
              </p>
              <div className="max-h-36 overflow-y-auto space-y-0.5 rounded border bg-background p-2">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    صف {e.row}: <span className="font-medium">{e.name}</span> — {e.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
