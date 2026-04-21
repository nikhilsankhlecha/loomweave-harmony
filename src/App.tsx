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
                <Route path="browse" element={<Placeholder title="Salesman Stock Browser" description="Available-to-sell with pitch priority score." />} />
                <Route path="stock" element={<Placeholder title="Stock Register" description="Filterable stock register across qualities, colours, lots and warehouses." />} />
                <Route path="ledger" element={<Placeholder title="Immutable Stock Ledger" description="Append-only audit log of every stock movement." />} />
                <Route path="lots" element={<Placeholder title="Lots & Rolls" description="Lot detail with full event history." />} />
                <Route path="grn" element={<Placeholder title="GRN / Inward" description="Goods Receipt Notes with roll-level capture." />} />
                <Route path="qc" element={<Placeholder title="Quality Control" description="Per-roll QC and shade verification." />} />
                <Route path="quotes" element={<Placeholder title="Quotes" description="Quote builder with soft reservations." />} />
                <Route path="orders" element={<Placeholder title="Sales Orders" description="Confirmed orders with hard reservations." />} />
                <Route path="reservations" element={<Placeholder title="Reservations" description="Soft + hard reservation engine." />} />
                <Route path="dispatch" element={<Placeholder title="Dispatch Queue" description="Pick lists and proposed deductions." />} />
                <Route path="approvals" element={<Placeholder title="Billing Approvals" description="Approve or reject proposed stock mutations." />} />
                <Route path="invoices" element={<Placeholder title="Invoices" description="Generated invoices with PDF download." />} />
                <Route path="alerts" element={<Placeholder title="Alerts Center" description="Low stock, demanding colour, processor overdue & more." />} />
                <Route path="jobwork" element={<Placeholder title="Jobwork Tracker" description="Outward and return tracking for processors." />} />
                <Route path="purchase" element={<Placeholder title="Purchase Orders" description="Auto-suggested purchase planning." />} />
                <Route path="reports" element={<Placeholder title="Reports & Analytics" description="Operational reports across stock, sales, and dispatch." />} />
                <Route path="qualities" element={<Placeholder title="Quality Master" description="Manage fabric qualities and L-values." />} />
                <Route path="colours" element={<Placeholder title="Colour Master" description="Manage colours under each quality." />} />
                <Route path="warehouses" element={<Placeholder title="Warehouses" description="Godown master." />} />
                <Route path="suppliers" element={<Placeholder title="Suppliers" description="Suppliers, processors and transporters." />} />
                <Route path="customers" element={<Placeholder title="Customers" description="Customer master with credit and GST." />} />
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
