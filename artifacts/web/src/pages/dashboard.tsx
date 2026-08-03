import { useGetDashboardStats, useGetDashboardCharts } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, Clock, Stethoscope, ArrowRightLeft } from 'lucide-react';
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
  Legend
} from 'recharts';
import { formatDateTime, cn } from '@/lib/utils';
import { Link } from 'wouter';

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(var(--primary))'
];

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: charts, isLoading: chartsLoading } = useGetDashboardCharts();

  if (statsLoading || chartsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">نظرة عامة على المستودع</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المواد</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
          </CardContent>
        </Card>
        
        <Card className={stats?.belowMinCount ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نواقص المخزون</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats?.belowMinCount ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.belowMinCount ? "text-destructive" : ""}`}>
              {stats?.belowMinCount || 0}
            </div>
            {stats?.belowMinCount && stats.belowMinCount > 0 ? (
              <p className="text-xs text-destructive mt-1">أصناف تحتاج طلبية</p>
            ) : null}
          </CardContent>
        </Card>
        
        <Card className={stats?.nearExpiryCount ? "border-warning/50 bg-warning/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قرب انتهاء الصلاحية</CardTitle>
            <Clock className={`h-4 w-4 ${stats?.nearExpiryCount ? "text-warning" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.nearExpiryCount ? "text-warning" : ""}`}>
              {stats?.nearExpiryCount || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التجهيزات</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEquipment || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-full md:col-span-4">
          <CardHeader>
            <CardTitle>الأصناف الأكثر استهلاكاً</CardTitle>
          </CardHeader>
          <CardContent className="h-80 pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.topConsumed || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--foreground))',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar 
                  dataKey="quantity" 
                  name="الكمية"
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-3">
          <CardHeader>
            <CardTitle>المخزون حسب التصنيف</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.stockByCategory || []}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="categoryName"
                  stroke="none"
                >
                  {(charts?.stockByCategory || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-foreground mr-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {stats?.lastTransactionId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">آخر عملية مسجلة</CardTitle>
            <Link href="/transactions" className="text-sm text-primary hover:underline">عرض السجل</Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 bg-secondary/50 p-4 rounded-lg">
              <div className={cn(
                "p-3 rounded-full",
                stats.lastTransactionType === 'in' ? "bg-success/20 text-success" : 
                stats.lastTransactionType === 'out' ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
              )}>
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-lg">
                  {stats.lastTransactionType === 'in' ? 'إدخال' : 
                   stats.lastTransactionType === 'out' ? 'إخراج' : 'رصيد افتتاحي'}: {stats.lastTransactionItemName}
                </div>
                <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                  <span>بواسطة: {stats.lastTransactionBy}</span>
                  <span>الوقت: {formatDateTime(stats.lastTransactionAt)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

