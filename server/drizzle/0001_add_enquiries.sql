CREATE TABLE `enquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`discipline` text DEFAULT '' NOT NULL,
	`budget` text DEFAULT '' NOT NULL,
	`timeline` text DEFAULT '' NOT NULL,
	`nda` integer DEFAULT 0 NOT NULL,
	`brief` text DEFAULT '' NOT NULL,
	`draft_reply` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
