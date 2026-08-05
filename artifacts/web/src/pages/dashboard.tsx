import { useQuery } from '@tanstack/react-query';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  Clock,
  ArrowRightLeft,
  Stethoscope,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  ShieldAlert,
  BoxSelect,
  CalendarDays,
  Wrench,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { useState, useEffect, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalItems: number;
  belowMinCount: number;
  nearExpiryCount: number;
  expiredCount: number;
  zeroStockCount: number;
  totalEquipment: number;
  equipmentAlertCount: number;
  monthlyIn: number;
  monthlyOut: number;
  expiryAlertDays: number;
  recentTransactions: RecentTx[];
}

interface RecentTx {
  id: number;
  type: 'in' | 'out' | 'init' | 'adjust';
  itemType: 'item' | 'equipment';
  quantity: number | null;
  documentNumber: string;
  name: string;
  createdAt: string;
  createdByName: string;
}

interface DashboardCharts {
  topItems: { name: string; outQty: number; inQty: number }[];
  stockByCategory: { category: string; totalStock: number; itemCount: number }[];
  dailyMovement: { day: string; inQty: number; outQty: number; txCount: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const REFETCH_INTERVAL = 3 * 60 * 1_000; // 3 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return new Date(iso).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  sub?: ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  href?: string;
  loading?: boolean;
}

function KpiCard({ title, value, icon, sub, variant = 'default', href, loading }: KpiCardProps) {
  const variantStyles = {
    default:  { card: '',                              icon: 'text-muted-foreground', value: '' },
    warning:  { card: 'border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20',  icon: 'text-amber-500',    value: 'text-amber-600 dark:text-amber-400' },
    danger:   { card: 'border-destructive/50 bg-destructive/5',                    icon: 'text-destructive',  value: 'text-destructive' },
    success:  { card: 'border-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-950/20', icon: 'text-emerald-500', value: 'text-emerald-600 dark:text-emerald-400' },
    info:     { card: 'border-blue-400/60 bg-blue-50/60 dark:bg-blue-950/20',      icon: 'text-blue-500',     value: 'text-blue-600 dark:text-blue-400' },
  }[variant];

  const inner = (
    <Card className={cn('transition-all', variantStyles.card, href && 'hover:shadow-md cursor-pointer hover:-translate-y-0.5')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground/80">{title}</CardTitle>
        <div className={cn('p-1.5 rounded-md', variant !== 'default' ? variantStyles.card : 'bg-muted/50')}>
          <span className={variantStyles.icon}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-7 w-16 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ) : (
          <>
            <div className={cn('text-2xl font-bold tabular-nums', variantStyles.value)}>{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Recent Transactions Table ─────────────────────────────────────────────────

function RecentTransactionsTable({ transactions, loading }: { transactions: RecentTx[]; loading: boolean }) {
  const [, setLocation] = useLocation();
  const TYPE_META = {
    in:     { label: 'إدخال',    icon: <ArrowDownToLine className="w-3 h-3" />, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    out:    { label: 'إخراج',    icon: <ArrowUpFromLine className="w-3 h-3" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    init:   { label: 'افتتاحي', icon: <Package className="w-3 h-3" />,          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    adjust: { label: 'تسوية',   icon: <RefreshCw className="w-3 h-3" />,        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">آخر 5 عمليات</CardTitle>
        <Link href="/transactions">
          <span className="text-xs text-primary hover:underline cursor-pointer">عرض الكل ←</span>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-5 py-3 animate-pulse flex gap-3">
                <div className="h-5 w-12 bg-muted rounded" />
                <div className="flex-1 h-5 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ArrowRightLeft className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">لا توجد عمليات بعد</p>
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map(tx => {
              const meta = TYPE_META[tx.type] ?? TYPE_META.adjust;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => setLocation('/transactions')}
                >
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium shrink-0', meta.color)}>
                    {meta.icon}{meta.label}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{tx.name}</span>
                  {tx.quantity !== null && (
                    <span className="text-sm tabular-nums text-muted-foreground shrink-0">{tx.quantity}</span>
                  )}
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                    <p className="text-[10px] text-muted-foreground/60">{tx.createdByName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Last-updated ticker ──────────────────────────────────────────────────────

function LastUpdated({ fetchedAt }: { fetchedAt: Date | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!fetchedAt) return null;
  const diffMin = Math.floor((Date.now() - fetchedAt.getTime()) / 60_000);
  const label = diffMin < 1 ? 'الآن' : `منذ ${diffMin} د`;
  return <span className="text-xs text-muted-foreground">آخر تحديث: {label}</span>;
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: currentUser } = useGetCurrentUser();
  const isWarehouse = currentUser?.role === 'admin' || currentUser?.role === 'warehouse_manager';

  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  const {
    data: charts,
    isLoading: chartsLoading,
    isFetching: chartsFetching,
    refetch: refetchCharts,
  } = useQuery<DashboardCharts>({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/charts', { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  // Track last successful fetch
  useEffect(() => {
    if (stats && charts) setFetchedAt(new Date());
  }, [stats, charts]);

  const isRefreshing = statsFetching || chartsFetching;
  const handleRefresh = () => { void refetchStats(); void refetchCharts(); };

  // Determine KPI variants
  const nearExpiryVariant = (stats?.nearExpiryCount ?? 0) > 0 ? 'warning' : 'default';
  const expiredVariant    = (stats?.expiredCount ?? 0) > 0 ? 'danger' : 'default';
  const belowMinVariant   = (stats?.belowMinCount ?? 0) > 0 ? 'warning' : 'default';
  const zeroStockVariant  = (stats?.zeroStockCount ?? 0) > 0 ? 'danger' : 'default';
  const equipAlertVariant = (stats?.equipmentAlertCount ?? 0) > 0 ? 'warning' : 'default';

  const monthName = new Date().toLocaleDateString('ar-SY', { month: 'long' });

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">نظرة عامة على المستودع</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <LastUpdated fetchedAt={fetchedAt} />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        {isWarehouse && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/transactions/in/new">
              <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                إدخال مواد
              </Button>
            </Link>
            <Link href="/transactions/out/new">
              <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30">
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                إخراج مواد
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── KPI Row 1: Stock status ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          loading={statsLoading}
          title="إجمالي الأصناف"
          value={stats?.totalItems ?? 0}
          icon={<Package className="h-4 w-4" />}
          sub="صنف نشط في المستودع"
          href="/items"
        />
        <KpiCard
          loading={statsLoading}
          title="نواقص المخزون"
          value={stats?.belowMinCount ?? 0}
          icon={<TrendingDown className="h-4 w-4" />}
          sub={stats?.belowMinCount ? 'أصناف دون الحد الأدنى' : 'المخزون ضمن الحدود'}
          variant={belowMinVariant}
          href="/items"
        />
        <KpiCard
          loading={statsLoading}
          title="نفدت من المخزون"
          value={stats?.zeroStockCount ?? 0}
          icon={<BoxSelect className="h-4 w-4" />}
          sub={stats?.zeroStockCount ? 'أصناف بكمية صفر' : 'لا توجد أصناف نافدة'}
          variant={zeroStockVariant}
          href="/items"
        />
        <KpiCard
          loading={statsLoading}
          title={`عمليات ${monthName}`}
          value={(stats?.monthlyIn ?? 0) + (stats?.monthlyOut ?? 0)}
          icon={<ArrowRightLeft className="h-4 w-4" />}
          sub={stats ? (
            <span className="flex gap-2">
              <span className="text-emerald-600">↓ {stats.monthlyIn} إدخال</span>
              <span className="text-red-500">↑ {stats.monthlyOut} إخراج</span>
            </span>
          ) : '—'}
          variant="info"
          href="/transactions"
        />
      </div>

      {/* ── KPI Row 2: Alerts ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          loading={statsLoading}
          title="قرب انتهاء الصلاحية"
          value={stats?.nearExpiryCount ?? 0}
          icon={<Clock className="h-4 w-4" />}
          sub={stats ? `خلال ${stats.expiryAlertDays} يوماً القادمة` : '—'}
          variant={nearExpiryVariant}
          href="/reports"
        />
        <KpiCard
          loading={statsLoading}
          title="منتهية الصلاحية"
          value={stats?.expiredCount ?? 0}
          icon={<ShieldAlert className="h-4 w-4" />}
          sub={stats?.expiredCount ? 'تحتاج إزالة فورية' : 'لا يوجد منتهي الصلاحية'}
          variant={expiredVariant}
          href="/reports"
        />
        <KpiCard
          loading={statsLoading}
          title="إجمالي التجهيزات"
          value={stats?.totalEquipment ?? 0}
          icon={<Stethoscope className="h-4 w-4" />}
          sub="جهاز ومعدة مسجّلة"
          href="/equipment"
        />
        <KpiCard
          loading={statsLoading}
          title="تجهيزات تحتاج انتباهاً"
          value={stats?.equipmentAlertCount ?? 0}
          icon={<Wrench className="h-4 w-4" />}
          sub="صيانة / فحص / معطلة"
          variant={equipAlertVariant}
          href="/equipment"
        />
      </div>

      {/* ── Recent transactions + Pie chart ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentTransactionsTable
            transactions={stats?.recentTransactions ?? []}
            loading={statsLoading}
          />
        </div>

        {/* Pie chart: stock by category (quantity) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توزيع المخزون بالكمية</CardTitle>
            <p className="text-xs text-muted-foreground">إجمالي الوحدات لكل تصنيف</p>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <div className="h-60 flex items-center justify-center">
                <div className="h-32 w-32 rounded-full border-4 border-muted animate-pulse" />
              </div>
            ) : !charts?.stockByCategory?.length ? (
              <div className="h-60 flex items-center justify-center text-sm text-muted-foreground text-center">
                <div>
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  لا توجد بيانات بعد
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={charts.stockByCategory}
                    cx="50%"
                    cy="42%"
                    outerRadius={75}
                    innerRadius={30}
                    dataKey="totalStock"
                    nameKey="category"
                    paddingAngle={2}
                  >
                    {charts.stockByCategory.map((_: unknown, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      textAlign: 'right',
                      direction: 'rtl',
                      fontSize: 12,
                    }}
                    formatter={(v: number, _: string, entry: { payload?: { category?: string; itemCount?: number } }) => [
                      `${v.toLocaleString('ar')} وحدة (${entry.payload?.itemCount ?? 0} صنف)`,
                      entry.payload?.category ?? '',
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={48}
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[11px] text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 30-day movement area chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">حركة المستودع — آخر 30 يوماً</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">الكميات الداخلة والخارجة يومياً</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
                إدخال
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
                إخراج
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartsLoading ? (
            <div className="h-52 animate-pulse bg-muted/30 rounded-lg" />
          ) : !charts?.dailyMovement?.length ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-20" />
                لا توجد حركات في آخر 30 يوماً
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.dailyMovement} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    textAlign: 'right',
                    direction: 'rtl',
                    fontSize: 12,
                  }}
                  formatter={(v: number, key: string) => [
                    `${v} وحدة`,
                    key === 'inQty' ? 'إدخال' : 'إخراج',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="inQty"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorIn)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="outQty"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorOut)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Top items grouped bar chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">أعلى الأصناف نشاطاً — آخر 30 يوماً</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">مقارنة الكميات الداخلة والخارجة لكل صنف</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-500 inline-block rounded-sm" />
                إدخال
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-red-400 inline-block rounded-sm" />
                إخراج
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartsLoading ? (
            <div className="h-64 animate-pulse bg-muted/30 rounded-lg" />
          ) : !charts?.topItems?.length ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-20" />
                لا توجد بيانات حركة في آخر 30 يوماً
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(320, (charts.topItems.length) * 52)}>
              <BarChart
                data={charts.topItems}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="25%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  stroke="transparent"
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    textAlign: 'right',
                    direction: 'rtl',
                    fontSize: 12,
                  }}
                  formatter={(v: number, key: string) => [
                    `${v} وحدة`,
                    key === 'inQty' ? 'إدخال' : 'إخراج',
                  ]}
                />
                <Bar dataKey="inQty"  fill="#10b981" radius={[0, 3, 3, 0]} name="إدخال" />
                <Bar dataKey="outQty" fill="#f87171" radius={[0, 3, 3, 0]} name="إخراج" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
