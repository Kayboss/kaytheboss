CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enquiry_id` integer,
	`direction` text DEFAULT 'in' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`external_key` text NOT NULL,
	`message_id` text DEFAULT '' NOT NULL,
	`in_reply_to` text DEFAULT '' NOT NULL,
	`references` text DEFAULT '' NOT NULL,
	`from_name` text DEFAULT '' NOT NULL,
	`from_email` text DEFAULT '' NOT NULL,
	`to_emails` text DEFAULT '' NOT NULL,
	`cc_emails` text DEFAULT '' NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`snippet` text DEFAULT '' NOT NULL,
	`body_text` text DEFAULT '' NOT NULL,
	`sent_at` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_external_key_unique` ON `messages` (`external_key`);--> statement-breakpoint
CREATE INDEX `messages_enquiry_idx` ON `messages` (`enquiry_id`);--> statement-breakpoint
CREATE INDEX `messages_sent_idx` ON `messages` (`sent_at`);--> statement-breakpoint
CREATE INDEX `messages_message_id_idx` ON `messages` (`message_id`);