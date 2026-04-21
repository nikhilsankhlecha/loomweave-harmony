
-- =============================================================
-- LOOMLEDGER TEXTILE ERP - PHASE 1 SCHEMA
-- =============================================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','inventory','salesman','dispatch','billing');
CREATE TYPE public.lot_status AS ENUM ('pending_qc','active','depleted','blocked','at_processor');
CREATE TYPE public.qc_status AS ENUM ('pending','passed','failed','conditional');
CREATE TYPE public.grn_status AS ENUM ('draft','qc_pending','completed','cancelled');
CREATE TYPE public.ledger_entry_type AS ENUM (
  'inward_grn','inward_return','inward_adjustment',
  'deduct_dispatch','deduct_transfer','deduct_jobwork_out',
  'reserve','unreserve','block','unblock','jobwork_return'
);
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected','auto_committed');
CREATE TYPE public.reservation_type AS ENUM ('soft','hard');
CREATE TYPE public.reservation_status AS ENUM ('active','expired','released','consumed');
CREATE TYPE public.quote_status AS ENUM ('draft','submitted','reservation_active','expired','converted','cancelled');
CREATE TYPE public.sales_order_status AS ENUM ('confirmed','partial_dispatch','dispatched','invoiced','closed','cancelled');
CREATE TYPE public.dispatch_status AS ENUM ('ready_to_pick','awaiting_billing_auth','approved','dispatched','rejected');
CREATE TYPE public.invoice_status AS ENUM ('issued','partially_paid','paid','overdue','cancelled');
CREATE TYPE public.jobwork_status AS ENUM ('sent','partial_return','returned','overdue','cancelled');
CREATE TYPE public.po_status AS ENUM ('raised','acknowledged','in_production','dispatched','partially_received','completed','cancelled');
CREATE TYPE public.alert_severity AS ENUM ('info','warning','critical');
CREATE TYPE public.alert_type AS ENUM ('low_stock','demanding_colour','peak_time','procurement_gap','dead_stock','processor_overdue','shade_mismatch','ageing_trigger');

-- =============================================================
-- PROFILES & ROLES
-- =============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- has_role function (SECURITY DEFINER, anti-recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =============================================================
-- MASTERS
-- =============================================================
CREATE TABLE public.qualities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_code TEXT NOT NULL UNIQUE,
  quality_name TEXT NOT NULL,
  composition TEXT,
  gsm NUMERIC,
  width_inches NUMERIC,
  weave TEXT,
  category TEXT,
  reorder_point NUMERIC DEFAULT 0,
  safety_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC,
  is_seasonal BOOLEAN DEFAULT false,
  season_start DATE,
  season_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER tr_qualities_updated BEFORE UPDATE ON public.qualities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.l_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_id UUID NOT NULL REFERENCES public.qualities(id) ON DELETE CASCADE,
  l_code TEXT NOT NULL,
  length_metres NUMERIC NOT NULL CHECK (length_metres > 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quality_id, l_code)
);
CREATE INDEX idx_lvalues_quality ON public.l_values(quality_id);

CREATE TABLE public.colours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_id UUID NOT NULL REFERENCES public.qualities(id) ON DELETE CASCADE,
  colour_code TEXT NOT NULL,
  colour_name TEXT NOT NULL,
  shade_band TEXT,
  colour_family TEXT,
  hex_preview TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quality_id, colour_code)
);
CREATE INDEX idx_colours_quality ON public.colours(quality_id);

CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  city TEXT,
  address TEXT,
  warehouse_type TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gstin TEXT,
  city TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  payment_terms TEXT,
  supplier_type TEXT,
  score NUMERIC DEFAULT 0,
  is_preferred BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gstin TEXT,
  city TEXT,
  state TEXT,
  credit_limit NUMERIC DEFAULT 0,
  payment_terms TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- INWARD: GRN, LOTS, ROLLS
-- =============================================================
CREATE TABLE public.grn_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_code TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_order_id UUID,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  received_by UUID REFERENCES public.profiles(id),
  challan_number TEXT,
  vehicle_number TEXT,
  grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_pieces NUMERIC DEFAULT 0,
  total_metres NUMERIC DEFAULT 0,
  status public.grn_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_code TEXT NOT NULL UNIQUE,
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  grn_id UUID REFERENCES public.grn_entries(id),
  total_pieces NUMERIC NOT NULL DEFAULT 0,
  total_metres NUMERIC NOT NULL DEFAULT 0,
  available_pieces NUMERIC NOT NULL DEFAULT 0,
  available_metres NUMERIC NOT NULL DEFAULT 0,
  lot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  lot_status public.lot_status NOT NULL DEFAULT 'pending_qc',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lots_qc ON public.lots(quality_id, colour_id);

CREATE TABLE public.rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  roll_number TEXT NOT NULL,
  metres NUMERIC,
  weight_kg NUMERIC,
  qc_status public.qc_status NOT NULL DEFAULT 'pending',
  defect_notes TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- IMMUTABLE STOCK LEDGER
-- =============================================================
CREATE TABLE public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  lot_id UUID REFERENCES public.lots(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  entry_type public.ledger_entry_type NOT NULL,
  pieces NUMERIC NOT NULL,
  metres NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  proposed_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approval_status public.approval_status NOT NULL DEFAULT 'pending',
  approval_at TIMESTAMPTZ,
  rejection_note TEXT,
  is_committed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_qc ON public.stock_ledger(quality_id, colour_id);
CREATE INDEX idx_ledger_lot ON public.stock_ledger(lot_id);
CREATE INDEX idx_ledger_committed ON public.stock_ledger(is_committed, approval_status);

-- Append-only protection: no UPDATE on committed; no DELETE ever
CREATE OR REPLACE FUNCTION public.protect_stock_ledger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Stock ledger entries cannot be deleted (append-only)';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_committed = true THEN
      RAISE EXCEPTION 'Committed ledger entries are immutable';
    END IF;
    -- Allowed: pending -> approved/rejected by billing
    IF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending' THEN
      NEW.is_committed := true;
      NEW.approval_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_protect_stock_ledger
  BEFORE UPDATE OR DELETE ON public.stock_ledger
  FOR EACH ROW EXECUTE FUNCTION public.protect_stock_ledger();

-- =============================================================
-- SALES: QUOTES, RESERVATIONS, SO, DISPATCH, INVOICE
-- =============================================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_code TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  salesman_id UUID REFERENCES public.profiles(id),
  status public.quote_status NOT NULL DEFAULT 'draft',
  total_pieces NUMERIC DEFAULT 0,
  total_metres NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  pieces NUMERIC NOT NULL,
  metres NUMERIC NOT NULL,
  unit_rate NUMERIC DEFAULT 0,
  line_value NUMERIC DEFAULT 0
);

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  lot_id UUID REFERENCES public.lots(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  pieces NUMERIC NOT NULL,
  metres NUMERIC NOT NULL,
  reservation_type public.reservation_type NOT NULL DEFAULT 'soft',
  sales_order_id UUID,
  quote_id UUID REFERENCES public.quotes(id),
  reserved_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  status public.reservation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservations_active ON public.reservations(status, quality_id, colour_id);

CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  salesman_id UUID REFERENCES public.profiles(id),
  quote_id UUID REFERENCES public.quotes(id),
  customer_po TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  payment_terms TEXT,
  status public.sales_order_status NOT NULL DEFAULT 'confirmed',
  total_pieces NUMERIC DEFAULT 0,
  total_metres NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  lot_id UUID REFERENCES public.lots(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  ordered_pieces NUMERIC NOT NULL,
  ordered_metres NUMERIC NOT NULL,
  dispatched_pieces NUMERIC DEFAULT 0,
  dispatched_metres NUMERIC DEFAULT 0,
  unit_rate NUMERIC DEFAULT 0
);

CREATE TABLE public.dispatch_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dn_code TEXT NOT NULL UNIQUE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id),
  dispatch_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  dispatch_date DATE,
  vehicle_number TEXT,
  transport_partner TEXT,
  lr_number TEXT,
  total_pieces NUMERIC DEFAULT 0,
  total_metres NUMERIC DEFAULT 0,
  status public.dispatch_status NOT NULL DEFAULT 'ready_to_pick',
  notes TEXT,
  rejection_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_note_id UUID NOT NULL REFERENCES public.dispatch_notes(id) ON DELETE CASCADE,
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  lot_id UUID REFERENCES public.lots(id),
  roll_id UUID REFERENCES public.rolls(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  pieces NUMERIC NOT NULL,
  metres NUMERIC NOT NULL
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code TEXT NOT NULL UNIQUE,
  dispatch_note_id UUID REFERENCES public.dispatch_notes(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  billing_user_id UUID REFERENCES public.profiles(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_pieces NUMERIC DEFAULT 0,
  total_metres NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  transport_charges NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_due_date DATE,
  status public.invoice_status NOT NULL DEFAULT 'issued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- JOBWORK & PURCHASE ORDERS
-- =============================================================
CREATE TABLE public.jobwork_challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_code TEXT NOT NULL UNIQUE,
  lot_id UUID REFERENCES public.lots(id),
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  processor_id UUID REFERENCES public.suppliers(id),
  process_type TEXT,
  pieces_sent NUMERIC NOT NULL,
  metres_sent NUMERIC NOT NULL,
  pieces_returned NUMERIC DEFAULT 0,
  metres_returned NUMERIC DEFAULT 0,
  yield_loss_metres NUMERIC DEFAULT 0,
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  promised_return DATE,
  actual_return DATE,
  status public.jobwork_status NOT NULL DEFAULT 'sent',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_code TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  raised_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  total_pieces NUMERIC DEFAULT 0,
  total_metres NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  status public.po_status NOT NULL DEFAULT 'raised',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  quality_id UUID NOT NULL REFERENCES public.qualities(id),
  colour_id UUID NOT NULL REFERENCES public.colours(id),
  l_value_id UUID NOT NULL REFERENCES public.l_values(id),
  l_length_metres NUMERIC NOT NULL,
  pieces NUMERIC NOT NULL,
  metres NUMERIC NOT NULL,
  unit_rate NUMERIC DEFAULT 0
);

CREATE TABLE public.billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type public.alert_type NOT NULL,
  severity public.alert_severity NOT NULL DEFAULT 'info',
  quality_id UUID REFERENCES public.qualities(id),
  colour_id UUID REFERENCES public.colours(id),
  title TEXT NOT NULL,
  message TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- METRE CALCULATOR
-- =============================================================
CREATE TABLE public.metre_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_name TEXT,
  created_by UUID REFERENCES public.profiles(id),
  grand_total_metres NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.metre_calculation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID NOT NULL REFERENCES public.metre_calculations(id) ON DELETE CASCADE,
  quality_id UUID REFERENCES public.qualities(id),
  colour_id UUID REFERENCES public.colours(id),
  l_value_id UUID REFERENCES public.l_values(id),
  l_length_metres NUMERIC,
  pieces NUMERIC,
  metres NUMERIC
);

-- =============================================================
-- VIEWS: STOCK POSITION, AVAILABLE-TO-SELL, PITCH SCORE
-- =============================================================

-- Stock position: rollup of committed ledger
CREATE OR REPLACE VIEW public.v_stock_position AS
SELECT
  sl.quality_id,
  sl.colour_id,
  sl.lot_id,
  sl.warehouse_id,
  SUM(CASE WHEN sl.entry_type IN ('inward_grn','inward_return','inward_adjustment','jobwork_return','unreserve','unblock')
           THEN sl.metres ELSE 0 END) -
  SUM(CASE WHEN sl.entry_type IN ('deduct_dispatch','deduct_transfer','deduct_jobwork_out','reserve','block')
           THEN sl.metres ELSE 0 END) AS total_metres,
  SUM(CASE WHEN sl.entry_type IN ('inward_grn','inward_return','inward_adjustment','jobwork_return','unreserve','unblock')
           THEN sl.pieces ELSE 0 END) -
  SUM(CASE WHEN sl.entry_type IN ('deduct_dispatch','deduct_transfer','deduct_jobwork_out','reserve','block')
           THEN sl.pieces ELSE 0 END) AS total_pieces
FROM public.stock_ledger sl
WHERE sl.is_committed = true
GROUP BY sl.quality_id, sl.colour_id, sl.lot_id, sl.warehouse_id;

-- Available-to-sell per quality+colour (subtracts active reservations)
CREATE OR REPLACE VIEW public.v_available_to_sell AS
SELECT
  q.id AS quality_id,
  c.id AS colour_id,
  q.quality_code,
  q.quality_name,
  c.colour_code,
  c.colour_name,
  c.colour_family,
  c.shade_band,
  c.hex_preview,
  COALESCE(SUM(sp.total_metres),0) AS total_metres,
  COALESCE((SELECT SUM(r.metres) FROM public.reservations r
            WHERE r.quality_id = q.id AND r.colour_id = c.id AND r.status='active'),0) AS reserved_metres,
  COALESCE(SUM(sp.total_metres),0) -
  COALESCE((SELECT SUM(r.metres) FROM public.reservations r
            WHERE r.quality_id = q.id AND r.colour_id = c.id AND r.status='active'),0) AS available_metres
FROM public.qualities q
JOIN public.colours c ON c.quality_id = q.id
LEFT JOIN public.v_stock_position sp ON sp.quality_id = q.id AND sp.colour_id = c.id
WHERE q.is_active = true AND c.is_active = true
GROUP BY q.id, c.id;

-- Pitch score (0-100) - heuristic
CREATE OR REPLACE VIEW public.v_pitch_score AS
SELECT
  ats.quality_id,
  ats.colour_id,
  ats.available_metres,
  ats.reserved_metres,
  ats.total_metres,
  CASE WHEN ats.total_metres > 0
       THEN LEAST(100, ROUND(
         -- availability (40 pts)
         (LEAST(ats.available_metres / NULLIF(GREATEST(q.safety_stock,100),0), 1) * 40)
         -- low reservation pressure (30 pts)
         + ((1 - LEAST(ats.reserved_metres / NULLIF(ats.total_metres,0), 1)) * 30)
         -- ageing freshness (20 pts) - newer lots score higher
         + (COALESCE((SELECT (1 - LEAST(EXTRACT(EPOCH FROM (now() - MIN(l.lot_date::timestamptz)))/86400/90, 1)) * 20
              FROM public.lots l WHERE l.quality_id=ats.quality_id AND l.colour_id=ats.colour_id),0))
         -- preferred supplier bonus (10 pts)
         + (COALESCE((SELECT 10 FROM public.lots l JOIN public.suppliers s ON s.id=l.supplier_id
              WHERE l.quality_id=ats.quality_id AND l.colour_id=ats.colour_id AND s.is_preferred=true LIMIT 1),0))
       ))::INT
       ELSE 0
  END AS pitch_score
FROM public.v_available_to_sell ats
JOIN public.qualities q ON q.id = ats.quality_id;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.l_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobwork_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metre_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metre_calculation_items ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- USER_ROLES
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- QUALITIES, L_VALUES, COLOURS - read by all auth; write by admin/inventory
CREATE POLICY "All read qualities" ON public.qualities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv mgr admin write qualities" ON public.qualities FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

CREATE POLICY "All read lvalues" ON public.l_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv mgr admin write lvalues" ON public.l_values FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

CREATE POLICY "All read colours" ON public.colours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv mgr admin write colours" ON public.colours FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

-- WAREHOUSES, SUPPLIERS, CUSTOMERS
CREATE POLICY "All read warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv admin write warehouses" ON public.warehouses FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

-- Suppliers: hide from salesman
CREATE POLICY "Non-salesman read suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Inv admin write suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

CREATE POLICY "All read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales billing admin write customers" ON public.customers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing','salesman']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','billing','salesman']::public.app_role[]));

-- GRN, LOTS, ROLLS - inventory + admin write; non-salesman read
CREATE POLICY "Non-sales read grn" ON public.grn_entries FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Inv admin write grn" ON public.grn_entries FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

CREATE POLICY "All read lots" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inv admin write lots" ON public.lots FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

CREATE POLICY "Non-sales read rolls" ON public.rolls FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Inv admin write rolls" ON public.rolls FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

-- STOCK LEDGER: non-sales read; dispatch+inventory can insert (proposals); only billing can update (approve)
CREATE POLICY "Non-sales read ledger" ON public.stock_ledger FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Operators insert ledger proposals" ON public.stock_ledger FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch']::public.app_role[]));
CREATE POLICY "Billing approves ledger" ON public.stock_ledger FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]));

-- RESERVATIONS
CREATE POLICY "All read reservations" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales billing write reservations" ON public.reservations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]));

-- QUOTES
CREATE POLICY "Quotes readable by sales billing admin" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]));
CREATE POLICY "Sales create quotes" ON public.quotes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]));

CREATE POLICY "Quote items same as quotes read" ON public.quote_items FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]));
CREATE POLICY "Quote items write" ON public.quote_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','salesman','billing']::public.app_role[]));

-- SALES ORDERS - billing creates; all roles read
CREATE POLICY "All read SO" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Billing admin write SO" ON public.sales_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]));

CREATE POLICY "All read SO items" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Billing write SO items" ON public.sales_order_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]));

-- DISPATCH - non-sales read; dispatch creates; billing approves
CREATE POLICY "Non-sales read DN" ON public.dispatch_notes FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Dispatch create DN" ON public.dispatch_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatch']::public.app_role[]));
CREATE POLICY "Dispatch billing update DN" ON public.dispatch_notes FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatch','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatch','billing']::public.app_role[]));

CREATE POLICY "Non-sales read DI" ON public.dispatch_items FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Dispatch write DI" ON public.dispatch_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatch','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatch','billing']::public.app_role[]));

-- INVOICES - billing only
CREATE POLICY "Billing read invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing','salesman']::public.app_role[]));
CREATE POLICY "Billing write invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','billing']::public.app_role[]));

-- JOBWORK
CREATE POLICY "Non-sales read jw" ON public.jobwork_challans FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','dispatch','billing']::public.app_role[]));
CREATE POLICY "Inv admin write jw" ON public.jobwork_challans FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory']::public.app_role[]));

-- PURCHASE ORDERS
CREATE POLICY "Non-sales read po" ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]));
CREATE POLICY "Inv billing write po" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]));

CREATE POLICY "Non-sales read po items" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]));
CREATE POLICY "Inv billing write po items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]));

-- BILLING ALERTS
CREATE POLICY "Non-sales read alerts" ON public.billing_alerts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','inventory','billing']::public.app_role[]));
CREATE POLICY "Billing write alerts" ON public.billing_alerts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','billing','inventory']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','billing','inventory']::public.app_role[]));

-- METRE CALCULATOR - all auth; users own their drafts
CREATE POLICY "Users read own calc" ON public.metre_calculations FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users write own calc" ON public.metre_calculations FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users read own calc items" ON public.metre_calculation_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.metre_calculations mc WHERE mc.id=calculation_id AND (mc.created_by=auth.uid() OR public.is_admin(auth.uid()))));
CREATE POLICY "Users write own calc items" ON public.metre_calculation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.metre_calculations mc WHERE mc.id=calculation_id AND (mc.created_by=auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.metre_calculations mc WHERE mc.id=calculation_id AND (mc.created_by=auth.uid() OR public.is_admin(auth.uid()))));
