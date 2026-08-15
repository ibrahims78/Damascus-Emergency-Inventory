import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  useCreateCentralReturnTransaction,
  useCreateCustodyOutTransaction,
  useCreateCustodyReturnTransaction,
  useCreateDamageTransaction,
  useListCustodies,
  useListEquipment,
  useListItems,
  useListRecipients,
  type Equipment,
  type Item,
} from '@workspace/api-client-react';
import {
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  FileWarning,
  RotateCcw,
  Save,
  ShieldAlert,
  UserRoundCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

function errorMessage(error: unknown) {
  const response = (error as { response?: { data?: { error?: string } } })?.response;
  return response?.data?.error || 'تعذر حفظ الحركة، يرجى مراجعة البيانات والمحاولة مرة أخرى';
}

function PageFrame({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof UserRoundCheck;
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/transactions')} aria-label="العودة">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function FormCard({
  children,
  onSubmit,
  pending,
  confirming,
  onCancelConfirm,
  submitLabel,
}: {
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent) => void;
  pending: boolean;
  confirming: boolean;
  onCancelConfirm: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
      {children}
      {confirming && !pending && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">يرجى تأكيد الحركة</p>
            <p className="mt-1">سيتم إنشاء مستند مستقل وسجل تدقيق، ولا يمكن حذف الحركة بعد حفظها.</p>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-3 border-t pt-4">
        {confirming && !pending && (
          <Button type="button" variant="ghost" onClick={onCancelConfirm}>
            تعديل البيانات
          </Button>
        )}
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              {confirming ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {confirming ? 'تأكيد وتسجيل الحركة' : submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function EntityPicker({
  type,
  itemId,
  equipmentId,
  onTypeChange,
  onItemChange,
  onEquipmentChange,
}: {
  type: 'item' | 'equipment';
  itemId: number | null;
  equipmentId: number | null;
  onTypeChange: (type: 'item' | 'equipment') => void;
  onItemChange: (id: number | null) => void;
  onEquipmentChange: (id: number | null) => void;
}) {
  const { data: itemsData } = useListItems({ limit: 500 });
  const { data: equipmentData } = useListEquipment({ limit: 500 });
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex gap-2">
        <Button type="button" variant={type === 'item' ? 'default' : 'outline'} className="flex-1" onClick={() => onTypeChange('item')}>
          مادة / مستهلك
        </Button>
        <Button type="button" variant={type === 'equipment' ? 'default' : 'outline'} className="flex-1" onClick={() => onTypeChange('equipment')}>
          تجهيز / ثابت
        </Button>
      </div>
      {type === 'item' ? (
        <Field label="المادة" required>
          <Select value={itemId ? String(itemId) : ''} onValueChange={(value) => onItemChange(Number(value))}>
            <SelectTrigger><SelectValue placeholder="اختر المادة..." /></SelectTrigger>
            <SelectContent>
              {itemsData?.items.filter((item: Item) => item.isActive).map((item: Item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name} — المتاح {item.currentStock} {item.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Field label="التجهيز" required>
          <Select value={equipmentId ? String(equipmentId) : ''} onValueChange={(value) => onEquipmentChange(Number(value))}>
            <SelectTrigger><SelectValue placeholder="اختر التجهيز..." /></SelectTrigger>
            <SelectContent>
              {equipmentData?.equipment.map((equipment: Equipment) => (
                <SelectItem key={equipment.id} value={String(equipment.id)}>
                  {equipment.name} — المتاح {equipment.quantity} {equipment.serialNumber ? `(S/N: ${equipment.serialNumber})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

export function CustodyOutForm() {
  const [, setLocation] = useLocation();
  const { data: recipients } = useListRecipients();
  const mutation = useCreateCustodyOutTransaction();
  const [equipmentId, setEquipmentId] = useState<number | null>(null);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [holderName, setHolderName] = useState('');
  const [noteNumber, setNoteNumber] = useState('');
  const [date, setDate] = useState(today());
  const [location, setLocationValue] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!equipmentId || !holderName.trim() || !noteNumber.trim() || !location.trim()) {
      toast.error('يرجى تعبئة التجهيز والمستلم ورقم المذكرة والمكان');
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    mutation.mutate(
      { data: { itemType: 'equipment', equipmentId, quantity, recipientId, holderName: holderName.trim(), custodyNoteNumber: noteNumber.trim(), custodyDate: date, custodyLocation: location.trim(), notes: notes.trim() || null } },
      {
        onSuccess: (transaction) => { toast.success('تم تسجيل تسليم العهدة بنجاح'); setLocation(`/print/${transaction.id}`); },
        onError: (error) => { toast.error(errorMessage(error)); setConfirming(false); },
      },
    );
  };

  return (
    <PageFrame title="تسليم عهدة شخصية" description="تخصيص تجهيز لمستلم دون اعتباره مادة مستهلكة" icon={UserRoundCheck}>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold text-primary">قاعدة الرصيد</p>
        <p className="mt-1 text-muted-foreground">التسليم يزيد العهدة المفتوحة فقط، ولا يخفض إجمالي رصيد التجهيز التشغيلي.</p>
      </div>
      <FormCard onSubmit={submit} pending={mutation.isPending} confirming={confirming} onCancelConfirm={() => setConfirming(false)} submitLabel="تسجيل تسليم العهدة">
        <Field label="التجهيز" required>
          <EquipmentOnlyPicker equipmentId={equipmentId} onChange={setEquipmentId} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المستلم" required><Input value={holderName} onChange={(e) => { setHolderName(e.target.value); setConfirming(false); }} placeholder="اسم الموظف أو المسؤول" /></Field>
          <Field label="الجهة / المستلم المسجل">
            <Select value={recipientId ? String(recipientId) : ''} onValueChange={(value) => setRecipientId(Number(value))}>
              <SelectTrigger><SelectValue placeholder="اختياري — اختر من القائمة" /></SelectTrigger>
              <SelectContent>{recipients?.map((recipient) => <SelectItem key={recipient.id} value={String(recipient.id)}>{recipient.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="رقم مذكرة تسليم العهدة" required><Input value={noteNumber} onChange={(e) => { setNoteNumber(e.target.value); setConfirming(false); }} /></Field>
          <Field label="تاريخ التسليم" required><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setConfirming(false); }} /></Field>
          <Field label="الكمية" required hint="للتجهيز ذي الرقم التسلسلي يجب أن تكون 1"><Input type="number" min={1} value={quantity} onChange={(e) => { setQuantity(e.target.valueAsNumber || 1); setConfirming(false); }} /></Field>
          <Field label="مكان العهدة" required><Input value={location} onChange={(e) => { setLocationValue(e.target.value); setConfirming(false); }} placeholder="مثال: سيارة الإسعاف 12" /></Field>
        </div>
        <Field label="ملاحظات"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24" /></Field>
      </FormCard>
    </PageFrame>
  );
}

function EquipmentOnlyPicker({ equipmentId, onChange }: { equipmentId: number | null; onChange: (id: number | null) => void }) {
  const { data } = useListEquipment({ limit: 500 });
  return (
    <Select value={equipmentId ? String(equipmentId) : ''} onValueChange={(value) => onChange(Number(value))}>
      <SelectTrigger><SelectValue placeholder="اختر التجهيز..." /></SelectTrigger>
      <SelectContent>{data?.equipment.map((equipment: Equipment) => <SelectItem key={equipment.id} value={String(equipment.id)}>{equipment.name} — الكمية {equipment.quantity}{equipment.serialNumber ? ` — S/N ${equipment.serialNumber}` : ''}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function CustodyReturnForm() {
  const [, setLocation] = useLocation();
  const { data: custodies, isLoading } = useListCustodies();
  const mutation = useCreateCustodyReturnTransaction();
  const openCustodies = useMemo(() => (custodies ?? []).filter((custody) => custody.outstandingQuantity > 0), [custodies]);
  const [custodyId, setCustodyId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<'good' | 'damaged' | 'needs_maintenance' | 'missing'>('good');
  const [date, setDate] = useState(today());
  const [returnedToLocation, setReturnedToLocation] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const selected = openCustodies.find((custody) => custody.id === custodyId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !returnedToLocation.trim() || quantity < 1 || quantity > selected.outstandingQuantity) {
      toast.error(selected ? `كمية الإعادة يجب ألا تتجاوز ${selected.outstandingQuantity}` : 'اختر عهدة مفتوحة ومكان الإعادة');
      return;
    }
    if (!confirming) { setConfirming(true); return; }
    mutation.mutate(
      { data: { custodyId: selected.id, quantity, returnCondition: condition, returnedToLocation: returnedToLocation.trim(), documentDate: date, inspectionNotes: inspectionNotes.trim() || null } },
      {
        onSuccess: (transaction) => { toast.success('تم تسجيل إعادة العهدة'); setLocation(`/print/${transaction.id}`); },
        onError: (error) => { toast.error(errorMessage(error)); setConfirming(false); },
      },
    );
  };

  return (
    <PageFrame title="إعادة عهدة شخصية" description="إعادة كل العهدة أو جزء منها مع توثيق حالتها" icon={RotateCcw}>
      <FormCard onSubmit={submit} pending={mutation.isPending} confirming={confirming} onCancelConfirm={() => setConfirming(false)} submitLabel="تسجيل إعادة العهدة">
        <Field label="العهدة المفتوحة" required hint={isLoading ? 'جاري تحميل العهد...' : 'تظهر العهد التي ما زال لها رصيد غير معاد فقط'}>
          <Select value={custodyId ? String(custodyId) : ''} onValueChange={(value) => { setCustodyId(Number(value)); setQuantity(1); setConfirming(false); }}>
            <SelectTrigger><SelectValue placeholder="اختر العهدة..." /></SelectTrigger>
            <SelectContent>
              {openCustodies.map((custody) => <SelectItem key={custody.id} value={String(custody.id)}>{custody.equipmentName} — {custody.holderName} — المتبقي {custody.outstandingQuantity}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {selected && <div className="flex flex-wrap gap-2 rounded-lg bg-muted/40 p-3 text-sm"><Badge variant="outline">السند: {selected.deliveryNoteNumber}</Badge><Badge variant="outline">المكان: {selected.location}</Badge><Badge variant="secondary">المتبقي: {selected.outstandingQuantity}</Badge></div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الكمية المعادة" required><Input type="number" min={1} max={selected?.outstandingQuantity ?? 1} value={quantity} onChange={(e) => { setQuantity(e.target.valueAsNumber || 1); setConfirming(false); }} /></Field>
          <Field label="حالة الصنف عند الإعادة" required>
            <Select value={condition} onValueChange={(value) => { setCondition(value as typeof condition); setConfirming(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="good">جيد</SelectItem><SelectItem value="damaged">تالف</SelectItem><SelectItem value="needs_maintenance">يحتاج صيانة</SelectItem><SelectItem value="missing">مفقود</SelectItem></SelectContent></Select>
          </Field>
          <Field label="تاريخ الإعادة" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="المكان الذي عاد إليه" required><Input value={returnedToLocation} onChange={(e) => { setReturnedToLocation(e.target.value); setConfirming(false); }} placeholder="المستودع أو موقع الفحص" /></Field>
        </div>
        <Field label="ملاحظات الفحص"><Textarea value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} className="min-h-24" /></Field>
      </FormCard>
    </PageFrame>
  );
}

function MovementEntityForm({
  title,
  description,
  icon,
  kind,
}: {
  title: string;
  description: string;
  icon: typeof FileWarning;
  kind: 'damage' | 'central-return';
}) {
  const [, setLocation] = useLocation();
  const damageMutation = useCreateDamageTransaction();
  const returnMutation = useCreateCentralReturnTransaction();
  const [type, setType] = useState<'item' | 'equipment'>('equipment');
  const [itemId, setItemId] = useState<number | null>(null);
  const [equipmentId, setEquipmentId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<'good' | 'damaged' | 'needs_maintenance' | 'missing'>('damaged');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const pending = damageMutation.isPending || returnMutation.isPending;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedId = type === 'item' ? itemId : equipmentId;
    if (!selectedId || quantity < 1 || !reason.trim() || !date) {
      toast.error('يرجى اختيار الصنف وإدخال الكمية والسبب والتاريخ');
      return;
    }
    if (!confirming) { setConfirming(true); return; }
    const callbacks = {
      onSuccess: (transaction: { id: number }) => { toast.success(kind === 'damage' ? 'تم تسجيل التلف' : 'تم تسجيل المرتجع المركزي'); setLocation(`/print/${transaction.id}`); },
      onError: (error: unknown) => { toast.error(errorMessage(error)); setConfirming(false); },
    };
    if (kind === 'damage') {
      damageMutation.mutate({ data: { itemType: type, itemId: type === 'item' ? itemId : null, equipmentId: type === 'equipment' ? equipmentId : null, quantity, reason: reason.trim(), damageDate: date, notes: notes.trim() || null } }, callbacks);
    } else {
      returnMutation.mutate({ data: { itemType: type, itemId: type === 'item' ? itemId : null, equipmentId: type === 'equipment' ? equipmentId : null, quantity, returnCondition: condition, reason: reason.trim(), documentDate: date, notes: notes.trim() || null } }, callbacks);
    }
  };

  return (
    <PageFrame title={title} description={description} icon={icon}>
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
        <p className="font-semibold text-destructive">{kind === 'damage' ? 'حركة تلف موثقة' : 'حركة مرتجع مستقلة'}</p>
        <p className="mt-1 text-muted-foreground">{kind === 'damage' ? 'لا تعدل الرصيد مباشرة؛ ينشئ النظام حركة تلف وسجل تدقيق ويستهلك الكمية المناسبة.' : 'المرتجع المركزي ليس إعادة عهدة، ويُسجل بمستند مستقل إلى المستودعات المركزية.'}</p>
      </div>
      <FormCard onSubmit={submit} pending={pending} confirming={confirming} onCancelConfirm={() => setConfirming(false)} submitLabel={kind === 'damage' ? 'تسجيل التلف' : 'تسجيل المرتجع'}>
        <EntityPicker type={type} itemId={itemId} equipmentId={equipmentId} onTypeChange={(value) => { setType(value); setItemId(null); setEquipmentId(null); setConfirming(false); }} onItemChange={(id) => { setItemId(id); setConfirming(false); }} onEquipmentChange={(id) => { setEquipmentId(id); setConfirming(false); }} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الكمية" required><Input type="number" min={1} value={quantity} onChange={(e) => { setQuantity(e.target.valueAsNumber || 1); setConfirming(false); }} /></Field>
          <Field label={kind === 'damage' ? 'تاريخ التلف' : 'تاريخ المرتجع'} required><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setConfirming(false); }} /></Field>
          {kind === 'central-return' && (
            <Field label="حالة المرتجع" required><Select value={condition} onValueChange={(value) => { setCondition(value as typeof condition); setConfirming(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="good">جيد</SelectItem><SelectItem value="damaged">تالف</SelectItem><SelectItem value="needs_maintenance">يحتاج صيانة</SelectItem><SelectItem value="missing">مفقود</SelectItem></SelectContent></Select></Field>
          )}
          <Field label="السبب" required><Input value={reason} onChange={(e) => { setReason(e.target.value); setConfirming(false); }} placeholder="اكتب السبب بالتفصيل" /></Field>
        </div>
        <Field label="ملاحظات / رقم المحضر"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24" /></Field>
      </FormCard>
    </PageFrame>
  );
}

export function DamageForm() {
  return <MovementEntityForm title="تسجيل تلف" description="إثبات تلف مادة أو تجهيز مع أثر واضح على الرصيد" icon={FileWarning} kind="damage" />;
}

export function CentralReturnForm() {
  return <MovementEntityForm title="مرتجع إلى المستودع المركزي" description="تسجيل خروج مستقل للصنف المرتجع إلى المستودعات المركزية" icon={ArchiveRestore} kind="central-return" />;
}