-- FIN-V2-ENH-01: Promote product_status from TEXT to a proper PostgreSQL enum.
-- Prevents invalid status values from reaching the DB via direct writes or future bugs.
-- All existing values (draft, pending_review, active) are valid enum members — zero data loss.
-- Rollback:
--   ALTER TABLE products ALTER COLUMN product_status TYPE text USING product_status::text;
--   ALTER TABLE products ALTER COLUMN product_status SET DEFAULT 'draft';
--   DROP TYPE IF EXISTS product_status;

-- Pre-flight: abort if any row has a value outside the valid set.
-- The USING cast below would fail with a cryptic error; this surfaces the problem clearly.
DO $$
DECLARE bad_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM products
  WHERE product_status NOT IN ('draft', 'pending_review', 'active');
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % row(s) have an invalid product_status value. Fix the data before running this migration.', bad_count;
  END IF;
END $$;

CREATE TYPE "product_status" AS ENUM ('draft', 'pending_review', 'active');

-- The DEFAULT must be dropped before the column type can be changed, then restored.
ALTER TABLE "products" ALTER COLUMN "product_status" DROP DEFAULT;
ALTER TABLE "products"
  ALTER COLUMN "product_status" TYPE "product_status"
    USING "product_status"::"product_status";
ALTER TABLE "products"
  ALTER COLUMN "product_status" SET DEFAULT 'draft'::"product_status";
