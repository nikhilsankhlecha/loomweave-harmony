ALTER TABLE public.stock_ledger DISABLE TRIGGER USER;
DELETE FROM public.stock_ledger WHERE reference_type = 'dispatch_note' AND is_committed = false;
ALTER TABLE public.stock_ledger ENABLE TRIGGER USER;

DELETE FROM public.invoices WHERE dispatch_note_id IS NOT NULL;
DELETE FROM public.dispatch_items;
DELETE FROM public.dispatch_notes;