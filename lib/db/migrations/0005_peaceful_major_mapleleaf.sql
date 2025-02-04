CREATE TABLE IF NOT EXISTS "unicorns" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" varchar(255) NOT NULL,
	"valuation" numeric(10, 2) NOT NULL,
	"date_joined" timestamp,
	"country" varchar(255) NOT NULL,
	"city" varchar(255) NOT NULL,
	"industry" varchar(255) NOT NULL,
	"select_investors" text NOT NULL,
	CONSTRAINT "unicorns_company_unique" UNIQUE("company")
);
