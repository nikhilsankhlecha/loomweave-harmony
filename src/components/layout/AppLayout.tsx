import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Moon, Sun, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<AppRole,string> = {
  admin: "Admin", inventory: "Inventory", salesman: "Salesman", dispatch: "Dispatch", billing: "Billing"
};

export default function AppLayout() {
  const { session, loading, profile, roles, activeRole, setActiveRole, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (roles.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">No role assigned</h1>
          <p className="text-muted-foreground">Your account has no role yet. Ask an admin to assign one.</p>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden text-sm text-muted-foreground sm:block">
                <span className="font-semibold text-foreground">LoomLedger</span> · Textile Operations
              </div>
            </div>
            <div className="flex items-center gap-2">
              {roles.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Badge variant="secondary" className="font-mono">{activeRole && ROLE_LABELS[activeRole]}</Badge>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Switch role</DropdownMenuLabel>
                    {roles.map((r) => (
                      <DropdownMenuItem key={r} onClick={() => { setActiveRole(r); nav("/app"); }}>
                        {ROLE_LABELS[r]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                activeRole && <Badge variant="secondary" className="font-mono">{ROLE_LABELS[activeRole]}</Badge>
              )}
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{profile?.name ?? "Profile"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}