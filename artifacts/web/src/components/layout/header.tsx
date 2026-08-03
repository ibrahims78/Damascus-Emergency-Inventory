import { useGetCurrentUser, useLogout, getListAlertsQueryOptions, type Alert } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Moon, Sun, User as UserIcon, ExternalLink } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: user } = useGetCurrentUser();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  // Refresh alerts every 5 minutes as per spec
  const { data: alerts } = useQuery({
    ...getListAlertsQueryOptions(),
    refetchInterval: 5 * 60 * 1000,
  });

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation('/login');
      }
    });
  };

  const roleLabel = {
    admin: 'مدير نظام',
    warehouse_manager: 'أمين مستودع',
    viewer: 'مراقب'
  }[user?.role || 'viewer'];

  const alertCount = alerts?.length ?? 0;
  const hasCritical = alerts?.some(a => a.severity === 'critical') ?? false;

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or title could go here */}
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {alertCount > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 text-white ${
                    hasCritical ? 'bg-destructive' : 'bg-warning'
                  }`}
                >
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>التنبيهات</span>
              {alertCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  hasCritical
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                }`}>
                  {alertCount} تنبيه
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto">
              {alertCount === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">لا يوجد تنبيهات</div>
              ) : (
                alerts?.map(alert => (
                  <div
                    key={alert.id}
                    className="p-3 border-b last:border-0 text-sm hover:bg-secondary transition-colors cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground leading-tight">{alert.itemName}</span>
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm ${
                        alert.severity === 'critical'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {alert.type === 'below_min'
                          ? 'نقص بالمخزون'
                          : alert.type === 'near_expiry'
                            ? 'قريب الانتهاء'
                            : 'صيانة'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
            {alertCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-sm text-primary cursor-pointer gap-1.5"
                  onClick={() => setLocation('/reports')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  عرض الكل في التقارير
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground mt-1">{roleLabel}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
