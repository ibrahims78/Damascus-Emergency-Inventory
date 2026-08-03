import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useGetItem, 
  useCreateItem, 
  useUpdateItem,
  useListCategories,
  type Category,
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

const itemSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب ويجب أن يكون حرفين على الأقل'),
  code: z.string().optional().nullable(),
  categoryId: z.coerce.number().optional().nullable(),
  itemType: z.string().default('item'),
  unit: z.string().min(1, 'الوحدة مطلوبة (مثال: حبة، علبة، الخ)'),
  minStock: z.coerce.number().min(0).default(0),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export function ItemForm({ itemId }: { itemId?: number }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: categories } = useListCategories();
  const isEditing = !!itemId;
  
  // Use enabled and queryKey options for Orval hook
  const { data: item, isLoading: isLoadingItem } = useGetItem(
    itemId as number, 
    { query: { enabled: isEditing, queryKey: ['item', itemId] } }
  );

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      code: '',
      categoryId: undefined,
      itemType: 'item',
      unit: 'حبة',
      minStock: 10,
      expiryDate: '',
      batchNumber: '',
      location: '',
      supplier: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isEditing && item) {
      form.reset({
        name: item.name,
        code: item.code || '',
        categoryId: item.categoryId || undefined,
        itemType: item.itemType,
        unit: item.unit,
        minStock: item.minStock,
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
        batchNumber: item.batchNumber || '',
        location: item.location || '',
        supplier: item.supplier || '',
        notes: item.notes || '',
      });
    }
  }, [item, isEditing, form]);

  const onSubmit = (data: ItemFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ 
        id: itemId!, 
        data: {
          ...data,
          categoryId: data.categoryId || null,
        } 
      }, {
        onSuccess: () => {
          toast({ description: "تم تعديل المادة بنجاح" });
          setLocation('/items');
        }
      });
    } else {
      createMutation.mutate({ 
        data: {
          ...data,
          currentStock: 0,
          categoryId: data.categoryId || null,
        } 
      }, {
        onSuccess: () => {
          toast({ description: "تمت إضافة المادة بنجاح" });
          setLocation('/items');
        }
      });
    }
  };

  if (isEditing && isLoadingItem) {
    return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/items')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'تعديل مادة' : 'إضافة مادة جديدة'}
          </h1>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المادة *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثال: باراسيتامول 500 مغ" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رمز المادة (الباركود)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التصنيف</FormLabel>
                    <Select 
                      value={field.value ? field.value.toString() : ''} 
                      onValueChange={(val) => field.onChange(parseInt(val))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat: Category) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوحدة *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="علبة، حبة، أمبولة، ليتر..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حد النواقص (الحد الأدنى)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الصلاحية</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الطبخة (Batch Number)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} dir="ltr" className="text-right" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مكان التخزين (الرف / القسم)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجهة الموردة</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
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
              <Button type="button" variant="outline" onClick={() => setLocation('/items')}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {isEditing ? 'حفظ التعديلات' : 'إضافة المادة'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}