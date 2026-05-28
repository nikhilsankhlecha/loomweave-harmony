import {
  LayoutDashboard, Layers, Palette, Calculator, Warehouse, Truck, Package, ClipboardList,
  ScrollText, Users, Receipt, Bell, FileBarChart, Building2, ShieldCheck, ArrowRightLeft,
  Boxes, FileSpreadsheet, ShoppingCart, Settings, Siren, SlidersHorizontal,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth, AppRole } from "@/contexts/AuthContext";

type Item = { title: string; url: string; icon: any; roles?: AppRole[] };

const SECTIONS: { label: string; items: Item[] }[] = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/app", icon: LayoutDashboard },
    { title: "Metre Calculator", url: "/app/metre-calculator", icon: Calculator },
  ]},
  { label: "Stock", items: [
    { title: "Salesman Browser", url: "/app/browse", icon: Boxes, roles: ["salesman","admin","billing"] },
    { title: "Stock Register", url: "/app/stock", icon: ScrollText, roles: ["inventory","dispatch","billing","admin"] },
    { title: "Stock Ledger", url: "/app/ledger", icon: FileSpreadsheet, roles: ["inventory","dispatch","billing","admin"] },
    { title: "Lots & Rolls", url: "/app/lots", icon: Layers, roles: ["inventory","dispatch","billing","admin"] },
    { title: "Stock Alerts", url: "/app/stock-alerts", icon: Siren, roles: ["inventory","billing","admin"] },
    { title: "Stock Adjustments", url: "/app/stock-adjustments", icon: SlidersHorizontal, roles: ["inventory","admin","dispatch"] },
  ]},
  { label: "Inward", items: [
    { title: "GRN / Inward", url: "/app/grn", icon: Package, roles: ["inventory","admin"] },
    { title: "QC", url: "/app/qc", icon: ShieldCheck, roles: ["inventory","admin"] },
  ]},
  { label: "Sales", items: [
    { title: "Quotes", url: "/app/quotes", icon: ClipboardList, roles: ["salesman","billing","admin"] },
    { title: "Sales Orders", url: "/app/orders", icon: ShoppingCart, roles: ["billing","admin","dispatch","salesman"] },
    { title: "Reservations", url: "/app/reservations", icon: ArrowRightLeft, roles: ["salesman","inventory","billing","admin"] },
  ]},
  { label: "Dispatch & Billing", items: [
    { title: "Dispatch Queue", url: "/app/dispatch", icon: Truck, roles: ["dispatch","billing","admin"] },
    { title: "Billing Approvals", url: "/app/approvals", icon: ShieldCheck, roles: ["billing","admin"] },
    { title: "Invoices", url: "/app/invoices", icon: Receipt, roles: ["billing","admin","salesman"] },
    { title: "Alerts Center", url: "/app/alerts", icon: Bell, roles: ["billing","inventory","admin"] },
  ]},
  { label: "Operations", items: [
    { title: "Jobwork", url: "/app/jobwork", icon: ArrowRightLeft, roles: ["inventory","admin"] },
    { title: "Purchase Orders", url: "/app/purchase", icon: ShoppingCart, roles: ["inventory","billing","admin"] },
    { title: "Reports", url: "/app/reports", icon: FileBarChart, roles: ["billing","inventory","admin"] },
  ]},
  { label: "Masters", items: [
    { title: "Qualities", url: "/app/qualities", icon: Layers, roles: ["inventory","admin"] },
    { title: "Colours", url: "/app/colours", icon: Palette, roles: ["inventory","admin"] },
    { title: "Warehouses", url: "/app/warehouses", icon: Warehouse, roles: ["inventory","admin"] },
    { title: "Suppliers", url: "/app/suppliers", icon: Building2, roles: ["inventory","admin"] },
    { title: "Customers", url: "/app/customers", icon: Users, roles: ["billing","salesman","admin"] },
    { title: "Users & Roles", url: "/app/users", icon: Settings, roles: ["admin"] },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasRole } = useAuth();
  const loc = useLocation();

  const visible = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.roles || hasRole(i.roles)),
  })).filter((s) => s.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-black">
            S
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-bold text-sidebar-accent-foreground tracking-tight">Sidharth Creation</div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground">Textile ERP</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visible.map((sec) => (
          <SidebarGroup key={sec.label}>
            {!collapsed && <SidebarGroupLabel>{sec.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {sec.items.map((item) => {
                  const active = loc.pathname === item.url || (item.url !== "/app" && loc.pathname.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <NavLink to={item.url} end={item.url === "/app"}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}