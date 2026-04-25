ALTER TABLE "email_verification_tokens" ALTER COLUMN "user_id" DROP DEFAULT;
--> statement-breakpoint
DROP SEQUENCE IF EXISTS "email_verification_tokens_user_id_seq";
