import { Link, useLocation } from 'wouter';
import { useGetCurrentUser } from '@workspace/api-client-react';
import {
  LayoutDashboard,
  Package,
  Stethoscope,
  ArrowRightLeft,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  Menu,
  X,
  ChevronsRight,
  ChevronsLeft,
  Code2,
  ArchiveRestore,
  FileWarning,
  RotateCcw,
  UserRoundCheck,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import logoUrl from '@assets/logo.jpeg';
import { useSidebar } from './sidebar-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const APP_VERSION = 'v1.0.3';
const DESIGNER_NAME = 'إبراهيم الصيداوي';
const DESIGNER_PHONE = '0933706403';

const navItems = [
  { href: '/',             label: 'لوحة التحكم',        icon: LayoutDashboard },
  { href: '/items',        label: 'المواد والمستهلكات',  icon: Package },
  { href: '/equipment',    label: 'التجهيزات الطبية',    icon: Stethoscope },
  { href: '/transactions', label: 'سجل العمليات',        icon: ArrowRightLeft },
  { href: '/reports',      label: 'التقارير',             icon: FileText },
];

const movementItems = [
  { href: '/custody/out/new',    label: 'تسليم عهدة شخصية', icon: UserRoundCheck },
  { href: '/custody/return/new', label: 'إعادة عهدة',       icon: RotateCcw },
  { href: '/damage/new',         label: 'تسجيل تلف',        icon: FileWarning },
  { href: '/central-return/new', label: 'مرتجع مركزي',      icon: ArchiveRestore },
];

const adminItems = [
  { href: '/users',    label: 'المستخدمين',  icon: Users },
  { href: '/audit',    label: 'سجل التدقيق', icon: ShieldCheck },
  { href: '/sync',     label: 'المزامنة والعقد', icon: Network },
  { href: '/settings', label: 'الإعدادات',   icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser();
  const { collapsed, toggle } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const allItems =
    user?.role === 'admin'
      ? [...navItems, ...movementItems, ...adminItems]
      : [...navItems, ...movementItems];

  return (
    <TooltipProvider delayDuration={200}>
      {/* Mobile Toggle */}
      <button
        className="md:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 right-0 z-40 border-l bg-card flex flex-col',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-[60px]' : 'w-64',
          isMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        )}
      >
        {/* Header: logo + title */}
        <div
          className={cn(
            'border-b flex items-center transition-all duration-300',
            collapsed ? 'p-3 justify-center' : 'p-5 gap-3',
          )}
        >
          <img
            src={logoUrl}
            alt="Logo"
            className={cn(
              'object-contain rounded-full border shadow-sm flex-shrink-0 transition-all duration-300',
              collapsed ? 'w-9 h-9' : 'w-12 h-12',
            )}
          />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-foreground leading-snug">
                منظومة الإسعاف والطوارئ
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                مديرية الاحالة والاسعاف - دمشق
              </p>
            </div>
          )}
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggle}
          className={cn(
            'hidden md:flex items-center justify-center h-7 w-7 rounded-md',
            'text-muted-foreground hover:text-foreground hover:bg-secondary',
            'transition-colors absolute -left-3.5 top-[68px] z-10',
            'bg-card border shadow-sm',
          )}
          title={collapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'}
        >
          {collapsed
            ? <ChevronsLeft className="w-3.5 h-3.5" />
            : <ChevronsRight className="w-3.5 h-3.5" />
          }
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isAdminStart = item.href === '/users';
            const isMovementStart = item.href === '/custody/out/new';
            const isActive =
              item.href === '/'
                ? location === '/'
                : location.startsWith(item.href);

            const linkEl = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center rounded-md text-sm font-medium transition-colors',
                  collapsed
                    ? 'justify-center p-2.5'
                    : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            return (
              <div key={item.href}>
                {isAdminStart && user?.role === 'admin' && (
                  <div className={cn('pt-3 pb-1', collapsed ? 'px-1' : 'px-3')}>
                    {collapsed
                      ? <div className="border-t" />
                      : (
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          إدارة النظام
                        </div>
                      )
                    }
                  </div>
                )}
                {isMovementStart && (
                  <div className={cn('pt-3 pb-1', collapsed ? 'px-1' : 'px-3')}>
                    {collapsed ? <div className="border-t" /> : <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">حركات العهد والأحداث</div>}
                  </div>
                )}

                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                    <TooltipContent side="left" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : linkEl}
              </div>
            );
          })}
        </nav>

        {/* Footer: version + designer signature */}
        <div
          className={cn(
            'border-t mt-auto transition-all duration-300',
            collapsed ? 'p-2' : 'p-3',
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <span className="text-[9px] font-mono text-muted-foreground/50 select-none">
                    {APP_VERSION}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <div className="text-center leading-relaxed">
                  <div>{APP_VERSION}</div>
                  <div className="opacity-80">تصميم: {DESIGNER_NAME}</div>
                  <div className="opacity-60 font-mono">{DESIGNER_PHONE}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground/50 select-none tracking-wide">
                  {APP_VERSION}
                </span>
                <span className="text-[10px] text-muted-foreground/40 select-none">
                  نظام إدارة المستودعات
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-dashed border-border/40">
                <Code2 className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground/50 leading-tight truncate">
                    تصميم: {DESIGNER_NAME}
                  </div>
                  <a
                    href={`tel:${DESIGNER_PHONE}`}
                    className="text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors leading-tight block"
                    dir="ltr"
                  >
                    {DESIGNER_PHONE}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
