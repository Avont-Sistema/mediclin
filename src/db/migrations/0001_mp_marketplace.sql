-- Fase: migração Stripe → Mercado Pago Marketplace
-- Drizzle statement-breakpoint separates statements for safe execution

-- professionals: troca campos Stripe Connect por Mercado Pago
ALTER TABLE "professionals" DROP COLUMN IF EXISTS "stripe_account_id";--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN IF EXISTS "stripe_account_ativo";--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "mp_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "mp_access_token" text;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "mp_account_ativo" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- appointments: troca campo stripe por mp
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "mp_preference_id" varchar(255);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "mp_payment_id" varchar(255);--> statement-breakpoint

-- payments: troca campos stripe por mp (adiciona com default temporário para NOT NULL)
ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripe_transfer_id";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mp_payment_id" varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mp_transfer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "mp_payment_id" DROP DEFAULT;--> statement-breakpoint

-- subscriptions: troca campos stripe por mp
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_price_id";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "mp_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "mp_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "mp_plan_id" varchar(255);
