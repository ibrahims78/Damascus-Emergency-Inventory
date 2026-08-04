import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useGetEquipment, 
  useCreateEquipment, 
  useUpdateEquipment
} from '@workspace/api-client-react';
import { ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const equipmentSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  equipmentType: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  condition: z.string().default('good'),
  manufactureYear: z.coerce.number().optional().nullable(),
  originCountry: z.string().optional().nullable(),
  currentHolder: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'الكمية يجب أن تكون 1 على الأقل').default(1),
  minQuantity: z.coerce.number().int().min(0, 'الحد الأدنى يجب أن يكون 0 أو أكثر').default(0),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;

export function EquipmentForm({ equipmentId }: { equipmentId?: number }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const isEditing = !!equipmentId;
  
  const { data: eq, isLoading } = useGetEquipment(
    equipmentId as number, 
    { query: { enabled: isEditing, queryKey: ['equipment', equipmentId] } }
  );

  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: '',
      equipmentType: '',
      model: '',
      serialNumber: '',
      condition: 'good',
      manufactureYear: undefined,
      originCountry: '',
      currentHolder: '',
      notes: '',
      quantity: 1,
      minQuantity: 0,
    },
  });

  useEffect(() => {
    if (isEditing && eq) {
      form.reset({
        name: eq.name,
        equipmentType: eq.equipmentType || '',
        model: eq.model || '',
        serialNumber: eq.serialNumber || '',
        condition: eq.condition,
        manufactureYear: eq.manufactureYear || undefined,
        originCountry: eq.originCountry || '',
        currentHolder: eq.currentHolder || '',
        notes: eq.notes || '',
        quantity: eq.quantity ?? 1,
        minQuantity: eq.minQuantity ?? 0,
      });
    }
  }, [eq, isEditing, form]);

  const onSubmit = (data: EquipmentFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ 
        id: equipmentId!, 
        data: {
          ...data,
          manufactureYear: data.manufactureYear || null,
        } 
      }, {
        onSuccess: () => {
          toast({ description: "تم تعديل التجهيز بنجاح" });
          setLocation('/equipment');
        },
        onError: () => toast({ description: "حدث خطأ أثناء حفظ التجهيز", variant: "destructive" }),
      });
    } else {
      createMutation.mutate({ 
        data: {
          ...data,
          manufactureYear: data.manufactureYear || null,
        } 
      }, {
        onSuccess: () => {
          toast({ description: "تم إضافة التجهيز بنجاح" });
          setLocation('/equipment');
        },
        onError: () => toast({ description: "حدث خطأ أثناء إضافة التجهيز", variant: "destructive" }),
      });
    }
  };

  if (isEditing && isLoading) {
    return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/equipment')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'تعديل بيانات التجهيز' : 'إضافة تجهيز طبي جديد'}
          </h1>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Quantity row — prominent at the top */}
            <div className="grid grid-cols-2 gap-6 p-4 rounded-lg border bg-muted/30">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية / العدد</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">عدد القطع المتوفرة حالياً</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحد الأدنى للتنبيه</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">يُطلق تنبيه نقص عند الوصول لهذا الحد (0 = بلا تنبيه)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم التعريفي *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: جهاز صدمة كهربائية" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="مثال: Defibrillator" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموديل (Model)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم التسلسلي (S/N)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة الفنية *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="good">جيد</SelectItem>
                        <SelectItem value="needs_inspection">يحتاج فحص</SelectItem>
                        <SelectItem value="maintenance">تحت الصيانة</SelectItem>
                        <SelectItem value="broken">معطل</SelectItem>
                        <SelectItem value="consumed">مستهلك / متلف</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manufactureYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سنة الصنع</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>بلد المنشأ</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العهدة الحالية (مع من؟)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="اسم المسعف أو رقم سيارة الإسعاف" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} className="h-24" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation('/equipment')}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {isEditing ? 'حفظ التعديلات' : 'إضافة التجهيز'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}