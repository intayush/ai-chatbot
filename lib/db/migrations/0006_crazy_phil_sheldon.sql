ALTER TABLE "Message" ADD COLUMN "promptTokens" numeric;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "completionTokens" numeric;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "totalTokens" numeric;