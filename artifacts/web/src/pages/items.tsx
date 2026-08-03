import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  useListItems, 
  useDeleteItem, 
  useListCategories 
} from '@workspace/api-client-react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { ItemForm } from './item-form';

export function ItemsPage() {
  const [matchNew] = useRoute('/items/new');
  const [matchEdit, params] = useRoute('/items/:id/edit');
  
  if (matchNew) return <ItemForm />;
  if (matchEdit && params?.id) return <ItemForm itemId={parseInt(params.id)} />;

  return <ItemsList />;
}

function ItemsList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Custom simple debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, refetch } = useListItems({ search: debouncedSearch });
  const deleteMutation = useDeleteItem();

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => refetch()
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">المواد والمستهلكات</h1>
        <Button onClick={() => setLocation('/items/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مادة جديدة
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex gap-4 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم المادة، الرمز، المورد..." 
              className="pl-3 pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                <TableHead>تاريخ الصلاحية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : !data?.items.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا يوجد بيانات مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((item) => {
                  const isBelowMin = item.currentStock <= item.minStock;
                  let isNearExpiry = false;
                  if (item.expiryDate) {
                    const expiry = new Date(item.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    isNearExpiry = diffDays <= 30 && diffDays > 0;
                  }
                  const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();

                  return (
                    <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-xs">{item.code || '-'}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.categoryName || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isBelowMin ? "destructive" : "secondary"}>
                          {item.currentStock} {item.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isExpired ? "text-destructive font-bold" : isNearExpiry ? "text-warning font-bold" : ""}>
                          {item.expiryDate ? item.expiryDate.substring(0,10) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-col sm:flex-row">
                          {isBelowMin && <Badge variant="destructive" className="text-[10px]">نقص بالمخزون</Badge>}
                          {isNearExpiry && <Badge variant="outline" className="bg-warning/20 text-warning text-[10px]">قريب الانتهاء</Badge>}
                          {isExpired && <Badge variant="destructive" className="text-[10px]">منتهي الصلاحية</Badge>}
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}