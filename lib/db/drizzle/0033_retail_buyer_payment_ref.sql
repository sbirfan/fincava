-- FIN-114: Nequi interim payment — buyer payment reference
-- Buyer submits their Nequi transaction ID after making the manual transfer.
-- Admin cross-checks in Nequi app before marking the order AUTHORIZED.
-- Forward-compatible: column stays relevant after Wompi integration as a
-- buyer-supplied reference field for manual/fallback payment confirmation.
-- Rollback: ALTER TABLE retail_order_details DROP COLUMN IF EXISTS buyer_payment_ref;

ALTER TABLE retail_order_details
  ADD COLUMN IF NOT EXISTS buyer_payment_ref TEXT;
