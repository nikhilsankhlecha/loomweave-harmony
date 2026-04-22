import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/auth/Auth";
import Dashboard from "@/pages/Dashboard";
import MetreCalculator from "@/pages/MetreCalculator";
import Placeholder from "@/pages/Placeholder";
import { Navigate } from "react-router-dom";
import Qualities from "@/pages/masters/Qualities";
import QualityDetail from "@/pages/masters/QualityDetail";
import Colours from "@/pages/masters/Colours";
import Warehouses from "@/pages/masters/Warehouses";
import Suppliers from "@/pages/masters/Suppliers";
import Customers from "@/pages/masters/Customers";
import SalesBrowser from "@/pages/stock/SalesBrowser";
import StockRegister from "@/pages/stock/StockRegister";
import StockLedger from "@/pages/stock/StockLedger";
import Lots from "@/pages/stock/Lots";
import Quotes from "@/pages/sales/Quotes";
import SalesOrders from "@/pages/sales/SalesOrders";
import Reservations from "@/pages/sales/Reservations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="metre-calculator" element={<MetreCalculator />} />
                <Route path="browse" element={<SalesBrowser />} />
                <Route path="stock" element={<StockRegister />} />
                <Route path="ledger" element={<StockLedger />} />
                <Route path="lots" element={<Lots />} />
                <Route path="grn" element={<Placeholder title="GRN / Inward" description="Goods Receipt Notes with roll-level capture." />} />
                <Route path="qc" element={<Placeholder title="Quality Control" description="Per-roll QC and shade verification." />} />
                <Route path="quotes" element={<Quotes />} />
                <Route path="orders" element={<SalesOrders />} />
                <Route path="reservations" element={<Reservations />} />
                <Route path="dispatch" element={<Placeholder title="Dispatch Queue" description="Pick lists and proposed deductions." />} />
                <Route path="approvals" element={<Placeholder title="Billing Approvals" description="Approve or reject proposed stock mutations." />} />
                <Route path="invoices" element={<Placeholder title="Invoices" description="Generated invoices with PDF download." />} />
                <Route path="alerts" element={<Placeholder title="Alerts Center" description="Low stock, demanding colour, processor overdue & more." />} />
                <Route path="jobwork" element={<Placeholder title="Jobwork Tracker" description="Outward and return tracking for processors." />} />
                <Route path="purchase" element={<Placeholder title="Purchase Orders" description="Auto-suggested purchase planning." />} />
                <Route path="reports" element={<Placeholder title="Reports & Analytics" description="Operational reports across stock, sales, and dispatch." />} />
                <Route path="qualities" element={<Qualities />} />
                <Route path="qualities/:id" element={<QualityDetail />} />
                <Route path="colours" element={<Colours />} />
                <Route path="warehouses" element={<Warehouses />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="customers" element={<Customers />} />
                <Route path="users" element={<Placeholder title="Users & Roles" description="Manage team members and role assignments." />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
