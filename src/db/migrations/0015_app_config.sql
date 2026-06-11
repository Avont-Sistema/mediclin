CREATE TABLE IF NOT EXISTS "app_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dominio" varchar(255),
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
