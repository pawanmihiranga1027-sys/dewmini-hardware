CREATE TABLE `staffInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(96) NOT NULL,
	`role` enum('admin','manager','order_staff') NOT NULL DEFAULT 'order_staff',
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffInvites_token_unique` UNIQUE(`token`)
);
