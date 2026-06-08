-- FIN-V2-ENH-01: Promote product_status from TEXT to a proper PostgreSQL enum.
-- Prevents invalid status values from reaching the DB via direct writes or future bugs.
-- All existing values (draft, pending_review, active) are valid enum members — zero data loss.
-- Rollback:
--   ALTER TABLE products ALTER COLUMN product_status TYPE text USING product_status::text;
--   ALTER TABLE products ALTER COLUMN product_status SET DEFAULT 'draft';
--   DROP TYPE IF EXISTS product_status;

CREATE TYPE "product_status" AS ENUM ('draft', 'pending_review', 'active');

-- The DEFAULT must be dropped before the column type can be changed, then restored.
ALTER TABLE "products" ALTER COLUMN "product_status" DROP DEFAULT;
ALTER TABLE "products"
  ALTER COLUMN "product_status" TYPE "product_status"
    USING "product_status"::"product_status";
ALTER TABLE "products"
  ALTER COLUMN "product_status" SET DEFAULT 'draft'::"product_status";
