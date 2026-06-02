-- FIN retail Sprint 1: retail_payment_transactions table (TDD §2.3.4)
-- Rollback: DROP TABLE IF EXISTS retail_payment_transactions;

CREATE TABLE IF NOT EXISTS retail_payment_transactions (
  id                  serial PRIMARY KEY,
  order_id            integer NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  gateway             text NOT NULL,
  external_id         text,
  instrument_type     text,
  settles_immediately boolean,
  status              text NOT NULL DEFAULT 'PENDING',
  amount_cents        integer NOT NULL,
  currency            text NOT NULL DEFAULT 'COP',
  idempotency_key     text,
  sla_void_deadline   timestamptz,
  authorization_ref   text,
  initiated_by        text NOT NULL,
  gateway_payload     jsonb,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpt_order_id_idx ON retail_payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS rpt_status_idx ON retail_payment_transactions (status);
CREATE UNIQUE INDEX IF NOT EXISTS rpt_idempotency_uidx ON retail_payment_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS rpt_sla_sweep_idx ON retail_payment_transactions (sla_void_deadline) WHERE status = 'AUTHORIZED';
