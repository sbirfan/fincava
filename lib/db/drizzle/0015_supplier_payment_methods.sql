-- FIN-113: Supplier payment method self-configuration
-- Stores Nequi phone or bank account details for each supplier.
-- Used by operator (V1 manual) and future Wompi disbursement API (V2).
-- Rollback: DROP TABLE IF EXISTS supplier_payment_methods;

CREATE TABLE IF NOT EXISTS supplier_payment_methods (
  id                   SERIAL PRIMARY KEY,
  supplier_id          INTEGER NOT NULL UNIQUE REFERENCES suppliers(id),
  preferred            TEXT NOT NULL DEFAULT 'NEQUI',
  nequi_phone          TEXT,
  bank_name            TEXT,
  bank_account_number  TEXT,
  bank_account_type    TEXT,
  bank_holder_name     TEXT,
  bank_holder_id_type  TEXT,
  bank_holder_id       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX spm_supplier_id_idx ON supplier_payment_methods (supplier_id);
