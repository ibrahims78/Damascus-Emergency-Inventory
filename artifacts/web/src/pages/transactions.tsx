import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useListTransactions } from '@workspace/api-client-react';
import {
  ChevronRight,
  ChevronLeft,
  Printer,
  PackagePlus,
  PackageMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { formatDateTime } from '@/lib/utils';
import { TransactionInForm } from './transaction-in-form';
import { TransactionOutForm } from './transaction-out-form';

export function TransactionsPage() {
  const [matchIn] = useRoute('/transactions/in/new');
  const [matchOut] = useRoute('/transactions/out/new');

  if (matchIn) return <TransactionInForm />;
  if (matchOut) return <TransactionOutForm />;
  return <TransactionsList />;
}

const PAGE_SIZE = 50;

type TypeFilter = 'all' | 'in' | 'out';
type ItemTypeFilter = 'all' | 'item' | 'equipment';

function typeBadge(type: string) {
  if (type === 'in')
    return (
      <Badge className="bg-success/15 text-success border-success/30 border text-xs font-medium">
        إدخال
      </Badge>
    );
  if (type === 'out')
    return (
      <Badge variant="destructive" className="text-xs font-medium">
        إخراج
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs font-medium">
      رصيد افتتاحي
    </Badge>
  );
}

function TransactionsList() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading } = useListTransactions({
    type: typeFilter === 'all' ? undefined : typeFilter,
    itemType: itemTypeFilter === 'all' ? undefined : itemTypeFilter,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const resetFilters = () => {
    setTypeFilter('all');
    setItemTypeFilter('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasFilters =
    typeFilter !== 'all' ||
    itemTypeFilter !== 'all' ||
    fromDate !== '' ||
    toDate !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">سجل العمليات</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setLocation('/transactions/in/new')}
            className="gap-2 bg-success hover:bg-success/90 text-white"
          >
            <PackagePlus className="w-4 h-4" />
            إدخال مادة
          </Button>
          <Button
            onClick={() => setLocation('/transactions/out/new')}
            variant="destructive"
            className="gap-2"
          >
            <PackageMinus className="w-4 h-4" />
            إخراج مادة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">نوع العملية</label>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as TypeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="in">إدخال فقط</SelectItem>
                <SelectItem value="out">إخراج فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">نوع الصنف</label>
            <Select
              value={itemTypeFilter}
              onValueChange={(v) => {
                setItemTypeFilter(v as ItemTypeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="item">مادة / مستهلك</SelectItem>
                <SelectItem value="equipment">تجهيز / معدة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">من تاريخ</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">إلى تاريخ</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground h-7 text-xs"
            >
              إعادة ضبط الفلاتر
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم السند</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead className="text-center">الكمية</TableHead>
                <TableHead>الجهة المستلمة</TableHead>
                <TableHead>المستخدم</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                      <span>جاري التحميل...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data?.transactions.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {hasFilters
                      ? 'لا توجد عمليات تطابق الفلاتر المحددة'
                      : 'لا توجد عمليات مسجلة بعد — ابدأ بتسجيل إدخال أو إخراج'}
                  </TableCell>
                </TableRow>
              ) : (
                data.transactions.map((tx) => {
                  const itemName =
                    tx.itemType === 'equipment' ? tx.equipmentName : tx.itemName;

                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/40 cursor-default">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {tx.documentNumber}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell>{typeBadge(tx.type)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{itemName || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {tx.itemType === 'equipment' ? 'تجهيز' : 'مادة'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {tx.quantity != null ? (
                          <span className="font-semibold tabular-nums">
                            {tx.quantity}
                            {tx.itemUnit ? (
                              <span className="font-normal text-muted-foreground text-xs mr-1">
                                {tx.itemUnit}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.recipientName || '—'}
                        {tx.recipientPerson && (
                          <div className="text-xs text-muted-foreground">
                            {tx.recipientPerson}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.createdByName || '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            window.open(`/print/${tx.id}`, '_blank');
                          }}
                          title="طباعة / عرض السند"
                          className="h-8 w-8"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <span className="text-muted-foreground">
              إجمالي <strong>{data.total}</strong> عملية — صفحة{' '}
              <strong>{page}</strong> من <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
