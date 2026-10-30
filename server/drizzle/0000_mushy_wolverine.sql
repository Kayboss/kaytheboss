CREATE TABLE `journal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`reading_time` text DEFAULT '' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_slug_unique` ON `journal` (`slug`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `work` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`index` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`year` text DEFAULT '' NOT NULL,
	`discipline` text DEFAULT '' NOT NULL,
	`series` text DEFAULT '' NOT NULL,
	`size` text DEFAULT 'wide' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`client` text DEFAULT '' NOT NULL,
	`tldr` text DEFAULT '' NOT NULL,
	`challenge` text DEFAULT '' NOT NULL,
	`pull_quote` text DEFAULT '' NOT NULL,
	`quote_by` text DEFAULT '' NOT NULL,
	`next` text,
	`role` text DEFAULT '[]',
	`stack` text DEFAULT '[]',
	`approach` text DEFAULT '[]',
	`outcome` text DEFAULT '[]',
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_slug_unique` ON `work` (`slug`);--> statement-breakpoint
CREATE INDEX `work_sort_idx` ON `work` (`sort_order`);