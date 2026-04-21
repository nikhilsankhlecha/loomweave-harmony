
# LoomLedger — Phase 1 Build Plan

A textile-specific ERP for Indian fabric operations. Phase 1 delivers the **foundation + full sales/dispatch/billing loop** end-to-end, with remaining modules scaffolded.

## Backend (Lovable Cloud / Supabase)

### Auth & Roles
- Supabase Auth (email + password). Login, signup (admin-gated), forgot password, `/reset-password` page.
- `profiles` table (id → auth.users, name, phone, is_active).
- `app_role` enum: `admin | inventory | salesman | dispatch | billing`.
- Separate `user_roles` table + `has_role(uuid, app_role)` SECURITY DEFINER function (anti-recursion). Multi-role per user supported with role switcher.
- All tables RLS-enabled; policies use `has_role()`.

### Database — full schema as specified
All 24 tables created: qualities, l_values, colours, warehouses, suppliers, customers, lots, rolls, grn_entries, **stock_ledger (append-only via trigger blocking UPDATE/DELETE on committed rows)**, reservations, quotes, quote_items, sales_orders, sales_order_items, dispatch_notes, dispatch_items, invoices, jobwork_challans, purchase_orders, purchase_order_items, billing_alerts, metre_calculations, metre_calculation_items.

### Core DB logic
- **L-value locking**: every transactional table stores both `l_value_id` AND a denormalized `l_length_metres` snapshot.
- **Metres formula** enforced via generated columns / triggers: `metres = pieces * l_length_metres`.
- **Stock views** (computed live, not stored):
  - `v_stock_position` — per quality/colour/lot/warehouse rollup from committed ledger.
  - `v_available_to_sell` — `total - reserved - blocked - in_transit - at_processor`.
  - `v_pitch_score` — heuristic 0-100: weighted blend of availability tier, ageing (days since inward), 30-day sales velocity, reservation pressure ratio, supplier preferred flag.
- **Approval gate**: ledger rows insert with `approval_status='pending'`, `is_committed=false`. A trigger flips `is_committed=true` only when billing approves; only committed rows feed stock views.
- **Reservation expiry** handled by a scheduled function (or on-read filter for v1).

### Seed data
Realistic seed for 5 qualities, 4–6 colours each with hex swatches, 3 warehouses, 5 suppliers, 4 customers, GRNs, lots, rolls, ledger entries, active quotes/reservations, sales orders in mixed states, pending billing approvals, jobwork in flight, billing alerts, plus one user per role.

## Frontend modules — Phase 1 (fully built)

1. **App shell** — role-aware sidebar, top bar with role switcher, profile menu, dark mode, protected routes, loading/empty/error states.
2. **Role dashboards** — Admin, Inventory, Salesman, Dispatch, Billing (each with the KPIs listed in spec).
3. **Quality Master** — list/filter/search, create/edit, detail page with summary metrics, deactivate.
4. **L-Value Management** — nested under quality detail; multi L per quality, default flag, live "L-120 = 1.20 m/pc" preview.
5. **Colour Master** — within quality context, grid + table views, hex swatches, per-colour stock summary, duplicate-code validation.
6. **Metre Calculator** — multi-row, multi-quality, multi-colour, auto L default + override, live row totals + grand total, save/load drafts, copy-to-clipboard, PDF export. Available to all roles.
7. **Warehouse Master** — CRUD + per-warehouse metre summary.
8. **Supplier Master** — CRUD with type, preferred/blacklist, score.
9. **GRN / Inward** — supplier, warehouse, challan, vehicle; line items (quality/colour/L/pieces → auto metres); roll-level capture; totals; draft until QC.
10. **QC** — per-roll status (pending/passed/failed/conditional), defect notes, shade verification → auto shade-mismatch alert; passed rolls promote to lots and create pending inward ledger.
11. **Lots & Rolls** — lot detail with full ledger event history and consuming orders.
12. **Stock Register** — dense filterable table (quality/colour/lot/warehouse/state/date), totals footer, CSV export.
13. **Immutable Stock Ledger** — append-only audit view with all entry types, approval status, proposer/approver, filters.
14. **Salesman Stock Browser** — available-to-sell only, filters (quality/family/shade/min metres), cards with swatch, available metres, **pitch priority score with bands (80+/60–79/<60)**, reservation pressure indicator.
15. **Quote Builder** — from browser; pieces → metres live; availability vs requested; submit creates **soft reservation**; statuses (draft/submitted/reservation_active/expired/converted). Inline customer create.
16. **Reservation Engine** — soft (quote) + hard (SO) reservations, expiry timers, auto-release, pressure metric exposed to salesman/inventory.
17. **Sales Orders** — billing-side; convert quote → SO; line items; statuses (confirmed/partial/dispatched/invoiced/closed); inline customer create.
18. **Dispatch Queue** — kanban (ready_to_pick → awaiting_billing_auth → approved → dispatched); pick list; lot/roll selection; dispatch creates **proposed deduction ledger rows** (pending) — never commits directly.
19. **Billing Approval Inbox** — list of pending mutation requests with full context (order/quality/colour/lot/L/pieces/metres/proposer/risk); approve commits ledger; reject requires reason; full audit trail.
20. **Invoices** — generated post-approved-dispatch; line items + CGST/SGST/IGST/transport; **PDF download (jsPDF)**; statuses (issued/partial/paid/overdue/cancelled).

## Frontend modules — Phase 1 (scaffolded shells with live data reads)

21. **Billing Alerts Center** — list + resolve/dismiss + CTA to PR; **polled refresh** (React Query). Alert generation logic for Low Stock, Shade Mismatch, Processor Overdue wired in; Dead Stock / Demanding Colour / Peak Time / Procurement Gap stubbed with placeholder rules.
22. **Jobwork Tracker** — outward challan + return entry + overdue flag + processor WIP screen.
23. **Purchase Planning & POs** — auto-suggest from reorder/safety stock, PR → PO → link to GRN, statuses.
24. **Reports & Analytics** — stock position, ageing, L-value summary, colour heatmap, sales velocity, dispatch performance, jobwork WIP, audit log. Tables + charts (Recharts), filters, CSV export.

## UI / UX
- Deep navy primary, warm-white surfaces, teal accent, amber warnings, rose critical. Full dark mode.
- Dense ERP tables for ops; cards only for KPI tiles. Search/filters everywhere.
- Desktop-first, mobile-usable for warehouse/dispatch flows (bottom-sheet actions, large tap targets).
- Polished empty/loading/error states everywhere.

## Stack
React + TS + Tailwind + shadcn, React Router, TanStack Query, React Hook Form + Zod, Recharts, jsPDF, Lovable Cloud (Supabase) for auth/DB/RLS/storage.

## Build summary you'll get at the end
- ✅ what's completed and demoable
- 🟡 what's scaffolded (modules 21–24 depth, advanced alert rules, scheduled reservation expiry)
- 📌 assumptions made (heuristic weights for pitch score, default expiry windows)
- ❓ outstanding clarifications for production hardening (GST rate rules per state, PDF letterhead/branding, mobile barcode scanning, multi-tenant scope)
