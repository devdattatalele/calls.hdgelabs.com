import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ClipboardList,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mic,
  PhoneCall,
  Receipt,
  ShieldOff,
  Smartphone,
  UserSquare2,
  Users,
} from "lucide-react";
import { signOut, useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/recordings", label: "Recordings", icon: Mic },
  { to: "/calls", label: "All calls", icon: PhoneCall },
  { to: "/reports", label: "Reports", icon: ClipboardList },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/team", label: "Team", icon: Users },
  { to: "/devices", label: "Devices", icon: Smartphone },
  { to: "/numbers", label: "Numbers", icon: UserSquare2 },
];

const SETTINGS = [
  { to: "/settings/company", label: "Company", icon: Building2 },
  { to: "/settings/api-keys", label: "API keys", icon: KeyRound },
  { to: "/settings/exclusions", label: "Exclusions", icon: ShieldOff },
  { to: "/settings/billing", label: "Billing", icon: Receipt },
];

export function AppShell() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="grid h-screen grid-cols-[244px_1fr] overflow-hidden bg-background">
      <aside className="flex h-screen flex-col overflow-hidden border-r bg-card/40">
        {/* Header (fixed) */}
        <div className="shrink-0 px-4 pt-6 pb-3">
          <div className="flex items-center gap-3 px-1">
            <img
              src="/hdge-icon.jpg"
              alt="HDGElabs"
              className="h-10 w-10 rounded-md object-cover ring-1 ring-border"
            />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight leading-none">
                HDGElabs
              </div>
              <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-primary/80 leading-none">
                HDGEcalls
              </div>
            </div>
            <ThemeToggle className="ml-auto" />
          </div>

          {company.data?.name && (
            <div className="mt-3 truncate rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground">Workspace · </span>
              <span className="font-medium">{company.data.name}</span>
              <span className="ml-1.5 text-muted-foreground capitalize">
                · {company.data.plan ?? "free"}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable nav */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 scrollbar-thin">
          <Separator className="mb-3" />
          <nav className="flex flex-col gap-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavItem key={to} to={to} label={label} icon={<Icon className="h-4 w-4" />} />
            ))}
          </nav>

          <div className="mt-5 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Settings
          </div>
          <nav className="mt-1 flex flex-col gap-0.5">
            {SETTINGS.map(({ to, label, icon: Icon }) => (
              <NavItem key={to} to={to} label={label} icon={<Icon className="h-4 w-4" />} />
            ))}
          </nav>
        </div>

        {/* Footer (fixed) */}
        <div className="shrink-0 border-t bg-card/40 px-4 py-3">
          <NavItem
            to="/help"
            label="Help & setup"
            icon={<HelpCircle className="h-4 w-4" />}
          />
          <div className="mt-2 truncate px-2 text-xs text-muted-foreground">
            {user?.email}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )
      }
      end
    >
      {icon}
      {label}
    </NavLink>
  );
}
