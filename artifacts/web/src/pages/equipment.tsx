import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  useListEquipment, 
} from '@workspace/api-client-react';
import { 
  Plus, 
  Search, 
  Edit, 
  Stethoscope,
  Filter
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { EquipmentForm } from './equipment-form';

const conditionMap: Record<string, { label: string, variant: string }> = {
  good: { label: 'جيد', variant: 'success' },
  maintenance: { label: 'تحت الصيانة', variant: 'warning' },
  broken: { label: 'معطل', variant: 'destructive' },
  consumed: { label: 'مستهلك', variant: 'secondary' },
  needs_inspection: { label: 'يحتاج فحص', variant: 'default' },
};

export function EquipmentPage() {
  const [matchNew] = useRoute('/equipment/new');
  const [matchEdit, params] = useRoute('/equipment/:id/edit');
  
  if (matchNew) return <EquipmentForm />;
  if (matchEdit && params?.id) return <EquipmentForm equipmentId={parseInt(params.id)} />;

  return <EquipmentList />;
}

function EquipmentList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useState(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useListEquipment({ 
    search: debouncedSearch,
    condition: condition === 'all' ? undefined : condition || undefined
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">التجهيزات الطبية</h1>
        <Button onClick={() => setLocation('/equipment/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة تجهيز جديد
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم التجهيز، الموديل، السيريال..." 
              className="pl-3 pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="good">جيد</SelectItem>
                <SelectItem value="needs_inspection">يحتاج فحص</SelectItem>
                <SelectItem value="maintenance">تحت الصيانة</SelectItem>
                <SelectItem value="broken">معطل</SelectItem>
                <SelectItem value="consumed">مستهلك</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم التسلسل</TableHead>
                <TableHead>الاسم والموديل</TableHead>
                <TableHead>العهدة الحالية</TableHead>
                <TableHead>سنة الصنع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : !data?.equipment.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا يوجد تجهيزات مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                data.equipment.map((eq) => {
                  const cond = conditionMap[eq.condition] || { label: eq.condition, variant: 'default' };
                  
                  return (
                    <TableRow key={eq.id}>
                      <TableCell className="font-mono text-xs">{eq.serialNumber || '-'}</TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-muted-foreground" />
                          {eq.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {eq.model || 'بدون موديل'} {eq.equipmentType ? `• ${eq.equipmentType}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>{eq.currentHolder || '-'}</TableCell>
                      <TableCell>{eq.manufactureYear || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={cond.variant as any}
                          className={cond.variant === 'warning' ? "bg-warning/20 text-warning border-warning/30" : ""}
                        >
                          {cond.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/equipment/${eq.id}/edit`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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