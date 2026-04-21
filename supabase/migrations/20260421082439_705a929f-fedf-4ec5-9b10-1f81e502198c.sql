
ALTER VIEW public.v_stock_position SET (security_invoker = true);
ALTER VIEW public.v_available_to_sell SET (security_invoker = true);
ALTER VIEW public.v_pitch_score SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.protect_stock_ledger()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Stock ledger entries cannot be deleted (append-only)';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_committed = true THEN
      RAISE EXCEPTION 'Committed ledger entries are immutable';
    END IF;
    IF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending' THEN
      NEW.is_committed := true;
      NEW.approval_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
