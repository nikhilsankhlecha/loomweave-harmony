import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ReactNode } from "react";

// Mock supabase to keep these as pure render smoke tests.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
        in: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
      }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" }, profile: { id: "u1", name: "Test" }, roles: ["admin"],
    activeRole: "admin", hasRole: () => true, loading: false, signOut: vi.fn(), setActiveRole: vi.fn(),
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("Route smoke tests", () => {
  it("Stock Adjustments page renders", async () => {
    const Page = (await import("@/pages/stock/StockAdjustments")).default;
    render(<Page />, { wrapper });
    expect(await screen.findByText(/Stock Adjustments/i)).toBeInTheDocument();
  });

  it("Pending Adjustments page renders empty state", async () => {
    const Page = (await import("@/pages/stock/PendingAdjustments")).default;
    render(<Page />, { wrapper });
    expect(await screen.findByText(/Pending Stock Adjustments/i)).toBeInTheDocument();
  });

  it("Reservations page renders", async () => {
    const Page = (await import("@/pages/sales/Reservations")).default;
    render(<Page />, { wrapper });
    expect(await screen.findByRole("heading", { name: /Reservations/i })).toBeInTheDocument();
  });

  it("Dispatch Queue page renders", async () => {
    const Page = (await import("@/pages/dispatch/DispatchQueue")).default;
    render(<Page />, { wrapper });
    expect(await screen.findByText(/Dispatch Queue/i)).toBeInTheDocument();
  });

  it("Billing Approvals page renders", async () => {
    const Page = (await import("@/pages/billing/Approvals")).default;
    render(<Page />, { wrapper });
    expect(await screen.findByText(/Billing Approvals/i)).toBeInTheDocument();
  });
});