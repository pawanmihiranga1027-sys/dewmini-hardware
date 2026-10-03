CREATE TABLE `staffAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','manager','order_staff') NOT NULL DEFAULT 'order_staff',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffAccess_id` PRIMARY KEY(`id`),
	CONSTRAINT `staffAccess_email_unique` UNIQUE(`email`)
);
