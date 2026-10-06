import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, TicketCheck, User as UserIcon, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { filterNavItems, navItems } from "@/config/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const permissionNames = user?.role?.permissions.map((p) => p.name) ?? [];
  const items = filterNavItems(navItems, permissionNames);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary-hover">
          <TicketCheck className="size-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">Support Desk</p>
          <p className="text-[11px] leading-tight text-muted-foreground">IT Support Log</p>
        </div>
      </div>

      <nav id="main-nav" className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-white/60",
                active && "bg-card font-medium text-foreground hover:bg-card"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
              )}
              <Icon className={cn("size-4", active ? "text-primary-hover" : "text-muted-foreground")} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border/70 px-5 py-4">
        <p className="truncate text-xs font-medium text-foreground">{user?.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {user?.role?.name ?? "No role"}
        </p>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLabel =
    navItems.find((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to)
    )?.label ?? (location.pathname.startsWith("/profile") ? "Profile" : "Support Desk");

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside id="app-sidebar" className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/60 bg-muted md:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border/60 bg-muted">
            <button
              type="button"
              className="absolute right-2 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-white/60"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="md:pl-64">
        <header id="app-topbar" className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <button
            id="btn-open-nav"
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>

          <h1 className="text-sm font-semibold text-foreground">{currentLabel}</h1>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="user-menu-trigger"
                  type="button"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary-hover">
                    {user?.name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                  <span className="hidden text-foreground sm:inline">{user?.name}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <span className="block text-sm font-medium">{user?.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <UserIcon className="mr-2 size-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void logout().then(() => navigate("/login"));
                  }}
                >
                  <LogOut className="mr-2 size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="app-main" className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
