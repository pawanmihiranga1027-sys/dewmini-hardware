CREATE TABLE `catalogCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(120) NOT NULL,
	`label` varchar(220) NOT NULL,
	`imageUrl` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalogCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalogCategories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`productName` varchar(180) NOT NULL,
	`quantity` int NOT NULL,
	`unitPriceLkr` int NOT NULL,
	`lineTotalLkr` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(32) NOT NULL,
	`customerName` varchar(180) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`area` varchar(120) NOT NULL,
	`address` text NOT NULL,
	`requestedDate` varchar(30),
	`deliveryTime` varchar(80),
	`specialNote` text,
	`fulfilment` enum('delivery','pickup') NOT NULL,
	`paymentMethod` enum('cod','bank','shop') NOT NULL,
	`subtotalLkr` int NOT NULL,
	`deliveryChargeLkr` int NOT NULL DEFAULT 0,
	`totalLkr` int NOT NULL,
	`status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`nameSi` varchar(220) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`priceLkr` int NOT NULL,
	`imageUrl` text NOT NULL,
	`badge` varchar(40),
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
