import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  useDeleteItem,
  useListCategories,
  type Item,
} from '@workspace/api-client-react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  MoreVertical,
  AlertTriangle,
  Clock,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ItemForm } from './item-form';
import { AdjustmentForm } from './adjustment-form';

export function ItemsPage() {
  const [matchNew] = useRoute('/items/new');
  const [matchEdit, params] = useRoute('/items/:id/edit');
  const [matchAdjust, adjustParams] = useRoute('/items/:id/adjust');

  if (matchNew) return <ItemForm />;
  if (matchEdit && params?.id) return <ItemForm itemId={parseInt(params.id)} />;
  if (matchAdjust && adjustParams?.id) return <AdjustmentForm preselectedItemId={parseInt(adjustParams.id)} />;

  return <ItemsList />;
}

function ItemsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDeb]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [belowMin, setBelowMin]     = useState(false);
  const [nearExpiry, setNearExpiry] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => setDeb(search), 400);
    return () => clearTimeout(h);
  }, [search]);

  // Fetch with full filter support via direct fetch (bypasses generated hook types)
  const { data, isLoading, refetch } = useQuery<{ items: Item[]; total: number }>({
    queryKey: ['items', { search: debouncedSearch, categoryId, belowMin, nearExpiry }],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (categoryId) p.set('categoryId', categoryId);
      if (belowMin)   p.set('belowMin', 'true');
      if (nearExpiry) p.set('nearExpiry', 'true');
      p.set('limit', '200');
      const res = await fetch(`/api/items?${p}`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل جلب المواد');
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: categoriesData } = useListCategories();
  const deleteMutation = useDeleteItem();

  const hasFilters = !!search || !!categoryId || belowMin || nearExpiry;

  const resetFilters = () => {
    setSearch(''); setDeb(''); setCategoryId(''); setBelowMin(false); setNearExpiry(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
      deleteMutation.mutate({ id }, { onSuccess: () => refetch() });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">المواد والمستهلكات</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total ?? data.items?.length ?? 0} صنف
            </p>
          )}
        </div>
        <Button onClick={() => setLocation('/items/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مادة جديدة
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        {/* Filter bar */}
        <div className="p-4 border-b space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم المادة أو الرمز..."
                className="pl-3 pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category filter */}
            <Select value={categoryId || 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="كل التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {categoriesData?.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quick filter: below min */}
            <Button
              variant={belowMin ? 'destructive' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setBelowMin((v) => !v)}
            >
              <AlertCircle className="w-4 h-4" />
              نقص بالمخزون
            </Button>

            {/* Quick filter: near expiry */}
            <Button
              variant={nearExpiry ? 'default' : 'outline'}
              size="sm"
              className={cn('gap-2', nearExpiry && 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600')}
              onClick={() => setNearExpiry((v) => !v)}
            >
              <Clock className="w-4 h-4" />
              قرب انتهاء الصلاحية
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetFilters}>
                <X className="w-3.5 h-3.5" />
                إلغاء الفلاتر
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرمز</TableHead>
                <TableHead>اسم المادة</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead className="text-center">الرصيد</TableHead>
                <TableHead className="text-center">الحد الأدنى</TableHead>
                <TableHead>تاريخ الصلاحية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {hasFilters ? 'لا يوجد بيانات مطابقة للفلاتر المحددة' : 'لا توجد مواد مسجّلة بعد'}
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((item: Item) => {
                  const isBelowMin = item.currentStock <= item.minStock;
                  const isExpired  = !!item.expiryDate && new Date(item.expiryDate) < new Date();
                  let isNearExpiry = false;
                  if (item.expiryDate && !isExpired) {
                    const diffDays = Math.ceil(
                      (new Date(item.expiryDate).getTime() - Date.now()) / 86_400_000
                    );
                    isNearExpiry = diffDays <= 30;
                  }

                  // Row background coloring per plan spec
                  const rowBg =
                    isBelowMin   ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30' :
                    isNearExpiry ? 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-950/30' :
                    isExpired    ? 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/30' :
                    !item.isActive ? 'opacity-50' : '';

                  return (
                    <TableRow key={item.id} className={cn(rowBg)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.code || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.categoryName || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-bold text-sm',
                          isBelowMin ? 'text-destructive' : ''
                        )}>
                          {item.currentStock.toLocaleString('ar')}
                        </span>
                        <span className="text-xs text-muted-foreground mr-1">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {item.minStock}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-sm',
                          isExpired    ? 'text-destructive font-bold' :
                          isNearExpiry ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground'
                        )}>
                          {item.expiryDate ? item.expiryDate.substring(0, 10) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {isBelowMin && !isExpired && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertCircle className="w-3 h-3" />نقص
                            </Badge>
                          )}
                          {isNearExpiry && (
                            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 border text-[10px] gap-1">
                              <Clock className="w-3 h-3" />قريب الانتهاء
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="destructive" className="text-[10px]">منتهي الصلاحية</Badge>
                          )}
                          {!isBelowMin && !isNearExpiry && !isExpired && item.isActive && (
                            <Badge variant="secondary" className="text-[10px]">طبيعي</Badge>
                          )}
                          {!item.isActive && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">معطّل</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">فتح القائمة</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/items/${item.id}/edit`)}>
                              <Edit className="ml-2 h-4 w-4" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocation(`/items/${item.id}/adjust`)}>
                              <SlidersHorizontal className="ml-2 h-4 w-4 text-amber-600" />
                              تسوية جرد
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
