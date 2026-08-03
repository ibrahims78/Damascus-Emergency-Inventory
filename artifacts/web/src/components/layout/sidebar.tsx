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
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import logoUrl from '@assets/WhatsApp_Image_2026-08-03_at_9.29.40_AM_1785738967367.jpeg';

const navItems = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/items', label: 'المواد والمستهلكات', icon: Package },
  { href: '/equipment', label: 'التجهيزات الطبية', icon: Stethoscope },
  { href: '/transactions', label: 'سجل العمليات', icon: ArrowRightLeft },
  { href: '/reports', label: 'التقارير', icon: FileText },
];

const adminItems = [
  { href: '/users', label: 'المستخدمين', icon: Users },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useGetCurrentUser();
  const [isOpen, setIsOpen] = useState(false);

  const allItems = user?.role === 'admin' ? [...navItems, ...adminItems] : navItems;

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="md:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 right-0 z-40 w-64 border-l bg-card transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b flex flex-col items-center gap-4">
          <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-full border shadow-sm" />
          <div className="text-center">
            <h1 className="font-bold text-base text-foreground leading-tight">منظومة الإسعاف والطوارئ</h1>
            <p className="text-xs text-muted-foreground mt-1">مديرية الاحالة والاسعاف - دمشق</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {allItems.map((item) => {
            const Icon = item.icon;
            // Exact match for root, prefix match for others (e.g. /items/new belongs to /items)
            const isActive = item.href === '/' 
              ? location === '/' 
              : location.startsWith(item.href);

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t mt-auto text-xs text-center text-muted-foreground">
          نظام إدارة المستودعات الإصدار 1.0
        </div>
      </aside>
    </>
  );
}