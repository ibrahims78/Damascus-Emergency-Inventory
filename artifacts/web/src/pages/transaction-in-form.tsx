import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useListItems,
  useListEquipment,
  useCreateInTransaction,
} from '@workspace/api-client-react';
import { ArrowRight, Save, PackagePlus, CheckCircle2 } from 'lucide-react';
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
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function TransactionInForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const { data: itemsData } = useListItems({ limit: 500 });
  const { data: equipmentData } = useListEquipment({ limit: 500 });
  const mutation = useCreateInTransaction();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemType: 'item',
      itemId: null,
      equipmentId: null,
      quantity: 1,
      supplier: '',
      notes: '',
    },
  });

  const watchItemType = form.watch('itemType');
  const watchItemId = form.watch('itemId');
  const watchEquipmentId = form.watch('equipmentId');
  const watchQuantity = form.watch('quantity');

  const selectedItem =
    watchItemType === 'item' && watchItemId
      ? itemsData?.items.find((i) => i.id === Number(watchItemId))
      : null;

  const selectedEquipment =
    watchItemType === 'equipment' && watchEquipmentId
      ? equipmentData?.equipment.find((e) => e.id === Number(watchEquipmentId))
      : null;

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
          equipmentId: data.itemType === 'equipment' ? (data.equipmentId ?? null) : null,
          quantity: data.itemType === 'item' ? (data.quantity ?? null) : null,
          supplier: data.supplier || null,
          notes: data.notes || null,
        },
      },
      {
        onSuccess: (tx) => {
          toast({ description: '✅ تم تسجيل عملية الإدخال بنجاح' });
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
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <PackagePlus className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">تسجيل إدخال مادة</h1>
            <p className="text-sm text-muted-foreground">إضافة كمية للمخزون</p>
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

                    {/* Current Stock Info */}
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
                        {selectedItem.currentStock <= selectedItem.minStock && (
                          <span className="text-destructive text-xs">
                            ⚠ أقل من الحد الأدنى ({selectedItem.minStock}{' '}
                            {selectedItem.unit})
                          </span>
                        )}
                        {selectedItem.categoryName && (
                          <span className="text-muted-foreground text-xs">
                            التصنيف: {selectedItem.categoryName}
                          </span>
                        )}
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
                        {equipmentData?.equipment.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id.toString()}>
                            {eq.name}
                            {eq.serialNumber ? ` — رقم تسلسلي: ${eq.serialNumber}` : ''}
                            {eq.model ? ` (${eq.model})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedEquipment && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm flex gap-4">
                        <span className="text-muted-foreground">الحالة:</span>
                        <span>{conditionLabel(selectedEquipment.condition)}</span>
                      </div>
                    )}
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
                          ({selectedItem.unit})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          field.onChange(
                            e.target.value === '' ? null : e.target.valueAsNumber,
                          );
                          setPendingConfirm(false);
                        }}
                        className="max-w-[180px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الجهة الموردة (اختياري)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="مثال: شركة الدواء السورية، مستودع وزارة الصحة..."
                    />
                  </FormControl>
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
              <div className="p-4 bg-success/10 border border-success/30 rounded-md text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-success mb-1">تأكيد العملية</p>
                  <p className="text-foreground/80">
                    سيتم تسجيل إدخال{' '}
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
                disabled={mutation.isPending}
                className="gap-2 bg-success hover:bg-success/90 text-white"
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

function conditionLabel(condition: string) {
  const map: Record<string, string> = {
    good: 'جيدة ✓',
    maintenance: 'قيد الصيانة',
    broken: 'معطلة',
    consumed: 'مستهلكة',
    needs_inspection: 'تحتاج فحص',
  };
  return map[condition] ?? condition;
}
