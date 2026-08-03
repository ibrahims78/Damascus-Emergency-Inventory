import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { Settings2, KeyRound, Building2, Save, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SystemSettings {
  id: number;
  orgName: string;
  orgSubtitle?: string | null;
  expiryAlertDays: number;
  setupCompleted: boolean;
  updatedAt: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch('/api/settings', { credentials: 'include' });
  if (!res.ok) throw new Error('فشل جلب الإعدادات');
  return res.json() as Promise<SystemSettings>;
}

async function saveSettings(data: Partial<Pick<SystemSettings, 'orgName' | 'orgSubtitle' | 'expiryAlertDays'>>): Promise<SystemSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || 'فشل حفظ الإعدادات');
  }
  return res.json() as Promise<SystemSettings>;
}

async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
  const res = await fetch('/api/settings/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || 'فشل تغيير كلمة المرور');
  }
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { data: currentUser } = useGetCurrentUser();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">
          إعدادات المنظومة والملف الشخصي
        </p>
      </div>

      <Tabs defaultValue="profile" dir="rtl">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <UserIcon className="h-4 w-4" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <KeyRound className="h-4 w-4" />
            كلمة المرور
          </TabsTrigger>
          {currentUser?.role === 'admin' && (
            <TabsTrigger value="org" className="gap-2">
              <Building2 className="h-4 w-4" />
              إعدادات المنظومة
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={currentUser} />
        </TabsContent>

        <TabsContent value="password">
          <PasswordTab />
        </TabsContent>

        {currentUser?.role === 'admin' && (
          <TabsContent value="org">
            <OrgTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user?: { fullName?: string; username?: string; role?: string } | null }) {
  const roleLabel: Record<string, string> = {
    admin: 'مدير نظام',
    warehouse_manager: 'أمين مستودع',
    viewer: 'مراقب',
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-base">معلومات الحساب</h2>
      </div>

      <div className="grid gap-5">
        <div className="space-y-1.5">
          <Label>الاسم الكامل</Label>
          <Input value={user?.fullName ?? ''} disabled className="bg-muted/50 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground">لتعديل الاسم يُرجى التواصل مع مدير النظام</p>
        </div>

        <div className="space-y-1.5">
          <Label>اسم المستخدم</Label>
          <Input value={user?.username ?? ''} disabled dir="ltr" className="bg-muted/50 cursor-not-allowed" />
        </div>

        <div className="space-y-1.5">
          <Label>الدور الحالي</Label>
          <Input
            value={roleLabel[user?.role ?? ''] ?? user?.role ?? ''}
            disabled
            className="bg-muted/50 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Password Tab ──────────────────────────────────────────────────────────────

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      if (msg.includes('الحالية') || msg.includes('current') || msg.includes('401')) {
        setErrors((e) => ({ ...e, current: msg }));
      } else {
        toast.error(msg);
      }
    },
  });

  const handleSubmit = () => {
    const errs: typeof errors = {};
    if (!currentPassword) errs.current = 'كلمة المرور الحالية مطلوبة';
    if (!newPassword) errs.new = 'كلمة المرور الجديدة مطلوبة';
    else if (newPassword.length < 8) errs.new = 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل';
    if (!confirmPassword) errs.confirm = 'تأكيد كلمة المرور مطلوب';
    else if (newPassword !== confirmPassword) errs.confirm = 'كلمتا المرور غير متطابقتين';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-base">تغيير كلمة المرور</h2>
      </div>

      <div className="grid gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="cur-pw">كلمة المرور الحالية <span className="text-destructive">*</span></Label>
          <Input
            id="cur-pw"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            dir="ltr"
          />
          {errors.current && <p className="text-xs text-destructive">{errors.current}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-pw">كلمة المرور الجديدة <span className="text-destructive">*</span></Label>
          <Input
            id="new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            dir="ltr"
          />
          {errors.new && <p className="text-xs text-destructive">{errors.new}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="conf-pw">تأكيد كلمة المرور الجديدة <span className="text-destructive">*</span></Label>
          <Input
            id="conf-pw"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            dir="ltr"
          />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
        </Button>
      </div>
    </div>
  );
}

// ─── Org Settings Tab ─────────────────────────────────────────────────────────

function OrgTab() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const [orgName, setOrgName] = useState('');
  const [orgSubtitle, setOrgSubtitle] = useState('');
  const [expiryAlertDays, setExpiryAlertDays] = useState('30');

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      setOrgName(settings.orgName);
      setOrgSubtitle(settings.orgSubtitle ?? '');
      setExpiryAlertDays(String(settings.expiryAlertDays));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      toast.error(msg);
    },
  });

  const handleSave = () => {
    const days = parseInt(expiryAlertDays, 10);
    if (!orgName.trim()) { toast.error('اسم المنظومة مطلوب'); return; }
    if (isNaN(days) || days < 1 || days > 365) { toast.error('عدد الأيام يجب أن يكون بين 1 و 365'); return; }
    mutation.mutate({ orgName: orgName.trim(), orgSubtitle: orgSubtitle.trim() || undefined, expiryAlertDays: days });
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg shadow-sm p-6 flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-base">إعدادات المنظومة</h2>
      </div>

      <div className="grid gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="orgName">
            اسم المنظومة الرسمي <span className="text-destructive">*</span>
          </Label>
          <Input
            id="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="مديرية الاحالة والإسعاف والطوارئ - دمشق"
          />
          <p className="text-xs text-muted-foreground">يظهر هذا الاسم في رأس سندات الإدخال والإخراج</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgSubtitle">العنوان الفرعي (اختياري)</Label>
          <Input
            id="orgSubtitle"
            value={orgSubtitle}
            onChange={(e) => setOrgSubtitle(e.target.value)}
            placeholder="مثال: مستودع مواد الإسعاف"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expiryDays">
            عدد أيام التنبيه قبل انتهاء الصلاحية <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="expiryDays"
              type="number"
              min={1}
              max={365}
              value={expiryAlertDays}
              onChange={(e) => setExpiryAlertDays(e.target.value)}
              className="w-32"
              dir="ltr"
            />
            <span className="text-sm text-muted-foreground">يوماً</span>
          </div>
          <p className="text-xs text-muted-foreground">
            تُعرض التنبيهات للأصناف التي ستنتهي صلاحيتها خلال هذه الفترة
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}
