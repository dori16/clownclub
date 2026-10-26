CREATE TABLE cc_config (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE cc_sessions (hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE cc_limits (key TEXT PRIMARY KEY NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE cc_push (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, member_name TEXT NOT NULL, subscription TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
