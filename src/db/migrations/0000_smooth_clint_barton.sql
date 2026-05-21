CREATE TYPE "public"."appointment_status" AS ENUM('aguardando_pagamento', 'confirmado', 'concluido', 'cancelado', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."dia_semana" AS ENUM('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');--> statement-breakpoint
CREATE TYPE "public"."plano" AS ENUM('free', 'pro', 'clinic');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ativa', 'cancelada', 'inadimplente', 'trial');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"inicio" timestamp NOT NULL,
	"fim" timestamp NOT NULL,
	"status" "appointment_status" DEFAULT 'aguardando_pagamento' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"valor_pago" numeric(10, 2),
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"inicio" timestamp NOT NULL,
	"fim" timestamp NOT NULL,
	"motivo" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"dia_semana" "dia_semana" NOT NULL,
	"hora_inicio" varchar(5) NOT NULL,
	"hora_fim" varchar(5) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "avail_rules_unique" UNIQUE("professional_id","dia_semana","hora_inicio")
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"cnpj" varchar(18),
	"telefone" varchar(20),
	"endereco" text,
	"owner_user_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"telefone" varchar(20) NOT NULL,
	"cpf" varchar(14),
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"stripe_payment_intent_id" varchar(255) NOT NULL,
	"stripe_transfer_id" varchar(255),
	"valor_bruto" numeric(10, 2) NOT NULL,
	"taxa_plataforma" numeric(10, 2) NOT NULL,
	"valor_liquido" numeric(10, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"clinic_id" uuid,
	"slug" varchar(100) NOT NULL,
	"nome_completo" varchar(255) NOT NULL,
	"especialidade" varchar(100) NOT NULL,
	"registro" varchar(30) NOT NULL,
	"bio" text,
	"foto_url" text,
	"telefone_whatsapp" varchar(20),
	"stripe_account_id" varchar(255),
	"stripe_account_ativo" boolean DEFAULT false NOT NULL,
	"plano" "plano" DEFAULT 'free' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "professionals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"preco" numeric(10, 2) NOT NULL,
	"duracao_minutos" integer DEFAULT 30 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"plano" "plano" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_fim_em" timestamp,
	"periodo_inicio_em" timestamp,
	"periodo_fim_em" timestamp,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_professional_id_unique" UNIQUE("professional_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_professional_idx" ON "appointments" USING btree ("professional_id","inicio");--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "avail_blocks_professional_idx" ON "availability_blocks" USING btree ("professional_id","inicio");--> statement-breakpoint
CREATE INDEX "avail_rules_professional_idx" ON "availability_rules" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "patients_email_idx" ON "patients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "payments_professional_idx" ON "payments" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professionals_slug_idx" ON "professionals" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_professional_idx" ON "services" USING btree ("professional_id");