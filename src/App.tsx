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
import StockAlerts from "@/pages/stock/StockAlerts";
import Quotes from "@/pages/sales/Quotes";
import SalesOrders from "@/pages/sales/SalesOrders";
import Reservations from "@/pages/sales/Reservations";
import DispatchQueue from "@/pages/dispatch/DispatchQueue";
import Approvals from "@/pages/billing/Approvals";
import Invoices from "@/pages/billing/Invoices";
import GRN from "@/pages/inward/GRN";
import QC from "@/pages/inward/QC";
import AlertsCenter from "@/pages/alerts/AlertsCenter";
import Jobwork from "@/pages/operations/Jobwork";
import PurchaseOrders from "@/pages/operations/PurchaseOrders";
import Reports from "@/pages/operations/Reports";

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
                <Route path="stock-alerts" element={<StockAlerts />} />
                <Route path="grn" element={<GRN />} />
                <Route path="qc" element={<QC />} />
                <Route path="quotes" element={<Quotes />} />
                <Route path="orders" element={<SalesOrders />} />
                <Route path="reservations" element={<Reservations />} />
                <Route path="dispatch" element={<DispatchQueue />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="alerts" element={<AlertsCenter />} />
                <Route path="jobwork" element={<Jobwork />} />
                <Route path="purchase" element={<PurchaseOrders />} />
                <Route path="reports" element={<Reports />} />
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
