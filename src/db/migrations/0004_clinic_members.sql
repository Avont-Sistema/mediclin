-- Allow professionals to be managed by clinic without their own Clerk/user account
ALTER TABLE "professionals" ALTER COLUMN "user_id" DROP NOT NULL;

--> statement-breakpoint

-- Self-referential FK: clinic member points to the clinic owner's professional
ALTER TABLE "professionals"
  ADD COLUMN IF NOT EXISTS "parent_professional_id" uuid REFERENCES "professionals"("id") ON DELETE SET NULL;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "professionals_parent_idx" ON "professionals"("parent_professional_id");
