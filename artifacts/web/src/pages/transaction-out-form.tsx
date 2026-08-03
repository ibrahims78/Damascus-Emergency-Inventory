import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useListItems,
  useListEquipment,
  useListRecipients,
  useListExitReasons,
  useCreateOutTransaction,
} from '@workspace/api-client-react';
import {
  ArrowRight,
  Save,
  PackageMinus,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  itemType: z.enum(['item', 'equipment']),
  itemId: z.coerce.number().optional().nullable(),
  equipmentId: z.coerce.number().optional().nullable(),
  quantity: z.coerce.number().min(1, 'الكمية يجب أن تكون 1 على الأقل').optional().nullable(),
  recipientId: z.coerce.number().min(1, 'الجهة المستلمة مطلوبة'),
  recipientPerson: z.string().optional().nullable(),
  exitReasonId: z.coerce.number().min(1, 'سبب الإخراج مطلوب'),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function TransactionOutForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const { data: itemsData } = useListItems({ limit: 500 });
  const { data: equipmentData } = useListEquipment({ limit: 500 });
  const { data: recipients } = useListRecipients();
  const { data: exitReasons } = useListExitReasons();
  const mutation = useCreateOutTransaction();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemType: 'item',
      itemId: null,
      equipmentId: null,
      quantity: 1,
      recipientId: 0,
      recipientPerson: '',
      exitReasonId: 0,
      notes: '',
    },
  });

  const watchItemType = form.watch('itemType');
  const watchItemId = form.watch('itemId');
  const watchEquipmentId = form.watch('equipmentId');
  const watchQuantity = form.watch('quantity') ?? 0;

  const selectedItem =
    watchItemType === 'item' && watchItemId
      ? itemsData?.items.find((i) => i.id === Number(watchItemId))
      : null;

  const selectedEquipment =
    watchItemType === 'equipment' && watchEquipmentId
      ? equipmentData?.equipment.find((e) => e.id === Number(watchEquipmentId))
      : null;

  const quantityExceedsStock =
    selectedItem != null && watchQuantity > 0
      ? watchQuantity > selectedItem.currentStock
      : false;

  const wouldBeBelowMin =
    selectedItem != null && watchQuantity > 0 && !quantityExceedsStock
      ? selectedItem.currentStock - watchQuantity < selectedItem.minStock
      : false;

  const handleSubmit = (data: FormValues) => {
    // Validate item/equipment selection
    if (data.itemType === 'item' && !data.itemId) {
      form.setError('itemId', { message: 'يرجى اختيار المادة' });
      return;
    }
    if (data.itemType === 'equipment' && !data.equipmentId) {
      form.setError('equipmentId', { message: 'يرجى اختيار التجهيز' });
      return;
    }
    if (data.itemType === 'item' && (!data.quantity || data.quantity < 1)) {
      form.setError('quantity', { message: 'الكمية يجب أن تكون 1 على الأقل' });
      return;
    }

    // Hard block: quantity exceeds stock
    if (quantityExceedsStock) {
      toast({
        variant: 'destructive',
        description: `الكمية المطلوبة (${data.quantity}) تتجاوز الرصيد المتاح (${selectedItem?.currentStock} ${selectedItem?.unit})`,
      });
      return;
    }

    // First press: show confirmation
    if (!pendingConfirm) {
      setPendingConfirm(true);
      return;
    }

    // Second press: submit
    mutation.mutate(
      {
        data: {
          itemType: data.itemType as 'item' | 'equipment',
          itemId: data.itemType === 'item' ? (data.itemId ?? null) : null,
          equipmentId:
            data.itemType === 'equipment' ? (data.equipmentId ?? null) : null,
          quantity: data.itemType === 'item' ? (data.quantity ?? null) : null,
          recipientId: data.recipientId,
          recipientPerson: data.recipientPerson || null,
          exitReasonId: data.exitReasonId,
          notes: data.notes || null,
        },
      },
      {
        onSuccess: (tx) => {
          toast({ description: '✅ تم تسجيل عملية الإخراج بنجاح' });
          setLocation(`/print/${tx.id}`);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || 'حدث خطأ أثناء الحفظ';
          toast({ variant: 'destructive', description: msg });
          setPendingConfirm(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/transactions')}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <PackageMinus className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">تسجيل إخراج مادة</h1>
            <p className="text-sm text-muted-foreground">صرف كمية من المخزون</p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Item Type Toggle */}
            <FormField
              control={form.control}
              name="itemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الصنف *</FormLabel>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={field.value === 'item' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        field.onChange('item');
                        form.setValue('equipmentId', null);
                        form.clearErrors('equipmentId');
                        setPendingConfirm(false);
                      }}
                    >
                      مادة / مستهلك
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'equipment' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        field.onChange('equipment');
                        form.setValue('itemId', null);
                        form.setValue('quantity', null);
                        form.clearErrors('itemId');
                        setPendingConfirm(false);
                      }}
                    >
                      تجهيز / معدة
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            {/* Item Select */}
            {watchItemType === 'item' && (
              <FormField
                control={form.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المادة *</FormLabel>
                    <Select
                      value={field.value ? field.value.toString() : ''}
                      onValueChange={(v) => {
                        field.onChange(parseInt(v));
                        setPendingConfirm(false);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المادة من القائمة..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {itemsData?.items
                          .filter((i) => i.isActive)
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name}
                              {item.code ? ` (${item.code})` : ''} — رصيد:{' '}
                              {item.currentStock} {item.unit}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {/* Stock Info */}
                    {selectedItem && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-md flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">الرصيد الحالي:</span>
                        <Badge
                          variant={
                            selectedItem.currentStock <= selectedItem.minStock
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {selectedItem.currentStock} {selectedItem.unit}
                        </Badge>
                        <span className="text-muted-foreground">الحد الأدنى:</span>
                        <Badge variant="outline">
                          {selectedItem.minStock} {selectedItem.unit}
                        </Badge>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Equipment Select */}
            {watchItemType === 'equipment' && (
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التجهيز *</FormLabel>
                    <Select
                      value={field.value ? field.value.toString() : ''}
                      onValueChange={(v) => {
                        field.onChange(parseInt(v));
                        setPendingConfirm(false);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التجهيز من القائمة..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipmentData?.equipment
                          .filter((e) => e.condition !== 'consumed')
                          .map((eq) => (
                            <SelectItem key={eq.id} value={eq.id.toString()}>
                              {eq.name}
                              {eq.serialNumber ? ` — ${eq.serialNumber}` : ''}
                              {eq.model ? ` (${eq.model})` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Quantity (items only) */}
            {watchItemType === 'item' && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      الكمية *
                      {selectedItem && (
                        <span className="font-normal text-muted-foreground mr-2 text-xs">
                          (الحد الأقصى: {selectedItem.currentStock} {selectedItem.unit})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={selectedItem?.currentStock}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          field.onChange(
                            e.target.value === '' ? null : e.target.valueAsNumber,
                          );
                          setPendingConfirm(false);
                        }}
                        className={`max-w-[180px] ${quantityExceedsStock ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      />
                    </FormControl>

                    {/* Stock Warnings */}
                    {quantityExceedsStock && (
                      <div className="flex items-center gap-2 text-destructive text-sm mt-1 p-2 bg-destructive/10 rounded">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>
                          الكمية تتجاوز الرصيد المتاح (
                          {selectedItem?.currentStock} {selectedItem?.unit})
                        </span>
                      </div>
                    )}
                    {wouldBeBelowMin && (
                      <div className="flex items-center gap-2 text-warning text-sm mt-1 p-2 bg-warning/10 rounded">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          تحذير: الرصيد بعد الإخراج ({selectedItem!.currentStock - watchQuantity}{' '}
                          {selectedItem?.unit}) سيكون أقل من الحد الأدنى (
                          {selectedItem?.minStock} {selectedItem?.unit})
                        </span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Recipient */}
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الجهة المستلمة *</FormLabel>
                  <Select
                    value={field.value && field.value > 0 ? field.value.toString() : ''}
                    onValueChange={(v) => {
                      field.onChange(parseInt(v));
                      setPendingConfirm(false);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الجهة المستلمة..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recipients?.map((r) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recipient Person */}
            <FormField
              control={form.control}
              name="recipientPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المستلم (اختياري)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="اسم الشخص المستلم داخل الجهة"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exit Reason */}
            <FormField
              control={form.control}
              name="exitReasonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب الإخراج *</FormLabel>
                  <Select
                    value={field.value && field.value > 0 ? field.value.toString() : ''}
                    onValueChange={(v) => {
                      field.onChange(parseInt(v));
                      setPendingConfirm(false);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر سبب الإخراج..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exitReasons?.map((r) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      className="h-20 resize-none"
                      placeholder="أي ملاحظات إضافية..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmation Banner */}
            {pendingConfirm && !mutation.isPending && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-md text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">تأكيد عملية الإخراج</p>
                  <p className="text-foreground/80">
                    سيتم تسجيل إخراج{' '}
                    {watchItemType === 'item' ? (
                      <>
                        <strong>{selectedItem?.name}</strong> بكمية{' '}
                        <strong>
                          {watchQuantity} {selectedItem?.unit}
                        </strong>
                      </>
                    ) : (
                      <strong>{selectedEquipment?.name}</strong>
                    )}
                    {wouldBeBelowMin && (
                      <span className="text-warning font-medium">
                        {' '}(تحذير: سيكون الرصيد تحت الحد الأدنى)
                      </span>
                    )}
                    . اضغط "تأكيد وطباعة" للمتابعة.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/transactions')}
                disabled={mutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending || quantityExceedsStock}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {mutation.isPending
                  ? 'جاري الحفظ...'
                  : pendingConfirm
                    ? 'تأكيد وطباعة السند'
                    : 'حفظ وطباعة السند'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
