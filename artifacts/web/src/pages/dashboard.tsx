import { useGetDashboardStats, useGetDashboardCharts } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, Clock, ArrowRightLeft, Stethoscope } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatDateTime, cn } from '@/lib/utils';
import { Link } from 'wouter';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: charts, isLoading: chartsLoading } = useGetDashboardCharts();

  if (statsLoading || chartsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-14 bg-muted/50" />
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="animate-pulse h-80" />
          <Card className="animate-pulse h-80" />
        </div>
      </div>
    );
  }

  // Last transaction display helpers
  const lastTxTypeLabel =
    stats?.lastTransactionType === 'in'   ? 'إدخال' :
    stats?.lastTransactionType === 'out'  ? 'إخراج' :
    stats?.lastTransactionType === 'init' ? 'افتتاحي' : null;

  const lastTxColor =
    stats?.lastTransactionType === 'in'  ? 'text-success' :
    stats?.lastTransactionType === 'out' ? 'text-destructive' :
    'text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">نظرة عامة على المستودع</h1>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* 1. Total Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">صنف نشط في المستودع</p>
          </CardContent>
        </Card>

        {/* 2. Below min */}
        <Card className={stats?.belowMinCount ? 'border-destructive/50 bg-destructive/5' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نواقص المخزون</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats?.belowMinCount ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.belowMinCount ? 'text-destructive' : ''}`}>
              {stats?.belowMinCount || 0}
            </div>
            {stats?.belowMinCount && stats.belowMinCount > 0 ? (
              <p className="text-xs text-destructive mt-1">
                <Link href="/items" className="underline underline-offset-2">
                  أصناف تحتاج طلبية →
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">لا يوجد نقص حالياً</p>
            )}
          </CardContent>
        </Card>

        {/* 3. Near expiry */}
        <Card className={stats?.nearExpiryCount ? 'border-warning/50 bg-warning/5' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قرب انتهاء الصلاحية</CardTitle>
            <Clock className={`h-4 w-4 ${stats?.nearExpiryCount ? 'text-warning' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.nearExpiryCount ? 'text-warning' : ''}`}>
              {stats?.nearExpiryCount || 0}
            </div>
            {stats?.nearExpiryCount && stats.nearExpiryCount > 0 ? (
              <p className="text-xs text-warning mt-1">
                <Link href="/reports" className="underline underline-offset-2">
                  مراجعة التقرير →
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">لا يوجد انتهاء صلاحية قريب</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Last Transaction */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">آخر عملية مسجلة</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.lastTransactionId ? (
              <>
                <div className={`text-lg font-bold leading-tight ${lastTxColor}`}>
                  {lastTxTypeLabel}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate" title={stats.lastTransactionItemName ?? undefined}>
                  {stats.lastTransactionItemName || '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats.lastTransactionAt ? formatDateTime(stats.lastTransactionAt) : ''}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground mt-1">لا توجد عمليات بعد</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Equipment count mini-card ── */}
      {(stats?.totalEquipment ?? 0) > 0 && (
        <div className="flex justify-end">
          <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2 text-sm">
            <Stethoscope className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">إجمالي التجهيزات:</span>
            <span className="font-bold">{stats?.totalEquipment}</span>
            <Link href="/equipment" className="text-xs text-primary underline underline-offset-2 mr-2">
              عرض الكل
            </Link>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Bar chart: top consumed */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">أعلى الأصناف استهلاكاً (آخر 90 يوماً)</CardTitle>
          </CardHeader>
          <CardContent>
            {!charts?.topConsumed?.length ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                لا توجد بيانات استهلاك بعد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.topConsumed} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, textAnchor: 'start', x: -5 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                    formatter={(v: number) => [`${v} وحدة`, 'الكمية']}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart: stock by category */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">توزيع المخزون بالتصنيف</CardTitle>
          </CardHeader>
          <CardContent>
            {!charts?.stockByCategory?.length ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                لا توجد بيانات بعد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={charts.stockByCategory}
                    cx="50%"
                    cy="45%"
                    outerRadius={85}
                    dataKey="count"
                    nameKey="category"
                    label={({ category, percent }) =>
                      `${category} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {charts.stockByCategory.map((_: unknown, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-foreground mr-1">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
